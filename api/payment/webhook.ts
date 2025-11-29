import { db } from '../_config/firebaseAdmin';
import admin from 'firebase-admin';
import * as crypto from 'crypto';
import { errorResponse } from '../_utils/responseFormatter';

// Webhook handler needs to read raw body for signature verification if possible,
// but in Vercel/Next.js Edge, req.json() is standard.
// NOWPayments sends JSON body, so JSON.stringify(req.body) should match if keys are ordered same?
// Actually, standard practice is to use the raw body buffer.
// However, in Edge Runtime, we might rely on the parsed JSON if we trust the order or if we can get text.

export const config = {
    runtime: 'nodejs', // Use Node.js runtime for crypto and admin SDK
};

export default async function handler(req: any, res: any) {
    // Note: This handler uses Vercel/Next.js API Routes (Node.js) signature: (req, res)
    // If using Edge runtime, signature is (req: Request).
    // Given we need firebase-admin (Node.js), we stick to Node.js runtime.

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const signature = req.headers['x-nowpayments-sig'];
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret) {
        console.error('NOWPAYMENTS_IPN_SECRET is missing');
        return res.status(500).send('Server Configuration Error');
    }

    // Sort keys to match NOWPayments signature generation (alphabetical order)
    // NOWPayments doc says: "sort all the parameters in the request body alphabetically"
    const sortObject = (obj: any) => {
        return Object.keys(obj).sort().reduce((result: any, key: any) => {
            result[key] = obj[key];
            return result;
        }, {});
    };

    const sortedBody = sortObject(req.body);
    const rawBody = JSON.stringify(sortedBody);

    const expected = crypto
        .createHmac('sha512', ipnSecret)
        .update(rawBody)
        .digest('hex');

    if (signature !== expected) {
        console.warn('Invalid Signature', { received: signature, expected });
        // return res.status(403).send('Invalid Signature');
        // For debugging, we might want to log more but fail safely.
        // If strictly enforcing:
        return res.status(403).send('Invalid Signature');
    }

    const data = req.body;
    console.log('Payment Webhook Received:', data.payment_id, data.payment_status);

    if (data.payment_status !== 'finished' && data.payment_status !== 'confirmed') {
        return res.status(200).send('OK (Not Finished)');
    }

    const userId = data.order_id;
    const amount = Number(data.price_amount);

    let plan = null;
    let limit = 0;
    let points = 0;

    // Mapping logic as per user request
    if (amount === 5) { plan = 'lite'; limit = 5; points = 50; } // Basic -> Lite
    else if (amount === 10) { plan = 'pro'; limit = 30; points = 150; }
    else if (amount === 30) { plan = 'ultra'; limit = 100; points = 1000; } // Ultimate -> Ultra (Limit 100 per Plans.ts)
    else {
        console.warn('Unknown payment amount:', amount);
        return res.status(200).send('Unknown Amount');
    }

    try {
        const userRef = db.collection('users').doc(userId);

        // Use atomic update
        await userRef.set({
            subscription: {
                plan: plan,
                status: 'active',
                updatedAt: new Date().toISOString()
            },
            // Update daily limit in subscription subcollection or user doc?
            // The system seems to use `users/{uid}/subscription/current` for detailed sub info.
            // But the user provided code updates `users/{uid}` directly.
            // I will update BOTH to ensure consistency across the hybrid architecture.

            // 1. Update User Profile (for quick access)
            credits: admin.firestore.FieldValue.increment(points),
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 2. Update Subscription Document (System Source of Truth)
        await db.collection('users').doc(userId).collection('subscription').doc('current').set({
            plan: plan,
            billing_cycle: 'monthly', // Default to monthly for these fixed amounts
            daily_limit: limit,
            daily_used: 0,
            next_billing_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: 'active',
            updated_at: Date.now()
        }, { merge: true });

        console.log(`User ${userId} upgraded to ${plan} with ${points} points.`);
        return res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook Database Error:', error);
        return res.status(500).send('Internal Server Error');
    }
}
