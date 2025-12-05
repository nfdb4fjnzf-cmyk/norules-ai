import { validateRequest } from '../../_middleware/auth.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { userService } from '../../_services/userService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Analyze Estimate API
 * 
 * This endpoint receives the user's content, sends it to AI for a quick token count estimate,
 * and returns the estimated cost WITHOUT deducting credits.
 * 
 * The frontend will show this estimate to the user, who can then confirm to proceed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { image_base64, video_base64, video_url, copywriting, landing_page_url, language = 'Traditional Chinese' } = req.body;

        if (!image_base64 && !video_base64 && !video_url && !copywriting && !landing_page_url) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'At least one input (image, video, copy, or url) is required', 400);
        }

        // Get user profile for plan discounts
        const userProfile = await userService.getUserProfile(user.uid);
        const plan = userProfile.subscription?.plan || 'free';
        const mode = userProfile.mode || 'internal';
        const currentCredits = userProfile.credits || 0;

        // ============ TOKEN ESTIMATION ============
        // We'll use Gemini's countTokens API to estimate token usage
        // This is FREE and doesn't consume credits

        let estimatedTokens = 0;
        let estimationMethod = 'fallback';

        if (process.env.GEMINI_API_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

                // Build content parts for token counting
                const parts: any[] = [];

                // System prompt (same as in material.ts)
                const systemPrompt = `你是由 NoRules AI 開發的「最高原則 (Highest Principle)」合規審查官...`; // Abbreviated
                parts.push(systemPrompt);

                if (copywriting) parts.push(`Copywriting: ${copywriting}`);
                if (landing_page_url) parts.push(`Landing Page URL: ${landing_page_url}`);

                // For images, estimate based on size (Gemini charges by image, not tokens)
                if (image_base64) {
                    // Each image is roughly 258 tokens for Gemini
                    estimatedTokens += 258;
                }

                // For videos, estimate based on duration (1 second ≈ 263 tokens)
                // We can't know duration without processing, so use a base estimate
                if (video_base64 || video_url) {
                    // Assume 10 second video average
                    estimatedTokens += 2630;
                }

                // Count text tokens
                if (parts.length > 0) {
                    const textContent = parts.join('\n');
                    const countResult = await model.countTokens(textContent);
                    estimatedTokens += countResult.totalTokens;
                }

                // Add response tokens estimate (typical response is ~500-1500 tokens)
                estimatedTokens += 1000; // Conservative estimate for response

                estimationMethod = 'gemini-count';

            } catch (e: any) {
                console.error('Token counting failed, using fallback:', e.message);
                // Fallback estimation
                estimatedTokens = calculateFallbackTokens(copywriting, landing_page_url, !!image_base64, !!video_base64 || !!video_url);
                estimationMethod = 'fallback';
            }
        } else {
            // No Gemini key, use fallback
            estimatedTokens = calculateFallbackTokens(copywriting, landing_page_url, !!image_base64, !!video_base64 || !!video_url);
            estimationMethod = 'fallback';
        }

        // ============ COST CALCULATION ============
        // Pricing: 1 credit = 1000 tokens (can adjust)
        const TOKEN_RATE = 1000; // tokens per credit
        const MIN_COST = 1; // Minimum 1 credit
        const MAX_COST = 50; // Maximum 50 credits (cap for safety)

        let baseCost = Math.max(MIN_COST, Math.ceil(estimatedTokens / TOKEN_RATE));
        baseCost = Math.min(baseCost, MAX_COST);

        // Apply plan discounts
        let multiplier = 1;
        if (plan === 'lite') multiplier = 0.8; // 20% off
        else if (plan === 'pro') multiplier = 0.6; // 40% off
        else if (plan === 'ultra') multiplier = 0; // Free (unlimited)

        // External mode = free
        if (mode === 'external') multiplier = 0;

        const finalCost = Math.ceil(baseCost * multiplier);
        const hasEnoughCredits = mode === 'external' || plan === 'ultra' || currentCredits >= finalCost;

        return res.status(200).json(successResponse({
            estimated_tokens: estimatedTokens,
            estimation_method: estimationMethod,
            base_cost: baseCost,
            discount_multiplier: multiplier,
            final_cost: finalCost,
            current_credits: currentCredits,
            has_enough_credits: hasEnoughCredits,
            plan: plan,
            mode: mode,
            breakdown: {
                text_tokens: copywriting ? Math.ceil(copywriting.length / 4) : 0,
                image_tokens: image_base64 ? 258 : 0,
                video_tokens: (video_base64 || video_url) ? 2630 : 0,
                response_tokens: 1000
            }
        }));

    } catch (error: any) {
        console.error('Estimate Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        return res.status(status).json(errorResponse(code, error.message));
    }
}

/**
 * Fallback token estimation when Gemini countTokens is unavailable
 */
function calculateFallbackTokens(
    copywriting: string | undefined,
    landingPageUrl: string | undefined,
    hasImage: boolean,
    hasVideo: boolean
): number {
    let tokens = 0;

    // Base system prompt tokens (approximately)
    tokens += 500;

    // Text content (roughly 1 token per 4 characters for Chinese/English mix)
    if (copywriting) {
        tokens += Math.ceil(copywriting.length / 4);
    }

    if (landingPageUrl) {
        // URL analysis typically adds ~200 tokens
        tokens += 200;
    }

    // Image (Gemini charges ~258 tokens per image)
    if (hasImage) {
        tokens += 258;
    }

    // Video (roughly 263 tokens/second, assume 10 seconds average)
    if (hasVideo) {
        tokens += 2630;
    }

    // Response estimate
    tokens += 1000;

    return tokens;
}
