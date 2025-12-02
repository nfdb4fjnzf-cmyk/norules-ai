import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { userService } from '../../_services/userService.js';
import { db } from '../../_config/firebaseAdmin.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { image_base64, video_base64, copywriting, landing_page_url, platforms = ['meta', 'tiktok', 'google'] } = req.body;

        if (!image_base64 && !video_base64 && !copywriting && !landing_page_url) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'At least one input (image, video, copy, or url) is required', 400);
        }

        // 1. Check Credits (Fixed Cost: 5 credits for comprehensive analysis)
        const COST = 5;
        const userProfile = await userService.getUserProfile(user.uid);

        await checkRateLimit(user.uid, userProfile.subscription?.plan || 'free');
        const hasCredits = await userService.deductCredits(user.uid, COST);
        if (!hasCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, `Insufficient credits. Required: ${COST}`, 402);
        }

        // Fixed System Prompt
        const systemPrompt = `
你是一個專業數位廣告審核 AI，請根據 Meta、TikTok、Google 最新廣告政策分析素材。

請對以下內容進行審核：
- 圖片內容摘要
- 影片內容摘要
- 文案內容摘要
- 登陸頁內容摘要

請回傳固定三份報告：Meta、TikTok、Google。

每个平台請依以下 11 項分類檢查違規：
1. 賭博、博彩、金融投資風險
2. 成人、性暗示、低俗表述
3. 危險行為
4. 醫療、醫美、療程
5. 金錢承諾、收入保證
6. 侵權（肖像、LOGO、圖片）
7. 誤導性內容、未經授權宣稱
8. 不允許的引導用語
9. 圖片政策限制
10. 影片政策限制
11. 文案政策限制

請嚴格遵守以下 JSON 輸出格式（不要包含 markdown code block）：
{
  "image_summary": "...",
  "video_summary": "...",
  "copywriting_summary": "...",
  "landing_page_summary": "...",
  "reports": {
    "meta": {
      "platform": "meta",
      "risk_level": "low/medium/high",
      "violation_items": ["違規項目1", "違規項目2"],
      "details": "詳細說明...",
      "recommendation": "修改建議..."
    },
    "tiktok": {
      "platform": "tiktok",
      "risk_level": "low/medium/high",
      "violation_items": [],
      "details": "...",
      "recommendation": "..."
    },
    "google": {
      "platform": "google",
      "risk_level": "low/medium/high",
      "violation_items": [],
      "details": "...",
      "recommendation": "..."
    }
  }
}
`;

        // --- MULTI-PROVIDER STRATEGY ---
        // Priority: Gemini -> DeepSeek -> Grok -> OpenAI

        let analysisResultText = '';
        let successProvider = '';
        let errorLog: string[] = [];

        // 1. GEMINI (Google)
        // Native support for Video & Image. Best for initial attempt.
        if (process.env.GEMINI_API_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const parts: any[] = [systemPrompt];

                if (copywriting) parts.push(`\nCopywriting: ${copywriting}`);
                if (landing_page_url) parts.push(`\nLanding Page URL: ${landing_page_url}`);

                if (image_base64) {
                    const match = image_base64.match(/^data:(image\/\w+);base64,/);
                    const mimeType = match ? match[1] : "image/jpeg";
                    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
                    parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
                }

                if (video_base64) {
                    const match = video_base64.match(/^data:(video\/\w+);base64,/);
                    const mimeType = match ? match[1] : "video/mp4";
                    const base64Data = video_base64.replace(/^data:video\/\w+;base64,/, "");
                    parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
                }

                const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-1.5-pro-001', 'gemini-pro'];

                for (const modelName of modelsToTry) {
                    try {
                        console.log(`Attempting analysis with Gemini model: ${modelName}`);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent(parts);
                        const response = await result.response;
                        analysisResultText = response.text();
                        successProvider = `gemini:${modelName}`;
                        break; // Success!
                    } catch (e: any) {
                        console.error(`Gemini (${modelName}) failed:`, e.message);
                        errorLog.push(`Gemini(${modelName}): ${e.message}`);
                    }
                }
            } catch (e: any) {
                errorLog.push(`Gemini Init Failed: ${e.message}`);
            }
        } else {
            errorLog.push("Gemini Skipped (No Key)");
        }

        // Helper for OpenAI-compatible providers
        const tryOpenAICompatible = async (providerName: string, apiKey: string | undefined, baseURL: string, model: string) => {
            if (successProvider) return; // Already succeeded
            if (!apiKey) {
                errorLog.push(`${providerName} Skipped (No Key)`);
                return;
            }

            // Skip if only video (OpenAI-compatible APIs usually don't support video upload directly)
            const hasNonVideoContent = !!image_base64 || !!copywriting || !!landing_page_url;
            if (!hasNonVideoContent && video_base64) {
                errorLog.push(`${providerName} Skipped (Video Only - Not Supported)`);
                return;
            }

            console.log(`Attempting analysis with ${providerName} (${model})...`);
            try {
                const client = new OpenAI({ apiKey, baseURL });

                const messages: any[] = [{ role: "system", content: systemPrompt }];
                const userContent: any[] = [];

                if (copywriting) userContent.push({ type: "text", text: `Copywriting: ${copywriting}` });
                if (landing_page_url) userContent.push({ type: "text", text: `Landing Page URL: ${landing_page_url}` });

                if (image_base64) {
                    // Note: DeepSeek/Grok vision support varies. If they fail on image, catch block handles it.
                    userContent.push({ type: "image_url", image_url: { url: image_base64 } });
                }

                if (video_base64) {
                    userContent.push({ type: "text", text: "[WARNING: Video content provided but not supported by this API. Analyze based on text/image context.]" });
                }

                if (userContent.length > 0) messages.push({ role: "user", content: userContent });
                else messages.push({ role: "user", content: "Analyze provided context." });

                const completion = await client.chat.completions.create({
                    model: model,
                    messages: messages,
                    response_format: { type: "json_object" },
                    max_tokens: 4000
                });

                analysisResultText = completion.choices[0].message.content || '{}';
                successProvider = `${providerName.toLowerCase()}:${model}`;

            } catch (e: any) {
                console.error(`${providerName} Failed:`, e.message);
                errorLog.push(`${providerName}: ${e.message}`);
            }
        };

        // 2. DEEPSEEK (High Performance, Low Cost)
        // BaseURL: https://api.deepseek.com
        await tryOpenAICompatible('DeepSeek', process.env.DEEPSEEK_API_KEY, 'https://api.deepseek.com', 'deepseek-chat');

        // 3. GROK (xAI - Marketing Value)
        // BaseURL: https://api.x.ai/v1
        await tryOpenAICompatible('Grok', process.env.GROK_API_KEY || process.env.XAI_API_KEY, 'https://api.x.ai/v1', 'grok-beta');

        // 4. OPENAI (Final Fallback)
        // BaseURL: Default (undefined)
        await tryOpenAICompatible('OpenAI', process.env.OPENAI_API_KEY, 'https://api.openai.com/v1', 'gpt-4o-mini');


        if (!successProvider) {
            // Refund if all failed
            await userService.addCredits(user.uid, COST);
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, `All AI models failed. Details: ${errorLog.join(' | ')}`, 500);
        }

        // Clean JSON
        let text = analysisResultText.replace(/```json\n?|\n?```/g, '').trim();
        let analysisData;
        try {
            analysisData = JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error", text);
            analysisData = {
                error: "Failed to parse AI response",
                raw: text,
                reports: {}
            };
        }

        // 4. Log to Firestore
        try {
            await db.collection('ad_analysis_logs').add({
                userId: user.uid,
                timestamp: new Date().toISOString(),
                inputs: {
                    hasImage: !!image_base64,
                    hasVideo: !!video_base64,
                    copyLength: copywriting?.length || 0,
                    url: landing_page_url
                },
                source: successProvider,
                ...analysisData
            });
        } catch (logError) {
            console.error("Logging failed", logError);
        }

        return res.status(200).json(successResponse(analysisData));

    } catch (error: any) {
        console.error('Material Analysis Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
