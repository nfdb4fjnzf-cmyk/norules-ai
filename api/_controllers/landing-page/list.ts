import { validateRequest } from '../../_middleware/auth.js';
import { landingPageService } from '../../_services/landingPageService.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const user = await validateRequest(req);
        const pages = await landingPageService.listByUser(user.uid);

        return res.status(200).json(successResponse({ pages }));

    } catch (e: any) {
        console.error('List landing pages error:', e);
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
