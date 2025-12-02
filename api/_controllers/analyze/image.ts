import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { userService } from '../../_services/userService.js';
import { usageService } from '../../_services/usageService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    let operationId = '';
    const ESTIMATED_COST = 3;

    try {
        const user = await validateRequest(req.headers);
        const { image, mimeType = 'image/jpeg', plan = 'FREE' } = req.body;

        if (!image) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Image data (base64) is required', 400);
        }

        // 1. Fetch User Profile to check Mode & Plan
        const userProfile = await userService.getUserProfile(user.uid);

        // 2. Enforce Restrictions
        if (userProfile.mode === 'external') {
            throw new AppError(ErrorCodes.FORBIDDEN, 'External Mode does not support Image Analysis. Please switch to Internal Mode.', 403);
        }
        if (userProfile.subscription?.plan === 'free') {
            throw new AppError(ErrorCodes.FORBIDDEN, 'Free Trial users cannot use Image Analysis. Please upgrade to a paid plan.', 403);
        }

        // 3. Rate Limit Check
        await checkRateLimit(user.uid, plan);

        // 4. Start Usage Operation (Reserve Credits)
        const op = await usageService.startUsageOperation(
            user.uid,
            'ANALYZE', // Action Type
            ESTIMATED_COST,
            { mimeType } // Payload Meta
        );
        operationId = op.operationId;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Gemini API Key is missing on server', 500);
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Remove data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const prompt = `
      Analyze this ad image for compliance risks (NSFW, misleading claims, prohibited items).
      Return JSON format:
      {
        "score": number (0-100),
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "issues": string[],
        "suggestions": string[]
      }
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            },
        ]);

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

        // 5. Finalize Usage Operation (Success)
        await usageService.finalizeUsageOperation(
            operationId,
            'SUCCEEDED',
            ESTIMATED_COST, // Actual Cost
            null // Result Ref (optional)
        );

        return res.status(200).json(successResponse(analysisData));

    } catch (error: any) {
        console.error('Image Analysis Error:', error);

        // Finalize Usage Operation (Failed) - Refund
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
