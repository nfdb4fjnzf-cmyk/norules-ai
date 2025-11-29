import { errorResponse, successResponse } from '../_utils/responseFormatter';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Private-Mode'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(405, 'Method Not Allowed'));
    }

    try {
        const { userId, amount } = req.body;

        if (!userId || !amount) {
            return res.status(400).json(errorResponse(400, 'Missing required fields'));
        }

        const apiKey = process.env.NOWPAYMENTS_API_KEY;
        if (!apiKey) {
            console.error('NOWPAYMENTS_API_KEY is missing');
            return res.status(500).json(errorResponse(500, 'Payment configuration error'));
        }

        const response = await fetch("https://api.nowpayments.io/v1/invoice", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                price_amount: amount,
                price_currency: "usd",
                pay_currency: "usdttrc20",
                order_id: userId,
                success_url: "https://adguardian-llm.vercel.app/subscription/success", // Updated to real domain
                cancel_url: "https://adguardian-llm.vercel.app/subscription/cancel",   // Updated to real domain
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('NOWPayments API Error:', errorText);
            return res.status(502).json(errorResponse(502, 'Payment gateway error', { details: errorText }));
        }

        const data = await response.json();
        return res.status(200).json(successResponse(data));

    } catch (error: any) {
        console.error('Create Invoice Error:', error);
        return res.status(500).json(errorResponse(500, error.message));
    }
}
