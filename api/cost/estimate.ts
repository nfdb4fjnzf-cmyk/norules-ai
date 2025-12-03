import { validateRequest } from '../_middleware/auth.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';
import { usageService } from '../_services/usageService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        await validateRequest(req.headers);

        const { actionType, inputLength = 0, model = 'default' } = req.body;

        if (!actionType) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'actionType is required'));
        }

        const estimatedCost = usageService.estimateCost(actionType);

        return res.status(200).json(successResponse({ estimatedCost }));

    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json(errorResponse(error.code || ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
