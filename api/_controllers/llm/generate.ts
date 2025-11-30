import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { logUsage } from '../../_utils/historyLogger.js';
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

        if (modelId.startsWith('gpt')) {
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

        } else {
            // Gemini Logic
            const apiKeyHeader = Array.isArray(customGeminiKey) ? customGeminiKey[0] : customGeminiKey;
            const apiKey = apiKeyHeader || process.env.GEMINI_API_KEY;

            if (!apiKey) {
                throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Gemini API Key is missing on server', 500);
            }

            const genAI = new GoogleGenerativeAI(apiKey);

            // Map frontend model IDs to Gemini models (Use standard 1.5 models)
            // Frontend now sends 'gemini-1.5-pro' or 'gemini-1.5-flash'
            let geminiModelName = 'gemini-1.5-flash-latest';
            if (modelId === 'gemini-1.5-pro' || modelId.includes('pro')) {
                geminiModelName = 'gemini-1.5-pro-latest';
            }

            const model = genAI.getGenerativeModel({ model: geminiModelName });

            const result = await model.generateContent([
                systemInstruction,
                prompt
            ]);

            const response = await result.response;
            const textOutput = response.text();

            const jsonMatch = textOutput.match(/```json\n([\s\S]*?)\n```/) || textOutput.match(/{[\s\S]*}/);

            if (jsonMatch) {
                try {
                    data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } catch (e) {
                    data = { text: textOutput, riskScore: 50 };
                }
            } else {
                data = { text: textOutput, riskScore: 50 };
            }
        }

        await logUsage({
            context: { userId: user.uid, email: user.email },
            mode: 'INTERNAL',
            apiPath: '/api/llm/generate',
            prompt: prompt,
            resultSummary: JSON.stringify(data),
            pointsDeducted: pointsToDeduct,
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
