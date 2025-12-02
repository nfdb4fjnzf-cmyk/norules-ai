import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { userService } from '../../_services/userService.js';
import { logUsage } from '../../_utils/historyLogger.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { usageService } from '../../_services/usageService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    let user: any = null;
    let privateMode = false;

    // V3: Fixed Cost for Video
    const estimatedCost = 60;

    try {
        user = await validateRequest(req.headers);
        const { prompt, targetRiskScore, aspectRatio = '16:9', plan = 'FREE' } = req.body;

        const privateModeHeader = req.headers['x-private-mode'];
        privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        await checkRateLimit(user.uid, plan);

        // V3: Deduct Fixed Cost
        const hasSufficientCredits = await userService.deductCredits(user.uid, estimatedCost);
        if (!hasSufficientCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, `Insufficient credits. Required: ${estimatedCost}`, 402);
        }

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

        // V3: Log Transaction (Pending)
        await usageService.logTransaction({
            userId: user.uid,
            actionType: 'video',
            inputText: prompt,
            outputType: 'video_pending',
            estimatedCost,
            actualCost: estimatedCost,
            timestamp: new Date().toISOString(),
            status: 'success', // Successfully initiated
            modelUsed: 'luma-dream-machine'
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
                pointsDeducted: estimatedCost,
                quotaUsage: { used: estimatedCost, limit: 100 }
            }
        }));

    } catch (error: any) {
        console.error('LLM Video Error:', error);

        // REFUND ON FAILURE
        if (user) {
            try {
                if (error.statusCode !== 402) {
                    await userService.addCredits(user.uid, estimatedCost);
                    console.log(`Refunded ${estimatedCost} credits to ${user.uid} due to failure`);
                }
            } catch (refundError) {
                console.error('Failed to refund credits:', refundError);
            }

            // Log Failure
            await usageService.logTransaction({
                userId: user.uid,
                actionType: 'video',
                inputText: req.body?.prompt || 'Unknown',
                estimatedCost,
                actualCost: 0,
                timestamp: new Date().toISOString(),
                status: 'failed',
                errorMessage: error.message
            });
        }

        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
