import { db } from '../_config/firebaseAdmin.js';
import { PLANS, PlanType } from '../_types/plans.js';

export interface SubscriptionInfo {
    plan: PlanType;
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
    daily_limit: number; // Keep snake_case for frontend compatibility if needed, or switch to camelCase? Frontend likely expects snake_case based on previous code. Let's keep daily_limit mapping.
    dailyLimit?: number; // V3 uses camelCase
    startDate?: string;
    endDate?: string;
    nextBillingDate?: string;
    status: 'active' | 'canceled' | 'past_due';
    upgradeHistory?: any[];
    provider?: string;
}

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
    // V3: Read from root 'subscriptions' collection
    const doc = await db.collection('subscriptions').doc(userId).get();

    if (!doc.exists) {
        // Fallback to Free/Lite default
        const defaultPlan = PLANS.find(p => p.id === 'light') || PLANS[0];
        return {
            plan: 'free', // Default to free if no sub
            billingCycle: 'monthly',
            daily_limit: 5,
            dailyLimit: 5,
            status: 'active'
        };
    }

    const data = doc.data();
    return {
        plan: data?.plan || 'free',
        billingCycle: data?.billingCycle || 'monthly',
        daily_limit: data?.dailyLimit || 5, // Map camel to snake for legacy support
        dailyLimit: data?.dailyLimit || 5,
        startDate: data?.startDate,
        endDate: data?.endDate,
        nextBillingDate: data?.nextBillingDate || data?.endDate, // Fallback
        status: data?.status || 'active',
        upgradeHistory: data?.upgradeHistory || [],
        provider: data?.provider
    };
}

export async function upgradePlan(userId: string, newPlan: PlanType, billingCycle: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): Promise<void> {
    // This function might be deprecated in favor of payment webhook, but keeping for manual overrides
    const planConfig = PLANS.find(p => p.id === newPlan);
    if (!planConfig) throw new Error('Invalid plan');

    let durationDays = 30;
    if (billingCycle === 'quarterly') durationDays = 90;
    if (billingCycle === 'yearly') durationDays = 365;

    const now = new Date();
    const endDate = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));

    const subscription = {
        plan: newPlan,
        billingCycle: billingCycle,
        dailyLimit: planConfig.dailyLimit,
        status: 'active',
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        nextBillingDate: endDate.toISOString(),
        updatedAt: now.toISOString()
    };

    await db.collection('subscriptions').doc(userId).set(subscription, { merge: true });
}
