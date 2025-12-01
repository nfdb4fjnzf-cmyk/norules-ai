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

                    // Fetch current subscription to record history
                    const subRef = db.collection('subscriptions').doc(userId);
                    const subDoc = await subRef.get();
                    const oldData = subDoc.exists ? subDoc.data() : null;

                    // V3: Record Upgrade History
                    if (oldData && oldData.plan !== plan.id) {
                        await subRef.collection('history').add({
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            oldPlan: oldData.plan,
                            newPlan: plan.id,
                            chargeAmount: req.body.price_amount,
                            action: 'upgrade'
                        });
                    }

                    // Update User Subscription in Firestore (V3 Spec)
                    // Spec: subscriptions collection with plan, startDate, endDate, nextBillingDate, isActive, upgradeHistory
                    // Note: upgradeHistory is requested as a field, but subcollection is cleaner for scalability.
                    // I'll add it as an array field too if strictly requested, but subcollection is better.
                    // The spec says: "upgradeHistory += timestamp, oldPlan, newPlan, chargeAmount".
                    // I will use `arrayUnion` for the field to comply with spec.

                    const historyEntry = {
                        timestamp: new Date().toISOString(),
                        oldPlan: oldData?.plan || 'free',
                        newPlan: plan.id,
                        chargeAmount: req.body.price_amount
                    };

                    await subRef.set({
                        userId: userId,
                        plan: plan.id,
                        billingCycle: cycle,
                        isActive: true, // Spec: isActive
                        status: 'active', // Keep for backward compatibility
                        startDate: new Date().toISOString(),
                        endDate: endDate.toISOString(),
                        nextBillingDate: endDate.toISOString(), // Spec: nextBillingDate
                        provider: 'nowpayments',
                        transactionId: req.body.payment_id,
                        amountUSD: req.body.price_amount,
                        amountCrypto: req.body.pay_amount,
                        dailyLimit: plan.dailyLimit,
                        upgradeHistory: admin.firestore.FieldValue.arrayUnion(historyEntry)
                    }, { merge: true });

                    // Update User Profile (Legacy/Redundant but good for quick access)
                    await userService.updateUserProfile(userId, {
                        subscription: {
                            plan: plan.id,
                            status: 'active',
                            startDate: new Date().toISOString(),
                            endDate: endDate.toISOString()
                        },
                        dailyLimit: plan.dailyLimit
                    });

                    // V3: Grant Monthly Credits (Subscription + Points Model)
                    if (plan.monthlyCredits && plan.monthlyCredits > 0) {
                        // We use addCredits which handles transaction internally.
                        // Note: addCredits applies multiplier logic for refunds, but here we want to add RAW credits.
                        // The current addCredits implementation applies multiplier! This is problematic for "Granting" credits.
                        // We should probably use a direct update or a new method 'grantCredits'.
                        // However, let's look at addCredits again.
                        // It multiplies by plan discount. That's for "Refund".
                        // For "Granting", we want exact amount.
                        // I'll use a direct DB update here to be safe and simple, or I should have updated userService.
                        // Let's do direct DB update for now to avoid breaking userService signature if it's used elsewhere.
                        // Actually, I can just update the user doc directly since I have the reference logic nearby?
                        // No, let's use a transaction or simple update.

                        const userRef = db.collection('users').doc(userId);
                        await db.runTransaction(async (t) => {
                            const doc = await t.get(userRef);
                            const currentCredits = doc.data()?.credits || 0;
                            t.update(userRef, {
                                credits: currentCredits + plan.monthlyCredits,
                                updatedAt: new Date().toISOString()
                            });
                        });
                        console.log(`Granted ${plan.monthlyCredits} credits to ${userId} for ${plan.id} plan.`);
                    }
                }
            }
        }

        return res.status(200).json({ message: 'OK' });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
