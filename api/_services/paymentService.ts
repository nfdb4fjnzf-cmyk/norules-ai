import axios from 'axios';

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://noai-staging.vercel.app';

export const paymentService = {
    /**
     * Create Invoice (Real)
     */
    createInvoice: async (
        price: number,
        orderId: string,
        orderDescription: string
    ): Promise<string> => {
        // If API Key is missing, return a mock URL for testing
        if (!NOWPAYMENTS_API_KEY) {
            console.warn('NOWPAYMENTS_API_KEY missing. Returning mock payment URL.');
            return `https://mock-payment.norules.ai/pay?orderId=${orderId}&amount=${price}`;
        }

        try {
            // Real NOWPayments API Call (Fixed USDTTRC20 Invoice)
            const response = await axios.post(`${NOWPAYMENTS_API_URL}/invoice`, {
                price_amount: price,
                price_currency: 'usd',
                pay_currency: 'usdttrc20',
                order_id: orderId,
                order_description: orderDescription,
                ipn_callback_url: `${BASE_URL}/api/payment/webhook`,
                success_url: `${BASE_URL}/subscription/success`,
                cancel_url: `${BASE_URL}/subscription/cancel`,
                fixed_rate: true,
                is_fee_paid_by_user: false
            }, {
                headers: {
                    'x-api-key': NOWPAYMENTS_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.invoice_url;

        } catch (error: any) {
            console.error('Payment creation failed:', error.response?.data || error.message);
            throw new Error('Failed to create payment invoice');
        }
    }
};
