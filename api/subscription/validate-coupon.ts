import { validateRequest } from '../_middleware/auth.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';
import { couponService } from '../_services/couponService.js';
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
        // Optional: Require auth to validate coupon? Maybe not strictly necessary but good practice.
        // Let's allow public validation for now, or require auth if we want to check user-specific rules later.
        // For now, let's require auth to prevent brute force.
        await validateRequest(req.headers);

        const { code, planId } = req.body;

        if (!code || !planId) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Missing code or planId'));
        }

        const coupon = await couponService.validateCoupon(code, planId);

        return res.status(200).json(successResponse({
            valid: true,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code
        }));

    } catch (error: any) {
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';
        return res.status(status).json(errorResponse(code, message));
    }
}
