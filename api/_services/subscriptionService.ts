import { db } from '../_config/firebaseAdmin.js';
import admin from 'firebase-admin';
import { userService } from './userService.js';

export interface Subscription {
    userId: string;
    planId: 'free' | 'lite' | 'pro' | 'ultra';
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
    status: 'active' | 'canceled' | 'expired';
    startDate: admin.firestore.Timestamp;
    currentPeriodEnd: admin.firestore.Timestamp;
    cancelAtPeriodEnd: boolean;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

export const subscriptionService = {
    /**
     * Get active subscription for a user
     */
    getSubscription: async (userId: string): Promise<Subscription | null> => {
        const snapshot = await db.collection('subscriptions')
            .where('userId', '==', userId)
            .where('status', 'in', ['active', 'canceled']) // 'canceled' means active until period end
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        return snapshot.docs[0].data() as Subscription;
    },

    /**
     * Create or Update Subscription
     * (Simulates successful payment)
     */
    createSubscription: async (
        userId: string,
        planId: 'lite' | 'pro' | 'ultra',
        billingCycle: 'monthly' | 'quarterly' | 'yearly'
    ): Promise<void> => {
        // 1. Calculate Period End
        const now = admin.firestore.Timestamp.now();
        const startDate = now;
        let endDate = new Date();

        if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
        else if (billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
        else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

        const currentPeriodEnd = admin.firestore.Timestamp.fromDate(endDate);

        // 2. Check existing subscription
        const existingSub = await subscriptionService.getSubscription(userId);

        const subData: Partial<Subscription> = {
            userId,
            planId,
            billingCycle,
            status: 'active',
            startDate: existingSub ? existingSub.startDate : startDate, // Keep original start date if upgrading? Or reset? Let's reset for simplicity or keep if just plan change.
            // Actually, usually a new plan starts a new period.
            currentPeriodEnd,
            cancelAtPeriodEnd: false,
            updatedAt: now
        };

        if (!existingSub) {
            (subData as any).createdAt = now;
        }

        // 3. Save to Firestore
        const batch = db.batch();

        // Update/Create Subscription Doc
        // We use userId as doc ID for simplicity to ensure 1 sub per user? 
        // Or random ID? Random ID allows history. 
        // Let's use 'subscriptions' collection with random ID, but query by userId.
        // If existing, update it.
        let subRef;
        if (existingSub) {
            // Find the doc ID
            const snapshot = await db.collection('subscriptions')
                .where('userId', '==', userId)
                .where('status', 'in', ['active', 'canceled'])
                .limit(1)
                .get();
            subRef = snapshot.docs[0].ref;
        } else {
            subRef = db.collection('subscriptions').doc();
        }

        batch.set(subRef, subData, { merge: true });

        // 4. Update User Profile (Sync Plan)
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            plan: planId,
            subscriptionStatus: 'active'
        });

        // 5. Log Event
        const eventRef = db.collection('subscription_events').doc();
        batch.set(eventRef, {
            userId,
            type: existingSub ? 'UPDATE' : 'CREATE',
            planId,
            billingCycle,
            createdAt: now
        });

        await batch.commit();
    },

    /**
     * Cancel Subscription
     * (Sets cancelAtPeriodEnd = true)
     */
    cancelSubscription: async (userId: string): Promise<void> => {
        const snapshot = await db.collection('subscriptions')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) throw new Error('No active subscription found');

        const subRef = snapshot.docs[0].ref;
        const subData = snapshot.docs[0].data() as Subscription;

        await subRef.update({
            status: 'canceled', // In Stripe terms, this usually means "active until end". 
            // But here we use 'canceled' status to indicate "will expire".
            // Logic elsewhere should check (status == active OR (status == canceled AND end > now))
            cancelAtPeriodEnd: true,
            updatedAt: admin.firestore.Timestamp.now()
        });

        // We do NOT downgrade user plan immediately. 
        // A cron job should check for expired subscriptions and downgrade them.
        // For now, we leave user.plan as is.
    }
};
