import { db } from '../_config/firebaseAdmin.js';
import admin from 'firebase-admin';
import { userService } from './userService.js';
import { couponService } from './couponService.js';
import { calculatePrice } from '../_types/plans.js';

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
    // Coupon fields
    couponCode?: string;
    originalPrice?: number;
    discountAmount?: number;
    finalPrice?: number;
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
        billingCycle: 'monthly' | 'quarterly' | 'yearly',
        couponCode?: string
    ): Promise<void> => {
        // 1. Calculate Period End
        const now = admin.firestore.Timestamp.now();
        const startDate = now;
        let endDate = new Date();

        if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
        else if (billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
        else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

        const currentPeriodEnd = admin.firestore.Timestamp.fromDate(endDate);

        // 2. Calculate Price & Apply Coupon
        let originalPrice = calculatePrice(planId, billingCycle);
        let discountAmount = 0;
        let finalPrice = originalPrice;

        if (couponCode) {
            const coupon = await couponService.validateCoupon(couponCode, planId);
            finalPrice = couponService.calculateDiscount(originalPrice, coupon);
            discountAmount = originalPrice - finalPrice;

            // Redeem coupon
            await couponService.redeemCoupon(couponCode);
        }

        // 3. Check existing subscription
        const existingSub = await subscriptionService.getSubscription(userId);

        const subData: Partial<Subscription> = {
            userId,
            planId,
            billingCycle,
            status: 'active',
            startDate: existingSub ? existingSub.startDate : startDate,
            currentPeriodEnd,
            cancelAtPeriodEnd: false,
            updatedAt: now,
            couponCode: couponCode || null,
            originalPrice,
            discountAmount,
            finalPrice
        };

        if (!existingSub) {
            (subData as any).createdAt = now;
        }

        // 4. Save to Firestore
        const batch = db.batch();

        let subRef;
        if (existingSub) {
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

        // 5. Update User Profile (Sync Plan)
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            plan: planId,
            subscriptionStatus: 'active'
        });

        // 6. Log Event
        const eventRef = db.collection('subscription_events').doc();
        batch.set(eventRef, {
            userId,
            type: existingSub ? 'UPDATE' : 'CREATE',
            planId,
            billingCycle,
            couponCode: couponCode || null,
            originalPrice,
            discountAmount,
            finalPrice,
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

        await subRef.update({
            status: 'canceled',
            cancelAtPeriodEnd: true,
            updatedAt: admin.firestore.Timestamp.now()
        });
    }
};
