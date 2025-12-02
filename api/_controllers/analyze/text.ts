import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsage } from '../../_utils/historyLogger.js';
import { logUsage as logUsageStats } from '../../_services/usageService.js';
import { userService } from '../../_services/userService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

import { usageService } from '../../_services/usageService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    let user: any = null;
    let privateMode = false;

    try {
        // 1. Auth & Validation
        user = await validateRequest(req.headers);
        const { text, plan = 'FREE' } = req.body;

        // Check Private Mode Header
        const privateModeHeader = req.headers['x-private-mode'];
        privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        if (!text) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Text is required', 400);
        }

        // 2. Fetch User Profile & Enforce Restrictions
        const userProfile = await userService.getUserProfile(user.uid);

        // External Mode cannot use Text Analyzer (Ch.3 Mode C - Only Chat allowed)
        if (userProfile.mode === 'external') {
            throw new AppError(ErrorCodes.FORBIDDEN, 'External Mode does not support Text Analysis. Please switch to Internal Mode.', 403);
        }

        // 3. Rate Limit
        await checkRateLimit(user.uid, plan);

        // V3: Estimate Cost
        const estimatedCost = usageService.estimateCost('analysis', text.length, 'gemini-1.5-flash');

        // V3: Deduct Estimated Cost
        const hasSufficientCredits = await userService.deductCredits(user.uid, estimatedCost);
        if (!hasSufficientCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, `Insufficient credits. Estimated: ${estimatedCost}`, 402);
        }

        // 5. Call Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Gemini API Key is missing on server', 500);
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = 'gemini-1.5-flash';
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = `
      Analyze the following ad copy for compliance risks based on FTC, GDPR, and major platform policies (Meta, Google, TikTok).
      
      Text: "${text}"
      
      Return JSON format:
      {
        "score": number (0-100, 100 is safe),
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "issues": string[],
        "suggestions": string[],
        "details": string
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textOutput = response.text();

        // Parse JSON from markdown code block if present
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

        // V3: Calculate Actual Cost based on Usage Metadata
        const usage = response.usageMetadata;
        const tokensIn = usage?.promptTokenCount || Math.ceil(prompt.length / 4);
        const tokensOut = usage?.candidatesTokenCount || Math.ceil(textOutput.length / 4);

        const actualCost = usageService.calculateCost('analysis', modelName, tokensIn, tokensOut);

        // V3: Adjust Balance
        const costDiff = actualCost - estimatedCost;
        if (costDiff > 0) {
            await userService.deductCredits(user.uid, costDiff);
        } else if (costDiff < 0) {
            await userService.addCredits(user.uid, Math.abs(costDiff));
        }

        // V3: Log Transaction
        await usageService.logTransaction({
            userId: user.uid,
            actionType: 'analysis',
            inputText: text,
            outputType: 'json',
            estimatedCost,
            actualCost,
            timestamp: new Date().toISOString(),
            modelUsed: modelName,
            tokensIn,
            tokensOut,
            status: 'success'
        });

        // Legacy Log
        await logUsage({
            context: { userId: user.uid, email: user.email },
            mode: 'INTERNAL',
            apiPath: '/api/analyze/text',
            prompt: text,
            resultSummary: JSON.stringify(analysisData),
            pointsDeducted: actualCost,
            status: 'SUCCESS',
            privateMode: privateMode
        });

        // 7. Log Usage Stats
        await logUsageStats(user.uid, 'text_analysis', actualCost);

        // 8. Return Response
        return res.status(200).json(successResponse(analysisData, 'OK', {
            pointsDeducted: actualCost,
            quotaRemaining: 0
        }));

    } catch (error: any) {
        console.error('Text Analysis Error:', error);

        // REFUND ESTIMATED CREDITS ON FAILURE
        const estimatedCostForRefund = usageService.estimateCost('analysis', req.body?.text?.length || 0);

        if (user) {
            try {
                if (error.statusCode !== 402) {
                    await userService.addCredits(user.uid, estimatedCostForRefund);
                }
            } catch (refundError) {
                console.error('Failed to refund credits:', refundError);
            }

            // Log Failure
            await usageService.logTransaction({
                userId: user.uid,
                actionType: 'analysis',
                inputText: req.body?.text || 'Unknown',
                estimatedCost: estimatedCostForRefund,
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
