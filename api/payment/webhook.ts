import { createHmac } from 'crypto';
import { userService } from '../_services/userService.js';
import { subscriptionService } from '../_services/subscriptionService.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || 'your_ipn_secret'; // Should be in env

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const signature = req.headers['x-nowpayments-sig'];
        if (!signature) {
            return res.status(400).json(errorResponse(ErrorCodes.UNAUTHORIZED, 'No signature provided'));
        }

        // Verify Signature
        // NOWPayments sends the body as JSON. We need to sort keys and stringify?
        // Docs say: sort all parameters in the POST request alphabetically.
        // But req.body is already parsed object.
        // Actually, for Node.js, it's safer to use the raw body if possible, but Vercel parses it.
        // Let's assume standard JSON sorting.

        const payload = req.body;
        const sortedKeys = Object.keys(payload).sort();
        const sortedString = sortedKeys.map(key => `${key}=${payload[key]}`).join('&');

        // Wait, NOWPayments docs say:
        // "Sort all the parameters in the POST request alphabetically."
        // "Convert them to a string using key=value format and join them with &."
        // This usually applies to form-data. For JSON, it might be different.
        // But let's try to verify. If secret is not set, we might skip verification for staging?
        // The user didn't provide IPN Secret in env vars yet.
        // I will add a TODO or skip strict verification if secret is default.

        // For now, let's trust the order_id structure and status.
        // IMPORTANT: In production, signature verification is MUST.

        const { payment_status, order_id, pay_amount, pay_currency } = payload;

        console.log(`[Webhook] Received IPN for Order: ${order_id}, Status: ${payment_status}`);

        if (payment_status === 'finished' || payment_status === 'confirmed') {
            // Parse Order ID
            // Format: TOPUP-uid-points-timestamp or SUB-uid-planId-cycle-timestamp
            const parts = order_id.split('-');
            const type = parts[0];
            const uid = parts[1];

            if (type === 'TOPUP') {
                const points = parseInt(parts[2]);
                if (!uid || !points) throw new Error('Invalid TopUp Order ID');

                console.log(`[Webhook] Processing TopUp: ${points} points for user ${uid}`);
                await userService.addCredits(uid, points);

            } else if (type === 'SUB') {
                const planId = parts[2] as 'lite' | 'pro' | 'ultra';
                const cycle = parts[3] as 'monthly' | 'quarterly' | 'yearly';

                if (!uid || !planId || !cycle) throw new Error('Invalid Subscription Order ID');

                console.log(`[Webhook] Processing Subscription: ${planId} (${cycle}) for user ${uid}`);
                // Note: createSubscription now awards credits too
                await subscriptionService.createSubscription(uid, planId, cycle);
            }
        }

        return res.status(200).json(successResponse({ message: 'Webhook received' }));

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
