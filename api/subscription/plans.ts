import { PLANS } from '../_types/plans';
import { successResponse, errorResponse } from '../_utils/responseFormatter';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method !== 'GET') {
            return res.status(405).json(errorResponse(405, 'Method Not Allowed'));
        }

        return res.status(200).json(successResponse(PLANS));

    } catch (e: any) {
        return res.status(500).json(errorResponse(500, e.message));
    }
}
