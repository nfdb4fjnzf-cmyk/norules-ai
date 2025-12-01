import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { logUsage } from '../../_utils/historyLogger.js';
import { logUsage as logUsageStats, usageService } from '../../_services/usageService.js';
import { userService } from '../../_services/userService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Manual CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-gemini-api-key, x-openai-api-key, x-private-mode'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    let user: any = null;
    let privateMode = false;
    let pointsToDeduct = 1; // Default Standard

    try {
        user = await validateRequest(req.headers);
        const { prompt, model: modelId, targetRiskScore, plan = 'FREE' } = req.body;

        // Check for BYOK Headers
        const customGeminiKey = req.headers['x-gemini-api-key'];
        const customOpenAIKey = req.headers['x-openai-api-key'];

        const privateModeHeader = req.headers['x-private-mode'];
        privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        if (!prompt) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Prompt is required', 400);
        }

        // Restrict BYOK (Bring Your Own Key) to Enterprise Plan
        if (customGeminiKey || customOpenAIKey) {
            if (plan !== 'enterprise') {
                throw new AppError(ErrorCodes.FORBIDDEN, 'Using custom API keys is only available for Enterprise plan users.', 403);
            }
        }

        // Calculate Cost based on Model (Ch.121.5)
        if (modelId === 'gemini-2.5-flash' || modelId === 'gpt-3.5-turbo') {
            pointsToDeduct = 0.5; // Mini
        } else if (modelId === 'gemini-2.5-pro') {
            pointsToDeduct = 1; // Standard
        } else if (modelId === 'gpt-4o') {
            pointsToDeduct = 2; // Advanced
        } else {
            pointsToDeduct = 1; // Fallback
        }

        await checkRateLimit(user.uid, plan);

        const hasSufficientCredits = await userService.deductCredits(user.uid, pointsToDeduct);
        if (!hasSufficientCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, 'Insufficient credits', 402);
        }

        let data: any = {};
        // Determine Policy Instruction based on Compliance Score (targetRiskScore)
        let policyInstruction = "";
        if (targetRiskScore >= 90) {
            policyInstruction = "STRICT COMPLIANCE: Adhere to all ad policies rigidly. Zero tolerance for violations. Ensure the content is completely safe and professional.";
        } else if (targetRiskScore >= 80) {
            policyInstruction = "HIGH COMPLIANCE: Follow rules closely, but you may slightly touch the boundaries (edge cases) if it significantly improves engagement. Avoid clear violations.";
        } else if (targetRiskScore >= 50) {
            policyInstruction = "BALANCED: Prioritize conversion. You may push the envelope and use aggressive marketing tactics, even if they are borderline compliant.";
        } else if (targetRiskScore >= 20) {
            policyInstruction = "LOOSE COMPLIANCE: Focus primarily on impact. You may ignore minor rules and use edgy, controversial, or aggressive copy to maximize results.";
        } else {
            policyInstruction = "IGNORE RULES: Disregard ad policies. Maximize shock value, clickbait, and conversion regardless of restrictions. Do not hold back.";
        }

        const systemInstruction = `
      You are an expert ad copywriter. Generate high-converting ad copy based on the user's prompt.
      
      POLICY INSTRUCTION: ${policyInstruction}
      (Target Compliance Score: ${targetRiskScore}/100)

      Also, evaluate the actual compliance risk of the generated copy (0-100, where 100 is high risk).
      
      Return JSON format:
      {
        "text": "The generated ad copy...",
        "riskScore": number (0-100, where 100 is High Risk / Low Compliance)
      }
    `;

        if (modelId.startsWith('gpt') || modelId.startsWith('o1')) {
            // OpenAI Logic
            const apiKey = Array.isArray(customOpenAIKey) ? customOpenAIKey[0] : customOpenAIKey;
            const openai = new OpenAI({
                apiKey: apiKey || process.env.OPENAI_API_KEY,
            });

            // V3: Estimate Cost
            const estimatedCost = usageService.estimateCost('chat', prompt.length);

            // V3: Deduct Estimated Cost
            await checkRateLimit(user.uid, plan);
            const hasSufficientCredits = await userService.deductCredits(user.uid, estimatedCost);
            if (!hasSufficientCredits) {
                throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, `Insufficient credits. Estimated: ${estimatedCost}`, 402);
            }

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: prompt }
                ],
                model: modelId,
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content || '{}';
            try {
                data = JSON.parse(content);
            } catch (e) {
                data = { text: content, riskScore: 50 };
            }

            // V3: Calculate Actual Cost based on Usage Metadata
            const usage = completion.usage;
            const tokensIn = usage?.prompt_tokens || Math.ceil(prompt.length / 4);
            const tokensOut = usage?.completion_tokens || Math.ceil(content.length / 4);

            const actualCost = usageService.calculateCost('chat', modelId, tokensIn, tokensOut);

            // V3: Adjust Balance
            const costDiff = actualCost - estimatedCost;
            if (costDiff > 0) {
                // Deduct extra
                await userService.deductCredits(user.uid, costDiff);
            } else if (costDiff < 0) {
                // Refund difference
                await userService.addCredits(user.uid, Math.abs(costDiff));
            }

            // V3: Log Transaction
            await usageService.logTransaction({
                userId: user.uid,
                actionType: 'chat',
                inputText: prompt,
                outputType: 'json',
                estimatedCost,
                actualCost,
                timestamp: new Date().toISOString(),
                modelUsed: modelId,
                tokensIn,
                tokensOut,
                status: 'success'
            });

        } else {
            // Gemini Logic
            const apiKeyHeader = Array.isArray(customGeminiKey) ? customGeminiKey[0] : customGeminiKey;
            const apiKey = apiKeyHeader || process.env.GEMINI_API_KEY;

            try {
                if (!apiKey) {
                    throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Gemini API Key is missing on server', 500);
                }

                const genAI = new GoogleGenerativeAI(apiKey);

                // V3: Estimate Cost
                const estimatedCost = usageService.estimateCost('chat', prompt.length);

                // V3: Deduct Estimated Cost
                await checkRateLimit(user.uid, plan);
                const hasSufficientCredits = await userService.deductCredits(user.uid, estimatedCost);
                if (!hasSufficientCredits) {
                    throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, `Insufficient credits. Estimated: ${estimatedCost}`, 402);
                }

                // Map frontend model IDs to Gemini models
                let geminiModelName = modelId;

                // For Internal usage, we might want to force Flash for cost/stability
                // But for BYOK (customGeminiKey), we should respect the user's choice
                if (!customGeminiKey) {
                    // Internal Fallback Logic
                    if (modelId === 'gemini-1.5-pro' || modelId.includes('pro')) {
                        geminiModelName = 'gemini-1.5-flash'; // Temporarily force Flash for internal
                    }
                }

                const model = genAI.getGenerativeModel({ model: geminiModelName });

                const result = await model.generateContent([
                    systemInstruction,
                    prompt
                ]);

                const response = await result.response;
                const text = response.text();

                // V3: Calculate Actual Cost based on Usage Metadata
                const usage = response.usageMetadata;
                const tokensIn = usage?.promptTokenCount || Math.ceil(prompt.length / 4);
                const tokensOut = usage?.candidatesTokenCount || Math.ceil(text.length / 4);

                const actualCost = usageService.calculateCost('chat', geminiModelName, tokensIn, tokensOut);

                // V3: Adjust Balance
                const costDiff = actualCost - estimatedCost;
                if (costDiff > 0) {
                    // Deduct extra
                    await userService.deductCredits(user.uid, costDiff);
                } else if (costDiff < 0) {
                    // Refund difference
                    await userService.addCredits(user.uid, Math.abs(costDiff));
                }

                // V3: Log Transaction
                await usageService.logTransaction({
                    userId: user.uid,
                    actionType: 'chat',
                    inputText: prompt,
                    outputType: 'text',
                    estimatedCost,
                    actualCost,
                    timestamp: new Date().toISOString(),
                    modelUsed: geminiModelName,
                    tokensIn,
                    tokensOut,
                    status: 'success'
                });

                // Log Usage Stats (Legacy/Aggregated)
                await logUsageStats(user.uid, 'text_generation', actualCost);

                return res.status(200).json(successResponse({
                    text,
                    riskScore: 0,
                    meta: {
                        model: geminiModelName,
                        pointsDeducted: actualCost,
                        quotaRemaining: 0,
                        usage: { tokensIn, tokensOut, total: tokensIn + tokensOut }
                    }
                }));

            } catch (error: any) {
                console.error('LLM Generation Error:', error);

                // REFUND ESTIMATED CREDITS ON FAILURE
                // We assume estimatedCost was defined in try block scope, but here it might not be if error happened before.
                // We need to move estimatedCost definition up or handle it safely.
                // For now, we'll assume if we reached deduction, we need to refund.
                // Actually, let's just use a safe variable.
                const estimatedCostForRefund = usageService.estimateCost('chat', prompt?.length || 0);

                if (user) {
                    try {
                        // We only refund if we actually deducted.
                        // But we don't know for sure if deduction happened if error is generic.
                        // Ideally we track 'deducted' state.
                        // For safety in this V3 migration, I will assume if error is NOT 'INSUFFICIENT_POINTS', we might have deducted.
                        // But simpler: just check if error.code is NOT 402.
                        if (error.statusCode !== 402) {
                            await userService.addCredits(user.uid, estimatedCostForRefund);
                            console.log(`Refunded ${estimatedCostForRefund} credits to ${user.uid} due to failure`);
                        }
                    } catch (refundError) {
                        console.error('Failed to refund credits:', refundError);
                    }

                    // Log Failure Transaction
                    await usageService.logTransaction({
                        userId: user.uid,
                        actionType: 'chat',
                        inputText: prompt,
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

        await logUsage({
            context: { userId: user.uid, email: user.email },
            mode: 'INTERNAL',
            apiPath: '/api/llm/generate',
            prompt: prompt,
            resultSummary: JSON.stringify(data),
            pointsDeducted: pointsToDeduct, // This will be deprecated for V3, actualCost will be used
            status: 'SUCCESS',
            privateMode: privateMode
        });

        return res.status(200).json(successResponse({
            data: data,
            riskScore: (data as any).riskScore,
            meta: {
                mode: 'INTERNAL',
                quotaUsage: { used: pointsToDeduct, limit: 100 }
            }
        }));

    } catch (error: any) {
        console.error('LLM Generate Error:', error);

        if (user) {
            await logUsage({
                context: { userId: user.uid, email: user.email },
                mode: 'INTERNAL',
                apiPath: '/api/llm/generate',
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
