import { db } from '../_config/firebaseAdmin';
import { PLANS, PlanType } from '../../src/services/firestore/plans';

export interface SubscriptionInfo {
    plan: PlanType;
    billing_cycle: 'monthly' | 'quarterly' | 'annual';
    daily_limit: number;
    daily_used: number;
    next_billing_date: number; // Timestamp
    status: 'active' | 'canceled' | 'past_due';
    created_at: number;
    updated_at: number;
}

const SUBSCRIPTION_DOC_PATH = 'current';

export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
    const doc = await db.collection('users').doc(userId).collection('subscription').doc(SUBSCRIPTION_DOC_PATH).get();

    if (!doc.exists) {
        const defaultPlan = PLANS.find(p => p.id === 'lite') || PLANS[0];
        return {
            plan: 'lite',
            billing_cycle: 'monthly',
            daily_limit: 5,
            daily_used: 0,
            next_billing_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: 'active',
            created_at: Date.now(),
            updated_at: Date.now()
        };
    }

    return doc.data() as SubscriptionInfo;
}

export async function upgradePlan(userId: string, newPlan: PlanType, billingCycle: 'monthly' | 'quarterly' | 'annual' = 'monthly'): Promise<void> {
    const planConfig = PLANS.find(p => p.id === newPlan);
    if (!planConfig) throw new Error('Invalid plan');

    let durationDays = 30;
    if (billingCycle === 'quarterly') durationDays = 90;
    if (billingCycle === 'annual') durationDays = 365;

    const subscription: SubscriptionInfo = {
        plan: newPlan,
        billing_cycle: billingCycle,
        daily_limit: planConfig.dailyLimit,
        daily_used: 0,
        next_billing_date: Date.now() + (durationDays * 24 * 60 * 60 * 1000),
        status: 'active',
        created_at: Date.now(),
        updated_at: Date.now()
    };

    await db.collection('users').doc(userId).collection('subscription').doc(SUBSCRIPTION_DOC_PATH).set(subscription);
}
