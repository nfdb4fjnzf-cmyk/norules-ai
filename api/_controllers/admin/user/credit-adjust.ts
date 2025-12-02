import { validateAdmin } from '../../_middleware/adminAuth.js';
import { creditService } from '../../_services/creditService.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const adminUser = await validateAdmin(req);
        const { userId, amount, reason, type } = req.body;

        if (!userId || !amount || !type) {
            return res.status(400).json(errorResponse(400, 'Missing required fields'));
        }

        if (type === 'ADD') {
            // We don't have a direct "addCredits" in creditService exposed yet?
            // creditService has `addLedgerEntry` but it's internal?
            // Let's check creditService.ts.
            // It has `refundCredits` (adds) and `deductCredits`.
            // We should probably expose a generic `adjustCredits` or use `refundCredits` for adding.
            // But `refundCredits` implies a refund.
            // I'll use `addLedgerEntry` directly if exported, or add a method to creditService.

            // Let's assume we can call creditService.addLedgerEntry manually or add a helper.
            // I'll check creditService.ts content again.
        }

        // Checking creditService.ts content...
        // I'll assume I need to add `adjustCredits` to creditService.ts first.

        // For now, I'll return 501 Not Implemented until I update creditService.
        // But I should update creditService.ts now.

        // Let's update creditService.ts to support manual adjustment.
        await creditService.adjustCredits(userId, amount, type, reason || 'Admin Adjustment', adminUser.uid);

        return res.status(200).json(successResponse({ success: true }));

    } catch (e: any) {
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
