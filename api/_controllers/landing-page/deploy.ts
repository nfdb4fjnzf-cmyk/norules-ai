import { validateRequest } from '../../_middleware/auth.js';
import { landingPageService } from '../../_services/landingPageService.js';
import { cloudflareService } from '../../_services/cloudflareService.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
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

        // 1. Fetch Project
        const page = await landingPageService.get(id);
        if (!page) {
            return res.status(404).json(errorResponse(404, 'Landing page not found'));
        }
        if (page.userId !== user.uid) {
            return res.status(403).json(errorResponse(403, 'Access denied'));
        }
        if (!page.content?.html) {
            return res.status(400).json(errorResponse(400, 'No content to deploy. Please generate first.'));
        }

        // 2. Sanitize Project Name for Cloudflare
        // CF Rules: lowercase, alphanumeric, hyphens, max 28 chars? (Actually just valid hostname chars)
        // Let's make it safe: "norules-lp-" + id (to ensure uniqueness and validity)
        const safeName = `norules-lp-${id.toLowerCase().substring(0, 15)}`;

        // 3. Deploy to Cloudflare
        await cloudflareService.createProject(safeName);
        const deployResult = await cloudflareService.deployPage(safeName, page.content.html);

        // 4. Construct Live URL
        // Usually: https://<project-name>.pages.dev
        const liveUrl = `https://${safeName}.pages.dev`;

        // 5. Update Project Status
        await landingPageService.update(id, user.uid, {
            deployment: {
                status: 'live',
                url: liveUrl
            }
        });

        return res.status(200).json(successResponse({ url: liveUrl }));

    } catch (e: any) {
        console.error('Deploy landing page error:', e);
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
