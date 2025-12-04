import axios from 'axios';

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

export const paymentService = {
    /**
     * Create Invoice (Mock or Real)
     */
    createInvoice: async (
        price: number,
        currency: string,
        orderId: string,
        orderDescription: string
    ): Promise<string> => {
        // If API Key is missing, return a mock URL for testing
        if (!NOWPAYMENTS_API_KEY) {
            console.warn('NOWPAYMENTS_API_KEY missing. Returning mock payment URL.');
            return `https://mock-payment.norules.ai/pay?orderId=${orderId}&amount=${price}`;
        }

        try {
            // Real NOWPayments API Call (Commented out until fully tested/configured)
            /*
            const response = await axios.post(`${NOWPAYMENTS_API_URL}/invoice`, {
                price_amount: price,
                price_currency: currency,
                order_id: orderId,
                order_description: orderDescription,
                ipn_callback_url: process.env.NOWPAYMENTS_IPN_URL,
                success_url: `${process.env.NEXT_PUBLIC_API_URL}/subscription/success`,
                cancel_url: `${process.env.NEXT_PUBLIC_API_URL}/subscription/cancel`
            }, {
                headers: {
                    'x-api-key': NOWPAYMENTS_API_KEY
                }
            });
            return response.data.invoice_url;
            */

            // For now, return a simulated URL that the user can see
            // In a real implementation, uncomment the above block
            return `https://nowpayments.io/payment/?iid=mock_${orderId}`;

        } catch (error) {
            console.error('Payment creation failed:', error);
            throw new Error('Failed to create payment invoice');
        }
    }
};
