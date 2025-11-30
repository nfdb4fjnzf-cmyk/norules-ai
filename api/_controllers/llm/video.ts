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

        // Mock Video Generation
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate delay

        const mockRiskScore = targetRiskScore || 20;

        // V3: Log Transaction
        await usageService.logTransaction({
            userId: user.uid,
            actionType: 'video',
            inputText: prompt,
            outputType: 'video',
            estimatedCost,
            actualCost: estimatedCost, // Fixed cost
            timestamp: new Date().toISOString(),
            status: 'success'
        });

        // Legacy Log
        await logUsage({
            context: { userId: user.uid, email: user.email },
            mode: 'INTERNAL',
            apiPath: '/api/llm/video',
            prompt: `${prompt} [${aspectRatio}] [${policyInstruction}]`,
            resultSummary: "Generated Video (Mock)",
            pointsDeducted: estimatedCost,
            status: 'SUCCESS',
            privateMode: privateMode
        });

        return res.status(200).json(successResponse({
            data: {
                text: `Video generated successfully (Mock). Aspect Ratio: ${aspectRatio}. Policy: ${policyInstruction}`,
                mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                mediaType: 'video'
            },
            riskScore: mockRiskScore,
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
