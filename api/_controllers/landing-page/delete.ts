import { validateRequest } from '../../_middleware/auth.js';
import { landingPageService } from '../../_services/landingPageService.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'DELETE') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const user = await validateRequest(req);
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json(errorResponse(400, 'Missing id'));
        }

        await landingPageService.delete(id, user.uid);

        return res.status(200).json(successResponse({ message: 'Deleted successfully' }));

    } catch (e: any) {
        console.error('Delete landing page error:', e);
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
