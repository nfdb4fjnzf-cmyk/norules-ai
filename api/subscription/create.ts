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
        const { planId, billingCycle, couponCode } = req.body;

        if (!planId || !billingCycle) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Missing planId or billingCycle'));
        }

        if (!['lite', 'pro', 'ultra'].includes(planId)) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid planId'));
        }

        if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid billingCycle'));
        }

        // Fetch full user profile to check mode
        const { userService } = await import('../_services/userService.js');
        const userProfile = await userService.getUserProfile(user.uid);
        const isInternal = userProfile?.mode === 'internal';

        // Calculate Upgrade / Proration (Check Downgrade FIRST)
        const upgradeCheck = await subscriptionService.calculateUpgrade(user.uid, planId, billingCycle);

        if (!upgradeCheck.allowed) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, upgradeCheck.reason || 'Downgrade not allowed'));
        }

        // Internal Users: Direct Activation (Free)
        if (isInternal) {
            await subscriptionService.createSubscription(user.uid, planId, billingCycle, couponCode);

            return res.status(200).json(successResponse({
                message: 'Subscription created successfully (Internal Mode)',
                planId,
                billingCycle,
                couponApplied: !!couponCode,
                mode: 'internal'
            }));
        }

        // External Users: Payment Required (Self-Hosted USDT)
        const { paymentService } = await import('../_services/paymentService.js');

        const price = upgradeCheck.finalPrice;

        // Network fee is UI hint only, not added to payment
        const finalAmount = Math.ceil(price);

        // Create payment order using new self-hosted system
        const order = await paymentService.createOrder(
            user.uid,
            'SUB',
            finalAmount,
            {
                planId,
                billingCycle,
                description: `Subscription: ${planId} (${billingCycle})${upgradeCheck.isUpgrade ? ' (Upgrade)' : ''}`
            }
        );

        // Return order details for frontend to redirect to payment page
        return res.status(200).json(successResponse({
            message: 'Payment required',
            orderId: order.orderId,
            amount: order.expectedAmount,
            walletAddress: order.walletAddress,
            expiresAt: order.expiresAt.toDate().toISOString(),
            paymentUrl: `/payment?orderId=${order.orderId}`,
            mode: 'external'
        }));


    } catch (error: any) {
        console.error('Subscription Create Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        // DEBUG: Return full error details safely
        return res.status(status).json({
            success: false,
            message: message, // Top level message for easy access
            error: message,   // Backward compatibility
            debug: {
                code,
                stack: error.stack,
                details: JSON.stringify(error)
            }
        });
    }
}
