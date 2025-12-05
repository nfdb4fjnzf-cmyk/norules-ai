/**
 * Order Status API
 * 
 * Check the status of a payment order
 */

import { validateRequest } from '../_middleware/auth.js';
import { errorResponse, successResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';
import { paymentService } from '../_services/paymentService.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { orderId } = req.query;

        if (!orderId || typeof orderId !== 'string') {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Order ID required'));
        }

        const order = await paymentService.getOrder(orderId);

        if (!order) {
            return res.status(404).json(errorResponse(ErrorCodes.NOT_FOUND, 'Order not found'));
        }

        // Verify ownership
        if (order.userId !== user.uid) {
            return res.status(403).json(errorResponse(ErrorCodes.UNAUTHORIZED, 'Access denied'));
        }

        // Calculate remaining time
        const now = Date.now();
        const expiresAt = order.expiresAt.toMillis();
        const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

        return res.status(200).json(successResponse({
            orderId: order.orderId,
            status: order.status,
            type: order.type,
            amount: order.expectedAmount,
            walletAddress: order.walletAddress,
            currency: order.currency,
            txHash: order.txHash || null,
            remainingSeconds,
            isExpired: order.status === 'expired' || remainingSeconds <= 0,
            createdAt: order.createdAt.toDate().toISOString(),
            expiresAt: order.expiresAt.toDate().toISOString(),
            completedAt: order.completedAt?.toDate().toISOString() || null
        }));

    } catch (error: any) {
        console.error('Order Status Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
