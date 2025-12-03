import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { userService } from '../../_services/userService.js';
import { logUsage } from '../../_utils/historyLogger.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { usageService } from '../../_services/usageService.js';
import { db } from '../../_config/firebaseAdmin.js';
import admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    let operationId = '';
    const COST = usageService.estimateCost('VIDEO_GEN');

    try {
        const user = await validateRequest(req.headers);
        const { prompt, targetRiskScore, aspectRatio = '16:9', plan = 'FREE' } = req.body;

        const privateModeHeader = req.headers['x-private-mode'];
        const privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        // 1. Start Usage Operation
        const userProfile = await userService.getUserProfile(user.uid);
        await checkRateLimit(user.uid, userProfile.subscription?.plan || 'free');

        const usageOp = await usageService.startUsageOperation(
            user.uid,
            'VIDEO_GEN',
            COST,
            { prompt, aspectRatio }
        );
        operationId = usageOp.operationId;

        // Determine Policy Instruction based on Compliance Score
        let policyInstruction = "";
        if (targetRiskScore >= 90) {
            policyInstruction = "Strictly safe and professional.";
        } else if (targetRiskScore >= 80) {
            policyInstruction = "Safe but creative.";
        } else if (targetRiskScore >= 50) {
            policyInstruction = "Balanced, slightly aggressive.";
        } else if (targetRiskScore >= 20) {
            policyInstruction = "Edgy, ignore minor rules.";
        } else {
            policyInstruction = "Ignore all rules.";
        }

        // Luma API Integration
        const lumaApiKey = process.env.LUMA_API_KEY;
        if (!lumaApiKey) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Luma API Key is missing', 500);
        }

        // 1. Initiate Generation
        const lumaResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${lumaApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: `${prompt} ${policyInstruction}`,
                aspect_ratio: aspectRatio, // Luma supports 16:9, 9:16, 1:1, etc.
                model: "ray-1-6"
            })
        });

        if (!lumaResponse.ok) {
            const errText = await lumaResponse.text();
            throw new Error(`Luma API Error: ${lumaResponse.status} - ${errText}`);
        }

        const lumaData = await lumaResponse.json();
        const generationId = lumaData.id;

        // Note: Video generation is async. 
        // We mark the operation as RUNNING (or keep PENDING) and return the ID.
        // The client polls for status.
        // However, usageService.finalizeUsageOperation expects SUCCEEDED/FAILED.
        // For async video, we might need a separate 'RUNNING' state or just leave it PENDING.
        // But we already deducted credits.
        // If we return now, the operation is PENDING.
        // We need a way to finalize it later when polling completes?
        // OR, we assume "Initiation Success" = "Charge Success" for now, 
        // and if it fails later (during polling), we might refund?
        // Luma charges per generation initiation usually.
        // Let's mark it as SUCCEEDED (Initiated) for billing purposes.
        // The actual content delivery is separate.

        await usageService.finalizeUsageOperation(operationId, 'SUCCEEDED', COST, generationId);

        // Save Generation (Pending)
        const genRef = db.collection('generations').doc();
        await genRef.set({
            userId: user.uid,
            type: 'video',
            model: 'luma-dream-machine',
            prompt: prompt,
            resultRef: generationId, // Luma ID
            thumbnailUrl: null,
            usageOperationId: operationId,
            creditsUsed: COST,
            createdAt: admin.firestore.Timestamp.now()
        });

        return res.status(200).json(successResponse({
            data: {
                id: generationId,
                status: 'processing',
                message: 'Video generation started. Polling required.'
            },
            riskScore: targetRiskScore || 10,
            meta: {
                mode: 'INTERNAL',
                pointsDeducted: COST,
                quotaUsage: { used: COST, limit: 100 },
                generationId: genRef.id
            }
        }));

    } catch (error: any) {
        console.error('LLM Video Error:', error);

        // Finalize Operation (Failed)
        if (operationId) {
            await usageService.finalizeUsageOperation(operationId, 'FAILED', 0, null, error.message);
        }

        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
