import { db } from '../_config/firebaseAdmin.js';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { userService } from './userService.js';
import { couponService } from './couponService.js';
import { calculatePrice, PLANS } from '../_types/plans.js';

export interface Subscription {
    userId: string;
    planId: 'free' | 'lite' | 'pro' | 'ultra';
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
    status: 'active' | 'canceled' | 'expired';
    startDate: Timestamp;
    currentPeriodEnd: Timestamp;
    cancelAtPeriodEnd: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    // Coupon fields
    couponCode?: string | null;
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
     * Calculate Upgrade Price & Check Downgrade
     */
    calculateUpgrade: async (
        userId: string,
        newPlanId: 'lite' | 'pro' | 'ultra',
        newCycle: 'monthly' | 'quarterly' | 'yearly'
    ): Promise<{
        allowed: boolean;
        reason?: string;
        finalPrice: number;
        originalPrice: number;
        remainingValue: number;
        isUpgrade: boolean;
    }> => {
        const currentSub = await subscriptionService.getSubscription(userId);
        const newPrice = calculatePrice(newPlanId, newCycle);
        const now = new Date();

        // Check if subscription is effectively active (active status OR canceled but not expired)
        // If it's null, or expired, we treat it as a new subscription (allowed).
        let isEffectivelyActive = false;
        if (currentSub) {
            const periodEnd = currentSub.currentPeriodEnd.toDate();
            if (periodEnd > now) {
                isEffectivelyActive = true;
            }
        }

        if (!currentSub || !isEffectivelyActive) {
            return {
                allowed: true,
                finalPrice: newPrice,
                originalPrice: newPrice,
                remainingValue: 0,
                isUpgrade: false
            };
        }

        // Check Plan Levels
        const levels = { 'free': 0, 'lite': 1, 'pro': 2, 'ultra': 3 };
        const oldLevel = levels[currentSub.planId] || 0;
        const newLevel = levels[newPlanId];

        // Block Downgrade if active
        if (newLevel < oldLevel) {
            return {
                allowed: false,
                reason: `Cannot downgrade from ${currentSub.planId} to ${newPlanId} while subscription is active. Please wait until the current period ends.`,
                finalPrice: newPrice,
                originalPrice: newPrice,
                remainingValue: 0,
                isUpgrade: false
            };
        }

        // Calculate Proration for Upgrade or Same Level (Cycle Change)
        // 'now' is already defined above
        const periodEnd = currentSub.currentPeriodEnd.toDate();

        if (now >= periodEnd) {
            return {
                allowed: true,
                finalPrice: newPrice,
                originalPrice: newPrice,
                remainingValue: 0,
                isUpgrade: false // Treated as new sub
            };
        }

        const remainingTime = periodEnd.getTime() - now.getTime();
        const remainingDays = remainingTime / (1000 * 60 * 60 * 24);

        // Calculate Daily Rate of OLD plan
        // We need to know the old price to calculate rate. 
        // Best effort: use current catalog price for old plan/cycle.
        const oldPlanPrice = calculatePrice(currentSub.planId, currentSub.billingCycle);
        let cycleDays = 30;
        if (currentSub.billingCycle === 'quarterly') cycleDays = 90;
        if (currentSub.billingCycle === 'yearly') cycleDays = 365;

        const dailyRate = oldPlanPrice / cycleDays;
        const remainingValue = Math.max(0, remainingDays * dailyRate);

        const finalPrice = Math.max(0, newPrice - remainingValue);

        return {
            allowed: true,
            finalPrice,
            originalPrice: newPrice,
            remainingValue,
            isUpgrade: true
        };
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
        const now = Timestamp.now();
        // For upgrades/new subs, start date is NOW.
        const startDate = now;
        let endDate = new Date();

        if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
        else if (billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
        else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

        const currentPeriodEnd = Timestamp.fromDate(endDate);

        // 2. Calculate Price & Apply Coupon
        // Note: This logic here is for the RECORDING of the subscription. 
        // The actual charge amount was calculated in the API endpoint.
        // We re-calculate here to store consistent data, but we should respect the upgrade logic.

        // However, since this function is called by webhook (after payment), 
        // we should ideally use the logic that matches what was paid.
        // For simplicity, we will re-run calculateUpgrade here to get the 'discountAmount' correct for record keeping.

        const upgradeCheck = await subscriptionService.calculateUpgrade(userId, planId, billingCycle);

        let originalPrice = upgradeCheck.originalPrice;
        let discountAmount = upgradeCheck.remainingValue; // Proration is a discount
        let finalPrice = upgradeCheck.finalPrice;

        if (couponCode) {
            const coupon = await couponService.validateCoupon(couponCode, planId);
            const couponDiscount = couponService.calculateDiscount(finalPrice, coupon); // Apply coupon on top of prorated price? Or original? Usually on final.
            // Let's assume coupon applies to the amount TO BE PAID.
            const priceAfterCoupon = couponService.calculateDiscount(finalPrice, coupon);
            discountAmount += (finalPrice - priceAfterCoupon);
            finalPrice = priceAfterCoupon;

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
            startDate: startDate, // Always reset start date for new period/upgrade
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

        // 5. Update User Profile (Sync Plan & Credits)
        const selectedPlan = PLANS.find(p => p.id === planId);
        const creditsToAdd = selectedPlan?.monthlyCredits || 0;

        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            'subscription.plan': planId,
            'subscription.status': 'active',
            credits: FieldValue.increment(creditsToAdd)
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
            createdAt: now,
            creditsAdded: creditsToAdd,
            proration: upgradeCheck.isUpgrade ? upgradeCheck.remainingValue : 0
        });

        await batch.commit();

        // 7. Log Transaction for History
        const { usageService } = await import('./usageService.js');
        await usageService.logTransaction(userId, 'SUBSCRIPTION', creditsToAdd, {
            description: `Subscription: ${planId} (${billingCycle})`,
            price: finalPrice,
            currency: 'USD'
        });
    },

    /**
     * Cancel Subscription
     * (Sets cancelAtPeriodEnd = true)
     */
    cancelSubscription: async (userId: string): Promise<Date> => {
        const snapshot = await db.collection('subscriptions')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) throw new Error('No active subscription found');

        const subDoc = snapshot.docs[0];
        const subData = subDoc.data() as Subscription;
        const currentPeriodEnd = subData.currentPeriodEnd.toDate();

        await subDoc.ref.update({
            status: 'canceled',
            cancelAtPeriodEnd: true,
            updatedAt: Timestamp.now()
        });

        return currentPeriodEnd;
    }
};
