import { validateRequest } from '../_middleware/auth.js';
import { errorResponse, successResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';
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
        const { points } = req.body;

        if (!points || typeof points !== 'number' || points <= 0) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Valid points amount is required'));
        }

        let priceAmount = 0;

        // Pricing Logic
        if (points === 2000) {
            priceAmount = 15;
        } else if (points === 10000) {
            priceAmount = 30;
        } else if (points > 10000) {
            priceAmount = points * 0.003;
        } else {
            // For amounts between 2000 and 10000, or less than 2000, we need a fallback or error.
            // The requirement only specified these 3 tiers.
            // Let's assume custom amount is only allowed for > 10000 as per prompt "Third price tier 10000+..."
            // But usually users might want to buy 5000.
            // Let's implement a strict check for the fixed packages, and the rate for > 10000.
            // If user sends 5000, it falls into "else".
            // Let's allow > 10000 custom.
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid points package. Choose 2000, 10000, or a custom amount > 10000.'));
        }

        // Round to 2 decimal places
        priceAmount = Math.round(priceAmount * 100) / 100;

        const currency = 'USD';
        const payCurrency = 'usdttrc20';

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
                // Format: TOPUP-uid-points-timestamp
                order_id: `TOPUP-${user.uid}-${points}-${Date.now()}`,
                order_description: `Top-up ${points} Points`,
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
            final_price: priceAmount
        }));

    } catch (error: any) {
        console.error('Create Top-up Invoice Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
