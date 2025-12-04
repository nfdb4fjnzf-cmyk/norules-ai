import { validateRequest } from '../_middleware/auth.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';
import { subscriptionService } from '../_services/subscriptionService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Manual CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
        const user = await validateRequest(req.headers);

        const cancelAt = await subscriptionService.cancelSubscription(user.uid);

        return res.status(200).json(successResponse({
            message: 'Subscription canceled successfully',
            cancelAt: cancelAt.toISOString()
        }));

    } catch (error: any) {
        console.error('Subscription Cancel Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(status).json(errorResponse(code, message));
    }
}
