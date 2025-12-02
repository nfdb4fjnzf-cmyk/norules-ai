import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { usageService } from '../../_services/usageService.js';
import { userService } from '../../_services/userService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }


    let operationId = '';
    const ESTIMATED_COST = 2; // Risk Analyzer Cost

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

        // 4. Start Usage Operation (Reserve Credits)
        const op = await usageService.startUsageOperation(
            user.uid,
            'ANALYZE', // Action Type
            ESTIMATED_COST,
            { platform, contentSummary: content.substring(0, 50) } // Payload Meta
        );
        operationId = op.operationId;

        // 5. Call Gemini with Specialized Risk Prompt
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Use Flash for better availability
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

        // 6. Log History (Legacy) - Optional, can be removed if usageService handles it
        // Keeping it for now if needed, but usageService is the source of truth.
        // Actually, let's remove legacy logUsage to avoid double counting or confusion.
        // But the code imported logUsage from historyLogger.js too.
        // Let's keep historyLogger if it does something specific for "History" page.
        // But usageService also logs to usage_operations.
        // The History page likely reads from usage_operations now (based on my previous work).
        // So I can remove legacy logging.

        // 7. Finalize Usage Operation (Success)
        await usageService.finalizeUsageOperation(
            operationId,
            'SUCCEEDED',
            ESTIMATED_COST,
            null // Result Ref
        );

        // 8. Return Response
        return res.status(200).json(successResponse(analysisData, 'OK', {
            pointsDeducted: ESTIMATED_COST,
            quotaRemaining: 0
        }));

    } catch (error: any) {
        console.error('Risk Analysis Error:', error);

        if (operationId) {
            await usageService.finalizeUsageOperation(
                operationId,
                'FAILED',
                0,
                null,
                error.message
            );
        }

        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
