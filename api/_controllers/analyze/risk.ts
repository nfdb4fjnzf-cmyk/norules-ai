import { validateRequest } from '../../_middleware/auth';
import { checkRateLimit } from '../../_middleware/rateLimit';
import { successResponse, errorResponse } from '../../_utils/responseFormatter';
import { AppError, ErrorCodes } from '../../_utils/errorHandler';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsage } from '../../_utils/historyLogger';
import { logUsage as logUsageStats } from '../../_services/usageService';
import { userService } from '../../_services/userService';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }


    let user: any = null;
    let privateMode = false;
    const pointsToDeduct = 2; // Risk Analyzer Cost (Ch.121.3)

    try {
        // 1. Auth & Validation
        user = await validateRequest(req.headers);
        const { content, platform = 'general', plan = 'FREE' } = req.body;

        // Check Private Mode Header
        const privateModeHeader = req.headers['x-private-mode'];
        privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        if (!content) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Content is required', 400);
        }

        // 2. Fetch User Profile & Enforce Restrictions
        const userProfile = await userService.getUserProfile(user.uid);

        // External Mode cannot use Risk Analyzer (Ch.3 Mode C)
        if (userProfile.mode === 'external') {
            throw new AppError(ErrorCodes.FORBIDDEN, 'External Mode does not support Risk Analysis. Please switch to Internal Mode.', 403);
        }

        // 3. Rate Limit
        await checkRateLimit(user.uid, plan);

        // 4. Point Deduction
        const hasSufficientCredits = await userService.deductCredits(user.uid, pointsToDeduct);
        if (!hasSufficientCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, 'Insufficient credits', 402);
        }

        // 5. Call Gemini with Specialized Risk Prompt
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // Use Pro for deep analysis
        const prompt = `
      Perform a deep compliance risk analysis for the following content, specifically focusing on ${platform} policies (e.g., TikTok Community Guidelines, Meta Advertising Standards).
      
      Content: "${content}"
      
      Identify subtle violations, prohibited categories, and potential shadowban triggers.
      
      Return JSON format:
      {
        "score": number (0-100, 100 is fully compliant),
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "issues": string[],
        "suggestions": string[],
        "details": string (detailed explanation of risks)
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textOutput = response.text();

        // Parse JSON
        const jsonMatch = textOutput.match(/```json\n([\s\S]*?)\n```/) || textOutput.match(/{[\s\S]*}/);
        let analysisData = {};

        if (jsonMatch) {
            try {
                analysisData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } catch (e) {
                console.error('Failed to parse Gemini JSON', e);
                analysisData = { raw: textOutput };
            }
        } else {
            analysisData = { raw: textOutput };
        }

        // 6. Log History
        await logUsage({
            context: { userId: user.uid, email: user.email },
            mode: 'INTERNAL',
            apiPath: '/api/analyze/risk',
            prompt: `[${platform}] ${content.substring(0, 100)}...`,
            resultSummary: JSON.stringify(analysisData),
            pointsDeducted: pointsToDeduct,
            status: 'SUCCESS',
            privateMode: privateMode
        });

        // 7. Log Usage Stats
        await logUsageStats(user.uid, 'risk_analysis', pointsToDeduct);

        // 8. Return Response
        return res.status(200).json(successResponse(analysisData, 'OK', {
            pointsDeducted: pointsToDeduct,
            quotaRemaining: 0
        }));

    } catch (error: any) {
        console.error('Risk Analysis Error:', error);

        if (user) {
            await logUsage({
                context: { userId: user.uid, email: user.email },
                mode: 'INTERNAL',
                apiPath: '/api/analyze/risk',
                prompt: 'Error',
                resultSummary: error.message,
                pointsDeducted: 0,
                errorCode: error.code || 500,
                status: 'FAILURE',
                privateMode: privateMode
            });
        }

        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
