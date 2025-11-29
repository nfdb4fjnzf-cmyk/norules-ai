import { db } from '../../config/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PLANS, PlanType } from './plans';

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
    const subRef = doc(db, 'users', userId, 'subscription', SUBSCRIPTION_DOC_PATH);
    const subDoc = await getDoc(subRef);

    if (!subDoc.exists()) {
        // Check User Profile for Trial Status (Ch.4)
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.subscription?.status === 'trial') {
                return {
                    plan: 'free',
                    billing_cycle: 'monthly',
                    daily_limit: 5, // Free/Trial Limit
                    daily_used: 0,
                    next_billing_date: new Date(userData.subscription.trialEndsAt).getTime(),
                    status: 'active', // Active trial
                    created_at: Date.now(),
                    updated_at: Date.now()
                };
            }
        }

        // Default to Lite plan (monthly) if no subscription record and no trial
        const defaultPlan = PLANS.find(p => p.id === 'lite') || PLANS[0];

        return {
            plan: 'lite',
            billing_cycle: 'monthly',
            daily_limit: 5, // Ch 62: Lite = 5/day
            daily_used: 0,
            next_billing_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: 'active',
            created_at: Date.now(),
            updated_at: Date.now()
        };
    }

    return subDoc.data() as SubscriptionInfo;
}

export async function updateSubscription(userId: string, data: Partial<SubscriptionInfo>): Promise<void> {
    const updateData = {
        ...data,
        updated_at: Date.now()
    };
    const subRef = doc(db, 'users', userId, 'subscription', SUBSCRIPTION_DOC_PATH);
    await setDoc(subRef, updateData, { merge: true });
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
        daily_used: 0, // Reset on upgrade
        next_billing_date: Date.now() + (durationDays * 24 * 60 * 60 * 1000),
        status: 'active',
        created_at: Date.now(), // Or preserve original created_at if we read first
        updated_at: Date.now()
    };

    const subRef = doc(db, 'users', userId, 'subscription', SUBSCRIPTION_DOC_PATH);
    await setDoc(subRef, subscription);
}

export function isSubscriptionActive(sub: SubscriptionInfo): boolean {
    return sub.status === 'active' && sub.next_billing_date > Date.now();
}
