import { userService } from '../_services/userService.js';
import { db } from '../_config/firebaseAdmin.js';
import { PLANS } from '../_types/plans.js';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
        if (!ipnSecret) {
            console.error('IPN Secret missing');
            return res.status(500).json({ message: 'Server Configuration Error' });
        }

        const signature = req.headers['x-nowpayments-sig'];
        if (!signature) {
            return res.status(400).json({ message: 'Missing Signature' });
        }

        // Verify Signature
        // Sort keys and create string
        const sortedKeys = Object.keys(req.body).sort();
        const jsonString = sortedKeys.map(key => `${key}=${req.body[key]}`).join('&');

        const hmac = crypto.createHmac('sha512', ipnSecret);
        hmac.update(jsonString);
        const calculatedSignature = hmac.digest('hex');

        if (calculatedSignature !== signature) {
            console.error('Invalid Signature');
            return res.status(400).json({ message: 'Invalid Signature' });
        }

        const { payment_status, order_id, pay_amount } = req.body;

        if (payment_status === 'finished' || payment_status === 'confirmed') {
            // Extract User ID from Order ID (SUB-UID-TIMESTAMP)
            const parts = order_id.split('-');
            if (parts.length >= 2) {
                const userId = parts[1];

                // Determine Plan based on Amount (Simple logic, or store order in DB first)
                // Here we try to match amount to plan price
                const plan = PLANS.find(p => Math.abs(p.price - parseFloat(pay_amount)) < 1.0); // Allow small diff for crypto fluctuation if any, though usually exact

                if (plan && userId) {
                    // Update User Subscription
                    await db.collection('subscriptions').doc(userId).set({
                        plan: plan.id,
                        status: 'active',
                        startDate: admin.firestore.FieldValue.serverTimestamp(),
                        endDate: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                        provider: 'nowpayments',
                        transactionId: req.body.payment_id
                    });

                    // Update User Profile Mode if needed
                    await userService.updateUserProfile(userId, {
                        subscription: {
                            plan: plan.id,
                            status: 'active',
                            startDate: new Date().toISOString(),
                            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                        }
                    });
                }
            }
        }

        return res.status(200).json({ message: 'OK' });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
