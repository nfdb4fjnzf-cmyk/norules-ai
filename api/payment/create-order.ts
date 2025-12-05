/**
 * Create Payment Order API
 * 
 * Creates a new payment order with unique amount for TopUp or Subscription
 */

import { validateRequest } from '../_middleware/auth.js';
import { errorResponse, successResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';
import { paymentService } from '../_services/paymentService.js';
import { userService } from '../_services/userService.js';
import { PLANS } from '../_types/plans.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { type, points, planId, billingCycle = 'monthly' } = req.body;

        if (!type || !['TOPUP', 'SUB'].includes(type)) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid order type'));
        }

        let baseAmount = 0;
        let description = '';

        if (type === 'TOPUP') {
            // TopUp pricing
            if (!points || typeof points !== 'number' || points <= 0) {
                return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Valid points amount required'));
            }

            if (points === 2000) {
                baseAmount = 15;
            } else if (points === 10000) {
                baseAmount = 30;
            } else if (points > 10000) {
                baseAmount = points * 0.003;
            } else {
                return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid points package'));
            }

            // Add network fee
            baseAmount = Math.ceil(baseAmount) + 1;
            description = `Top-up ${points} Points`;

        } else if (type === 'SUB') {
            // Subscription pricing
            if (!planId) {
                return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Plan ID required'));
            }

            const selectedPlan = PLANS.find(p => p.id === planId);
            if (!selectedPlan) {
                return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid Plan ID'));
            }

            // Get price based on billing cycle
            switch (billingCycle) {
                case 'quarterly': baseAmount = selectedPlan.quarterlyPrice; break;
                case 'yearly': baseAmount = selectedPlan.yearlyPrice; break;
                default: baseAmount = selectedPlan.monthlyPrice; break;
            }

            // Calculate upgrade credit (pro-ration)
            const userProfile = await userService.getUserProfile(user.uid);
            if (userProfile.subscription?.status === 'active' && userProfile.subscription?.plan !== 'free') {
                const currentPlan = PLANS.find(p => p.id === userProfile.subscription?.plan);
                if (currentPlan && userProfile.subscription.startDate) {
                    const startDate = new Date(userProfile.subscription.startDate);
                    const diffDays = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    const usedRatio = Math.min(diffDays / 30, 1);
                    const remainingValue = Math.max(0, currentPlan.monthlyPrice * (1 - usedRatio));
                    baseAmount = Math.max(0, baseAmount - remainingValue);
                }
            }

            // Add network fee and ensure minimum
            baseAmount = Math.ceil(baseAmount) + 1;
            if (baseAmount < 5) baseAmount = 5; // Minimum $5

            description = `${selectedPlan.name} (${billingCycle})`;
        }

        // Create order
        const order = await paymentService.createOrder(user.uid, type, baseAmount, {
            points: type === 'TOPUP' ? points : undefined,
            planId: type === 'SUB' ? planId : undefined,
            billingCycle: type === 'SUB' ? billingCycle : undefined,
            description
        });

        // Generate QR code data
        const qrCodeData = paymentService.generateQRCodeData(order.walletAddress, order.expectedAmount);

        return res.status(200).json(successResponse({
            orderId: order.orderId,
            walletAddress: order.walletAddress,
            amount: order.expectedAmount,
            baseAmount: order.baseAmount,
            currency: order.currency,
            expiresAt: order.expiresAt.toDate().toISOString(),
            expiresInSeconds: Math.floor((order.expiresAt.toMillis() - Date.now()) / 1000),
            qrCodeData,
            description
        }));

    } catch (error: any) {
        console.error('Create Order Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
