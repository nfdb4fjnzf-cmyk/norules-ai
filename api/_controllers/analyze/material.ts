import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { userService } from '../../_services/userService.js';
import { db } from '../../_config/firebaseAdmin.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { usageService } from '../../_services/usageService.js';
import admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    let operationId = '';
    const COST = 5;

    try {
        const user = await validateRequest(req.headers);
        const { image_base64, video_base64, video_url, copywriting, landing_page_url, platforms = ['meta', 'tiktok', 'google'], language = 'Traditional Chinese' } = req.body;

        if (!image_base64 && !video_base64 && !video_url && !copywriting && !landing_page_url) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'At least one input (image, video, copy, or url) is required', 400);
        }

        // 1. Start Usage Operation (Check & Deduct Credits)
        const userProfile = await userService.getUserProfile(user.uid); // Still need userProfile for rate limiting
        await checkRateLimit(user.uid, userProfile.subscription?.plan || 'free');

        const usageOp = await usageService.startUsageOperation(
            user.uid,
            'ANALYZE',
            COST,
            { platforms, language, hasImage: !!image_base64, hasVideo: !!video_base64 || !!video_url }
        );
        operationId = usageOp.operationId;


        // Fixed System Prompt
        const systemPrompt = `
你是由 NoRules AI 開發的「最高原則 (Highest Principle)」合規審查官。你的任務是根據 Meta、TikTok、Google 的最新廣告政策，對廣告素材進行最嚴格、最全面的風險分析。

請對以下內容進行審核（如果提供）：
- 圖片內容摘要 (Visual Analysis)
- 影片內容摘要 (Video Analysis)
- 文案內容摘要 (Copywriting Analysis)
- 登陸頁內容摘要 (Landing Page Analysis)

請回傳固定三份報告：Meta、TikTok、Google。
請使用 ${language} 撰寫所有報告內容。

每個平台請依據「最高原則」並參考以下 11 項分類檢查違規：
1. 賭博、博彩、金融投資風險 (Gambling & Financial)
2. 成人、性暗示、低俗表述 (Adult & Sexual)
3. 危險行為 (Dangerous Acts)
4. 醫療、醫美、療程 (Medical & Health)
5. 金錢承諾、收入保證 (Income Claims)
6. 侵權（肖像、LOGO、圖片）(Copyright)
7. 誤導性內容、未經授權宣稱 (Misleading)
8. 不允許的引導用語 (Prohibited Call-to-Action)
9. 圖片政策限制 (Image Policy)
10. 影片政策限制 (Video Policy)
11. 文案政策限制 (Copy Policy)

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

        // Prepare Video Data (Base64)
        let finalVideoBase64 = video_base64;

        // If video_url is provided, fetch it and convert to base64
        if (video_url && !finalVideoBase64) {
            try {
                console.log(`Fetching video from URL: ${video_url}`);
                const videoResp = await fetch(video_url);
                if (!videoResp.ok) throw new Error(`Failed to fetch video: ${videoResp.statusText}`);
                const arrayBuffer = await videoResp.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                finalVideoBase64 = `data:video/mp4;base64,${buffer.toString('base64')}`;
            } catch (e: any) {
                console.error("Failed to fetch video from URL", e);
                errorLog.push(`Video Fetch Failed: ${e.message}`);
            }
        }

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

                if (finalVideoBase64) {
                    const match = finalVideoBase64.match(/^data:(video\/\w+);base64,/);
                    const mimeType = match ? match[1] : "video/mp4";
                    const base64Data = finalVideoBase64.replace(/^data:video\/\w+;base64,/, "");
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
            // Finalize Operation (Success)
            await usageService.finalizeUsageOperation(operationId, 'SUCCEEDED', COST, null);

            // Save Analysis Report
            const reportRef = db.collection('analysis_reports').doc();
            await reportRef.set({
                userId: user.uid,
                sourceType: video_url || video_base64 ? 'video' : (image_base64 ? 'image' : 'text'),
                inputSummary: copywriting ? copywriting.substring(0, 100) : 'Media Analysis',
                platforms: platforms,
                riskSummary: 'See details', // Could extract from parsedResult
                resultJson: analysisData, // Use analysisData here
                language: language,
                usageOperationId: operationId,
                creditsUsed: COST,
                createdAt: admin.firestore.Timestamp.now()
            });

            // Update Operation with Result Ref
            await db.collection('usage_operations').doc(operationId).update({
                result_ref: `analysis_reports/${reportRef.id}`
            });

            // Log Transaction (Legacy - optional)
            await usageService.logTransaction({
                userId: user.uid,
                actionType: 'analysis',
                estimatedCost: COST,
                actualCost: COST,
                timestamp: new Date().toISOString(),
                status: 'success',
                modelUsed: successProvider
            });

            return res.status(200).json(successResponse({
                ...analysisData, // Use analysisData here
                reportId: reportRef.id // Return ID to frontend
            }));

        } catch (logError) {
            console.error("Logging failed", logError);
            // Even if logging fails, we return success if analysis worked?
            // But we already returned in the try block.
            // If we are here, it means logging failed BEFORE return.
            // We should probably still return success but maybe warn?
            return res.status(200).json(successResponse(analysisData));
        }

    } catch (error: any) {
        console.error('Analysis Error:', error);

        // Finalize Operation (Failed -> Refund)
        if (operationId) {
            await usageService.finalizeUsageOperation(operationId, 'FAILED', 0, null, error.message);
        }

        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
