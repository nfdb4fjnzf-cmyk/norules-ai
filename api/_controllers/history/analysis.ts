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
        const { id } = req.query;

        if (!id) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Report ID is required'));
        }

        const report = await historyService.getAnalysisReport(id as string, user.uid);

        return res.status(200).json(successResponse(report));

    } catch (error: any) {
        console.error('History Analysis Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(status).json(errorResponse(code, message));
    }
}
