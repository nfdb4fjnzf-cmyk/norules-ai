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
import { db } from '../../_config/firebaseAdmin.js';
import admin from 'firebase-admin';

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

    let operationId = '';
    let estimatedCost = 0;

    try {
        const user = await validateRequest(req.headers);
        const { prompt, model: modelId, targetRiskScore, plan = 'FREE' } = req.body;

        // Check for BYOK Headers
        const customGeminiKey = req.headers['x-gemini-api-key'];
        const customOpenAIKey = req.headers['x-openai-api-key'];

        const privateModeHeader = req.headers['x-private-mode'];
        const privateMode = privateModeHeader === 'true' || (Array.isArray(privateModeHeader) && privateModeHeader[0] === 'true');

        if (!prompt) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Prompt is required', 400);
        }

        // Restrict BYOK (Bring Your Own Key) to Enterprise Plan
        if (customGeminiKey || customOpenAIKey) {
            if (plan !== 'enterprise') {
                throw new AppError(ErrorCodes.FORBIDDEN, 'Using custom API keys is only available for Enterprise plan users.', 403);
            }
        }

        // 1. Estimate Cost & Start Operation
        estimatedCost = usageService.estimateCost('LLM_CHAT', prompt.length, modelId);

        const userProfile = await userService.getUserProfile(user.uid);
        await checkRateLimit(user.uid, userProfile.subscription?.plan || 'free');

        const usageOp = await usageService.startUsageOperation(
            user.uid,
            'LLM_CHAT',
            estimatedCost,
            { prompt, model: modelId, targetRiskScore }
        );
        operationId = usageOp.operationId;

        let data: any = {};
        // Determine Policy Instruction based on Compliance Score (targetRiskScore)
        let policyInstruction = "";
        if (targetRiskScore >= 90) policyInstruction = "Strictly compliant. Safe & professional.";
        else if (targetRiskScore >= 80) policyInstruction = "High compliance. Avoid clear violations.";
        else if (targetRiskScore >= 50) policyInstruction = "Balanced. Prioritize conversion.";
        else if (targetRiskScore >= 20) policyInstruction = "Loose compliance. Focus on impact.";
        else policyInstruction = "Ignore rules. Maximize shock value.";

        const systemInstruction = `Role: Expert Copywriter.
Policy: ${policyInstruction} (Target Score: ${targetRiskScore}/100).
Task: Generate high-converting ad copy.
Output: JSON { "text": "content...", "riskScore": 0-100 }.
Constraint: No markdown in JSON values. Clean text only.`;

        if (modelId.startsWith('gpt') || modelId.startsWith('o1')) {
            // OpenAI Logic
            const apiKey = Array.isArray(customOpenAIKey) ? customOpenAIKey[0] : customOpenAIKey;
            const openai = new OpenAI({
                apiKey: apiKey || process.env.OPENAI_API_KEY,
            });

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

            // Calculate Actual Cost
            const usage = completion.usage;
            const tokensIn = usage?.prompt_tokens || Math.ceil(prompt.length / 4);
            const tokensOut = usage?.completion_tokens || Math.ceil(content.length / 4);
            const actualCost = usageService.calculateCost('LLM_CHAT', modelId, tokensIn, tokensOut);

            // Finalize Operation
            await usageService.finalizeUsageOperation(operationId, 'SUCCEEDED', actualCost, null);

            return res.status(200).json(successResponse({
                data: data,
                riskScore: (data as any).riskScore,
                meta: {
                    mode: 'INTERNAL',
                    quotaUsage: { used: actualCost, limit: 100 }
                }
            }));

        } else {
            // --- GEMINI LOGIC (With Fallback to DeepSeek -> Grok -> OpenAI) ---
            const apiKeyHeader = Array.isArray(customGeminiKey) ? customGeminiKey[0] : customGeminiKey;
            const geminiKey = apiKeyHeader || process.env.GEMINI_API_KEY;

            let success = false;
            let finalData: any = {};
            let actualModelUsed = modelId;
            let finalActualCost = 0;
            let finalTokensIn = 0;
            let finalTokensOut = 0;

            // 1. Try Gemini
            if (geminiKey) {
                try {
                    const genAI = new GoogleGenerativeAI(geminiKey);

                    // Map frontend model IDs to Gemini models
                    let geminiModelName = modelId;
                    if (!customGeminiKey) {
                        if (modelId === 'gemini-2.5-pro' || modelId.includes('pro')) {
                            geminiModelName = 'gemini-1.5-pro'; // Map to valid model
                        } else {
                            geminiModelName = 'gemini-1.5-flash';
                        }
                    }

                    const model = genAI.getGenerativeModel({ model: geminiModelName });
                    const result = await model.generateContent([systemInstruction, prompt]);
                    const response = await result.response;
                    let text = response.text();
                    text = text.replace(/```json\n?|\n?```/g, '').trim();

                    try {
                        finalData = JSON.parse(text);
                    } catch (e) {
                        finalData = { text: text, riskScore: 50 };
                    }
                    finalData.text = finalData.text || text;

                    const usage = response.usageMetadata;
                    finalTokensIn = usage?.promptTokenCount || Math.ceil(prompt.length / 4);
                    finalTokensOut = usage?.candidatesTokenCount || Math.ceil(text.length / 4);
                    finalActualCost = usageService.calculateCost('LLM_CHAT', geminiModelName, finalTokensIn, finalTokensOut);
                    actualModelUsed = geminiModelName;
                    success = true;

                } catch (e: any) {
                    console.error(`Gemini Attempt Failed: ${e.message}`);
                }
            }

            // Helper for OpenAI-compatible Fallbacks
            const tryFallback = async (providerName: string, apiKey: string | undefined, baseURL: string, fallbackModel: string) => {
                if (success) return;
                if (!apiKey) return;

                console.log(`Attempting fallback to ${providerName} (${fallbackModel})...`);
                try {
                    const client = new OpenAI({ apiKey, baseURL });
                    const completion = await client.chat.completions.create({
                        messages: [
                            { role: "system", content: systemInstruction },
                            { role: "user", content: prompt }
                        ],
                        model: fallbackModel,
                        response_format: { type: "json_object" },
                    });

                    const content = completion.choices[0].message.content || '{}';
                    try {
                        finalData = JSON.parse(content);
                    } catch (e) {
                        finalData = { text: content, riskScore: 50 };
                    }
                    finalData.text = finalData.text || content;

                    const usage = completion.usage;
                    finalTokensIn = usage?.prompt_tokens || Math.ceil(prompt.length / 4);
                    finalTokensOut = usage?.completion_tokens || Math.ceil(content.length / 4);

                    finalActualCost = usageService.calculateCost('LLM_CHAT', 'gpt-4o-mini', finalTokensIn, finalTokensOut);
                    actualModelUsed = `${providerName}:${fallbackModel}`;
                    success = true;

                } catch (e: any) {
                    console.error(`${providerName} Fallback Failed: ${e.message}`);
                }
            };

            // 2. DeepSeek Fallback
            await tryFallback('DeepSeek', process.env.DEEPSEEK_API_KEY, 'https://api.deepseek.com', 'deepseek-chat');

            // 3. Grok Fallback
            await tryFallback('Grok', process.env.GROK_API_KEY || process.env.XAI_API_KEY, 'https://api.x.ai/v1', 'grok-beta');

            // 4. OpenAI Fallback
            await tryFallback('OpenAI', process.env.OPENAI_API_KEY, 'https://api.openai.com/v1', 'gpt-4o-mini');

            if (!success) {
                throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'All AI models failed to generate content.', 500);
            }

            // Finalize Operation
            await usageService.finalizeUsageOperation(operationId, 'SUCCEEDED', finalActualCost, null);

            // Save Generation
            const genRef = db.collection('generations').doc();
            await genRef.set({
                userId: user.uid,
                type: 'text',
                model: actualModelUsed,
                prompt: prompt,
                textContent: finalData.text || JSON.stringify(finalData),
                usageOperationId: operationId,
                creditsUsed: finalActualCost,
                createdAt: admin.firestore.Timestamp.now()
            });

            return res.status(200).json(successResponse({
                data: { text: finalData.text },
                riskScore: 0,
                meta: {
                    mode: 'INTERNAL',
                    model: actualModelUsed,
                    pointsDeducted: finalActualCost,
                    quotaRemaining: 0,
                    usage: { tokensIn: finalTokensIn, tokensOut: finalTokensOut, total: finalTokensIn + finalTokensOut },
                    generationId: genRef.id
                }
            }));
        }

    } catch (error: any) {
        console.error('LLM Generate Error:', error);

        if (operationId) {
            await usageService.finalizeUsageOperation(operationId, 'FAILED', 0, null, error.message);
        }

        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
