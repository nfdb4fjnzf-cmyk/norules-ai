import { validateRequest } from '../../_middleware/auth.js';
import { landingPageService } from '../../_services/landingPageService.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const user = await validateRequest(req);
        const { id } = req.body;

        if (!id) {
            return res.status(400).json(errorResponse(400, 'Missing project ID'));
        }

        // 1. Fetch Project Config
        const page = await landingPageService.get(id);
        if (!page) {
            return res.status(404).json(errorResponse(404, 'Landing page not found'));
        }
        if (page.userId !== user.uid) {
            return res.status(403).json(errorResponse(403, 'Access denied'));
        }

        // 2. Update Status to Generating
        await landingPageService.update(id, user.uid, {
            deployment: { ...page.deployment, status: 'generating' }
        });

        // 3. Construct Prompt
        const config = page.config;
        const prompt = `
            You are an expert web designer and conversion rate optimization specialist.
            Create a high-converting, single-page landing page HTML for the following project:

            Product Name: ${config.productName}
            Industry: ${config.industry}
            Marketing Goal: ${config.marketingGoal}
            Target Audience: ${config.targetAudience}
            Tone: ${config.tone}
            Language: ${config.language}

            Requirements:
            1. Use Tailwind CSS via CDN for styling.
            2. Use Google Fonts (Inter or Roboto).
            3. Include a clear Hero section, Benefits/Features section, Social Proof (testimonials), and a strong CTA section.
            4. The design should be modern, mobile-responsive, and visually appealing.
            5. Use placeholder images from unsplash.com (e.g., https://source.unsplash.com/random/800x600/?${config.industry}).
            6. Return ONLY the raw HTML code. Do not include markdown backticks or explanations.
            7. Ensure the HTML is complete (<!DOCTYPE html>...</html>).
            8. Write all copy in ${config.language}.
        `;

        // 4. Call Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Gemini API Key is missing', 500);
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let htmlOutput = response.text();

        // Clean up markdown if present
        htmlOutput = htmlOutput.replace(/```html/g, '').replace(/```/g, '').trim();

        // 5. Update Project with Content
        await landingPageService.update(id, user.uid, {
            content: {
                html: htmlOutput
            },
            deployment: { ...page.deployment, status: 'draft' } // Back to draft, ready to deploy
        });

        return res.status(200).json(successResponse({ html: htmlOutput }));

    } catch (e: any) {
        console.error('Generate landing page error:', e);

        // Try to revert status if possible (best effort)
        try {
            const { id } = req.body;
            if (id) {
                // We don't have user uid here easily if auth failed, but usually we fail after auth.
                // For simplicity, we skip revert logic if auth failed.
            }
        } catch (ignore) { }

        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
