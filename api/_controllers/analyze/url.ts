import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { userService } from '../../_services/userService.js';
import { logUsage } from '../../_utils/historyLogger.js';
import { logUsage as logUsageStats } from '../../_services/usageService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    let user: any = null;
    let privateMode = false;
    const pointsToDeduct = 3; // URL Analysis Cost (Ch.121.4)

    try {
        user = await validateRequest(req.headers);
        const { url, plan = 'FREE' } = req.body;

        // Check Private Mode Header
        const privateModeHeader = req.headers['x-private-mode'];
        privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        if (!url) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'URL is required', 400);
        }

        // 1. Fetch User Profile & Enforce Restrictions
        const userProfile = await userService.getUserProfile(user.uid);

        // External Mode cannot use URL Analyzer (Ch.3 Mode C - Only Chat allowed)
        if (userProfile.mode === 'external') {
            throw new AppError(ErrorCodes.FORBIDDEN, 'External Mode does not support URL Analysis. Please switch to Internal Mode.', 403);
        }

        // 2. Rate Limit
        await checkRateLimit(user.uid, plan);

        // 3. Point Deduction
        const hasSufficientCredits = await userService.deductCredits(user.uid, pointsToDeduct);
        if (!hasSufficientCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, 'Insufficient credits', 402);
        }

        // Fetch URL content (Simple fetch for MVP)
        let pageContent = '';
        try {
            const pageRes = await fetch(url);
            pageContent = await pageRes.text();
            if (pageContent.length > 100000) {
                pageContent = pageContent.substring(0, 100000);
            }
        } catch (e) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Failed to fetch URL content', 400);
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const prompt = `
      Analyze the following webpage content (HTML source) for landing page compliance.
      Check for:
      1. Misleading claims
      2. Fake countdown timers
      3. Hidden costs
      4. Disclaimers presence
      
      URL: ${url}
      Content Snippet:
      ${pageContent}
      
      Return JSON format:
      {
        "score": number,
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "issues": string[],
        "suggestions": string[]
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textOutput = response.text();

        const jsonMatch = textOutput.match(/```json\n([\s\S]*?)\n```/) || textOutput.match(/{[\s\S]*}/);
        let analysisData = {};

        if (jsonMatch) {
            try {
                analysisData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } catch (e) {
                analysisData = { raw: textOutput };
            }
        } else {
            analysisData = { raw: textOutput };
        }

        // 4. Log Usage
        await logUsage({
            context: { userId: user.uid, email: user.email },
            mode: 'INTERNAL',
            apiPath: '/api/analyze/url',
            prompt: url,
            resultSummary: JSON.stringify(analysisData),
            pointsDeducted: pointsToDeduct,
            status: 'SUCCESS',
            privateMode: privateMode
        });

        // 5. Log Usage Stats
        await logUsageStats(user.uid, 'url_analysis', pointsToDeduct);

        return res.status(200).json(successResponse(analysisData, 'OK', {
            pointsDeducted: pointsToDeduct,
            quotaRemaining: 0
        }));

    } catch (error: any) {
        console.error('URL Analysis Error:', error);

        if (user) {
            await logUsage({
                context: { userId: user.uid, email: user.email },
                mode: 'INTERNAL',
                apiPath: '/api/analyze/url',
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
