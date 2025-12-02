import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

        // 2. Prepare Gemini Input
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Gemini API Key is missing', 500);
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        // Model initialized in loop below
        const parts: any[] = [];

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
        parts.push(systemPrompt);

        // Add User Inputs
        if (copywriting) parts.push(`\nCopywriting: ${copywriting}`);
        if (landing_page_url) parts.push(`\nLanding Page URL: ${landing_page_url}`);

        if (image_base64) {
            // Extract mime type
            const match = image_base64.match(/^data:(image\/\w+);base64,/);
            const mimeType = match ? match[1] : "image/jpeg";
            const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");

            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            });
        }

        if (video_base64) {
            // Extract mime type
            const match = video_base64.match(/^data:(video\/\w+);base64,/);
            const mimeType = match ? match[1] : "video/mp4";
            const base64Data = video_base64.replace(/^data:video\/\w+;base64,/, "");

            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            });
        }

        // 3. Generate Content with Fallback Strategy
        const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro'];
        let text = '';
        let lastError;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting analysis with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(parts);
                const response = await result.response;
                text = response.text();

                // If successful, break the loop
                break;
            } catch (geminiError: any) {
                console.error(`Gemini Generation Error (${modelName}):`, geminiError);
                lastError = geminiError;
                // If this was the last model, throw the error
                if (modelName === modelsToTry[modelsToTry.length - 1]) {
                    // Refund on final failure
                    await userService.addCredits(user.uid, COST);
                    throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, `AI Analysis Failed after retries: ${geminiError.message}`, 500);
                }
                // Otherwise continue to next model
            }
        }

        // Clean JSON
        text = text.replace(/```json\n?|\n?```/g, '').trim();
        let analysisData;
        try {
            analysisData = JSON.parse(text);
        } catch (e) {
            console.error("JSON Parse Error", text);
            // Fallback structure
            analysisData = {
                error: "Failed to parse AI response",
                raw: text,
                reports: {} // Ensure structure exists to prevent frontend crash
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
