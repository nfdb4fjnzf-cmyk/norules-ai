import { validateRequest } from '../../_middleware/auth';
import { checkRateLimit } from '../../_middleware/rateLimit';
import { successResponse, errorResponse } from '../../_utils/responseFormatter';
import { AppError, ErrorCodes } from '../../_utils/errorHandler';
import { userService } from '../../_services/userService';
import { logUsage } from '../../_utils/historyLogger';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { prompt, targetRiskScore, aspectRatio = '16:9', plan = 'FREE' } = req.body;

        const privateModeHeader = req.headers['x-private-mode'];
        const privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        await checkRateLimit(user.uid, plan);

        const pointsToDeduct = 10;
        const hasSufficientCredits = await userService.deductCredits(user.uid, pointsToDeduct);
        if (!hasSufficientCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, 'Insufficient credits', 402);
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

        await logUsage({
            context: { userId: user.uid, email: user.email },
            mode: 'INTERNAL',
            apiPath: '/api/llm/video',
            prompt: `${prompt} [${aspectRatio}] [${policyInstruction}]`,
            resultSummary: "Generated Video (Mock)",
            pointsDeducted: pointsToDeduct,
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
                quotaUsage: { used: pointsToDeduct, limit: 100 }
            }
        }));

    } catch (error: any) {
        console.error('LLM Video Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
