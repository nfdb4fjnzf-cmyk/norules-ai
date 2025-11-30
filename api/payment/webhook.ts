import { userService } from '../_services/userService.js';
import { db } from '../_config/firebaseAdmin.js';
import { PLANS } from '../_types/plans.js';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

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
            // Extract User ID, Plan, Cycle from Order ID (SUB-UID-PLAN-CYCLE-TIMESTAMP)
            // Example: SUB-user123-lite-monthly-1712345678
            const parts = order_id.split('-');

            // We need to be careful if UID contains hyphens. 
            // Assuming UID is the second part, but if UID has hyphens, this split is risky.
            // Better strategy: The format is fixed: SUB-{uid}-{plan}-{cycle}-{timestamp}
            // Plan is known (lite/standard/enterprise) -> no hyphens
            // Cycle is known (monthly/quarterly/yearly) -> no hyphens
            // Timestamp is digits -> no hyphens
            // So we can pop from the end.

            if (parts.length >= 5) {
                const timestamp = parts.pop();
                const cycle = parts.pop();
                const planId = parts.pop();
                // The rest is SUB-{uid}. Remove SUB-
                const uidParts = parts.slice(1);
                const userId = uidParts.join('-');

                const plan = PLANS.find(p => p.id === planId);

                if (plan && userId && (cycle === 'monthly' || cycle === 'quarterly' || cycle === 'yearly')) {

                    // Calculate End Date
                    const endDate = new Date();
                    if (cycle === 'monthly') endDate.setDate(endDate.getDate() + 30);
                    else if (cycle === 'quarterly') endDate.setDate(endDate.getDate() + 90);
                    else if (cycle === 'yearly') endDate.setDate(endDate.getDate() + 365);

                    // Update User Subscription in Firestore
                    await db.collection('subscriptions').doc(userId).set({
                        plan: plan.id,
                        billingCycle: cycle,
                        status: 'active',
                        startDate: admin.firestore.FieldValue.serverTimestamp(),
                        endDate: admin.firestore.Timestamp.fromDate(endDate),
                        provider: 'nowpayments',
                        transactionId: req.body.payment_id,
                        amountUSD: req.body.price_amount,
                        amountCrypto: req.body.pay_amount,
                        dailyLimit: plan.dailyLimit
                    });

                    // Update User Profile
                    await userService.updateUserProfile(userId, {
                        subscription: {
                            plan: plan.id,
                            status: 'active',
                            startDate: new Date().toISOString(),
                            endDate: endDate.toISOString()
                        },
                        // Reset credits or update limits if needed
                        dailyLimit: plan.dailyLimit
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
