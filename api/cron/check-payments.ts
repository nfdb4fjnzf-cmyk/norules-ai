/**
 * Check Payments Cron Job
 * 
 * Runs every minute to:
 * 1. Match pending orders with incoming transactions
 * 2. Expire old orders
 * 
 * Vercel Cron: Every minute (Pro plan required)
 */

import { paymentService } from '../_services/paymentService.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify cron secret (Vercel sends this header)
    const authHeader = req.headers.authorization;
    const cronHeader = req.headers['x-vercel-cron'];

    // Allow if: 1) Vercel Cron header present, OR 2) Correct secret provided
    if (!cronHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
        console.warn('[Cron] Unauthorized cron attempt');
        return res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized'));
    }

    try {
        console.log('[Cron] Starting payment check...');

        // 1. Match transactions to pending orders
        const { matched, processed } = await paymentService.matchTransactionsToOrders();
        console.log(`[Cron] Matched ${matched} orders:`, processed);

        // 2. Expire old orders
        const expired = await paymentService.expireOldOrders();
        console.log(`[Cron] Expired ${expired} orders`);

        return res.status(200).json(successResponse({
            matched,
            processed,
            expired,
            timestamp: new Date().toISOString()
        }));

    } catch (error: any) {
        console.error('[Cron] Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
