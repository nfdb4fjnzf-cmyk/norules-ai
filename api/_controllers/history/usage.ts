import { validateRequest } from '../../_middleware/auth.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { ErrorCodes } from '../../_utils/errorHandler.js';
import { historyService } from '../../_services/historyService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Manual CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { limit = '20', type, startAfter } = req.query;

        // 1. Get Usage Operations
        const operations = await historyService.getUsageHistory({
            userId: user.uid,
            limit: parseInt(limit as string),
            type: type as string,
            startAfter: startAfter
        });

        // 2. Get Credit Ledger (Optional, maybe separate endpoint or include?)
        // Let's keep them separate or just return operations for now as "Usage History".
        // The user might want to see "Wallet History" (Ledger) vs "Activity History" (Operations).
        // This endpoint is "Usage".

        return res.status(200).json(successResponse({
            history: operations,
            meta: {
                count: operations.length
            }
        }));

    } catch (error: any) {
        console.error('History Usage Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(status).json(errorResponse(code, message));
    }
}
