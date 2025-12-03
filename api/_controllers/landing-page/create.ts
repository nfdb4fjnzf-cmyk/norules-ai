import { validateRequest } from '../../_middleware/auth.js';
import { landingPageService } from '../../_services/landingPageService.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const user = await validateRequest(req);
        const { name, config } = req.body;

        if (!name || !config) {
            return res.status(400).json(errorResponse(400, 'Missing name or config'));
        }

        const newPage = await landingPageService.create(user.uid, name, config);

        return res.status(201).json(successResponse(newPage));

    } catch (e: any) {
        console.error('Create landing page error:', e);
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
