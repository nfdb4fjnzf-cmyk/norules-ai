import { validateRequest } from '../_middleware/auth';
import { errorResponse, successResponse } from '../_utils/responseFormatter';
import { ErrorCodes } from '../_utils/errorHandler';
import { userService } from '../_services/userService';
import { PLANS } from '../_types/plans';
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

    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        const user = await validateRequest(req.headers);
        const { planId } = req.body;

        if (!planId) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Plan ID is required'));
        }

        const selectedPlan = PLANS.find(p => p.id === planId);
        if (!selectedPlan) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid Plan ID'));
        }

        const priceAmount = selectedPlan.price;
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
                price_amount: priceAmount,
                price_currency: currency,
                pay_currency: payCurrency,
                order_id: `SUB-${user.uid}-${Date.now()}`,
                order_description: `Subscription to ${selectedPlan.name}`,
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
            order_id: data.order_id
        }));

    } catch (error: any) {
        console.error('Create Invoice Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
