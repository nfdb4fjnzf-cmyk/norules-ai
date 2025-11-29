import { validateRequest } from '../../_middleware/auth.js';
import { checkRateLimit } from '../../_middleware/rateLimit.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { userService } from '../../_services/userService.js';
import { logUsage } from '../../_services/usageService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { videoUri, plan = 'FREE' } = req.body;

        if (!videoUri) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Video URI (Google File API) is required', 400);
        }

        // 1. Fetch User Profile to check Mode & Plan
        const userProfile = await userService.getUserProfile(user.uid);

        // 2. Enforce Restrictions (Ch.3 Mode C & Ch.4)
        // External Mode cannot use Video Analyzer
        if (userProfile.mode === 'external') {
            throw new AppError(ErrorCodes.FORBIDDEN, 'External Mode does not support Video Analysis. Please switch to Internal Mode.', 403);
        }

        // Free Trial cannot use Video Analyzer (High Load)
        // Assuming 'free' plan is the trial/free tier.
        if (userProfile.subscription?.plan === 'free') {
            throw new AppError(ErrorCodes.FORBIDDEN, 'Free Trial users cannot use Video Analysis. Please upgrade to a paid plan.', 403);
        }

        // 3. Rate Limit Check
        await checkRateLimit(user.uid, plan);

        // 4. Deduct Credits (Ch.5 - Video Analysis = 10 credits)
        const hasCredits = await userService.deductCredits(user.uid, 10);
        if (!hasCredits) {
            throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, 'Insufficient credits for Video Analysis (10 credits required).', 402);
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        const prompt = `
      Analyze this video advertisement frame-by-frame for compliance risks.
      Focus on:
      1. Visual safety (NSFW, violence)
      2. Text overlays (misleading claims)
      3. Audio content (prohibited keywords)
      
      Return JSON format:
      {
        "score": number,
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "issues": string[],
        "timestamps": [{ "time": "00:05", "issue": "..." }]
      }
    `;

        const result = await model.generateContent([
            prompt,
            {
                fileData: {
                    mimeType: "video/mp4",
                    fileUri: videoUri
                }
            }
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

        // 5. Log Usage
        await logUsage(user.uid, 'video_analysis', 10);

        return res.status(200).json(successResponse(analysisData));

    } catch (error: any) {
        console.error('Video Analysis Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
