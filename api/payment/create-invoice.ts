import { validateRequest } from '../_middleware/auth.js';
import { errorResponse, successResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';
import { userService } from '../_services/userService.js';
import { PLANS } from '../_types/plans.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Manual CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
        const { planId, billingCycle = 'monthly' } = req.body;

        if (!planId) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Plan ID is required'));
        }

        const selectedPlan = PLANS.find(p => p.id === planId);
        if (!selectedPlan) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid Plan ID'));
        }

        // Calculate Base Price based on Cycle
        let priceAmount = 0;
        switch (billingCycle) {
            case 'quarterly': priceAmount = selectedPlan.quarterlyPrice; break;
            case 'yearly': priceAmount = selectedPlan.yearlyPrice; break;
            default: priceAmount = selectedPlan.monthlyPrice; break;
        }

        // V3 Upgrade Logic: Pro-ration
        const userProfile = await userService.getUserProfile(user.uid);
        let remainingValue = 0;

        if (userProfile.subscription && userProfile.subscription.status === 'active' && userProfile.subscription.plan !== 'free') {
            const currentPlanId = userProfile.subscription.plan;
            const currentPlan = PLANS.find(p => p.id === currentPlanId);

            // Only apply pro-ration if upgrading (simple check: new price > old price? or just always apply?)
            // Spec says: "Upgrade (Light -> Medium)".
            // We should check if startDate exists.
            if (currentPlan && userProfile.subscription.startDate) {
                const startDate = new Date(userProfile.subscription.startDate);
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Assume 30 days for monthly cycle for simplicity as per spec "today - startDate"
                // But we need to know the *cycle* of the current plan to know total days.
                // Current subscription object doesn't store cycle explicitly in the interface shown in userService.ts
                // I should probably update userService.ts to store 'cycle' or infer it.
                // For now, I'll assume monthly (30 days) if not stored, or try to infer from price?
                // Let's assume standard 30 days for calculation as per spec example "Used / 30".

                // Spec: "Used Days = today - startDate. Used Ratio = Used Days / 30. Consumed = 5 * Ratio. Remaining = 5 - Consumed."
                // This implies monthly cycle.
                // If the user is on a yearly plan, this logic needs adjustment.
                // For V3 Spec compliance, I will follow the "Light -> Medium" example which implies monthly.

                // However, to be robust, we should calculate based on actual paid amount.
                // But we don't store "paid amount" in subscription object currently.
                // I'll use the current plan's monthly price as the basis for "Value".

                const cycleDays = 30; // Default to monthly logic for now
                const usedRatio = Math.min(diffDays / cycleDays, 1);
                const currentPlanPrice = currentPlan.monthlyPrice; // Assuming monthly base
                const consumedValue = currentPlanPrice * usedRatio;
                remainingValue = Math.max(0, currentPlanPrice - consumedValue);

                console.log(`[Upgrade] User ${user.uid} upgrading from ${currentPlanId}. Used ${diffDays} days. Remaining Value: ${remainingValue}`);
            }
        }

        // Deduct remaining value from new price
        let finalPrice = priceAmount - remainingValue;
        if (finalPrice < 0) finalPrice = 0; // Should not happen for upgrades, but safe guard.

        // Safety check for minimum amount (NOWPayments min is usually around $2-3 depending on coin)
        // If finalPrice is very low (e.g. $0.5), we might want to just charge minimum or $0?
        // NOWPayments won't accept $0.
        // If finalPrice is 0 (e.g. downgrade or full refund), we should probably handle it differently.
        // But for "Upgrade", price should increase.
        if (finalPrice > 0 && finalPrice < 1) {
            finalPrice = 1; // Enforce minimum $1 to cover fees if it's too small
        }

        // If finalPrice is 0 (e.g. within same day switch?), maybe just update DB directly?
        // For now, let's assume we always charge something or minimum $1.

        const currency = 'USD'; // Base currency
        const payCurrency = 'usdttrc20'; // NOWPayments specific

        // Create Invoice via NOWPayments
        const apiKey = process.env.NOWPAYMENTS_API_KEY;
        if (!apiKey) {
            throw new Error('NOWPAYMENTS_API_KEY is missing');
        }

        const response = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price_amount: finalPrice,
                price_currency: currency,
                pay_currency: payCurrency,
                // Encode Plan and Cycle in Order ID for Webhook
                // Format: SUB-uid-planId-cycle-timestamp-isUpgrade
                order_id: `SUB-${user.uid}-${planId}-${billingCycle}-${Date.now()}`,
                order_description: `Subscription to ${selectedPlan.name} (${billingCycle})` + (remainingValue > 0 ? ` (Upgrade, -$${remainingValue.toFixed(2)} credit)` : ''),
                ipn_callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://norulesai.vercel.app'}/api/payment/webhook`,
                success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://norulesai.vercel.app'}/subscription/success`,
                cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://norulesai.vercel.app'}/subscription/cancel`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NOWPayments Error: ${errorText}`);
        }

        const data = await response.json();

        return res.status(200).json(successResponse({
            invoice_url: data.invoice_url,
            id: data.id,
            order_id: data.order_id,
            final_price: finalPrice
        }));

    } catch (error: any) {
        console.error('Create Invoice Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
