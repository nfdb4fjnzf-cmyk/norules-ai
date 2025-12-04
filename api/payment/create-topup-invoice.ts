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
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid points package. Choose 2000, 10000, or a custom amount > 10000.'));
        }

        // Round to 2 decimal places
        priceAmount = Math.round(priceAmount * 100) / 100;

        // Force Integer USDT Amount to avoid decimals
        // Add 4 USDT Network Fee to ensure we don't lose on exchange rate and gas
        // e.g. $15 -> 19 USDT
        const finalAmount = Math.ceil(priceAmount) + 4;

        // Create Invoice via PaymentService (supports mock fallback)
        const { paymentService } = await import('../_services/paymentService.js');

        const orderId = `TOPUP-${user.uid}-${points}-${Date.now()}`;
        const description = `Top-up ${points} Points (incl. 4 USDT Network Fee)`;

        const invoiceUrl = await paymentService.createInvoice(
            finalAmount,
            orderId,
            description
        );

        return res.status(200).json(successResponse({
            invoice_url: invoiceUrl,
            id: `inv_${Date.now()}`, // Mock ID if service doesn't return one
            order_id: orderId,
            final_price: finalAmount // Return the actual amount user needs to pay
        }));

    } catch (error: any) {
        console.error('Create Top-up Invoice Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
