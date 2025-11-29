export type PlanType = 'free' | 'lite' | 'pro' | 'ultra';

export interface Plan {
    id: PlanType;
    name: string;
    price: number;
    dailyLimit: number;
    features: string[];
}

export const PLANS: Plan[] = [
    {
        id: 'lite',
        name: 'Lite',
        price: 5,
        dailyLimit: 5,
        features: ['5 Daily Requests', 'Internal & External Mode', 'Text/Image/URL/Video Support', 'Over-limit uses Credits']
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 10,
        dailyLimit: 30,
        features: ['30 Daily Requests', 'All Models Access', 'Internal & External Mode', 'Over-limit uses Credits']
    },
    {
        id: 'ultra',
        name: 'Ultra',
        price: 30,
        dailyLimit: 100,
        features: ['100 Daily Requests', 'Priority Support', 'All Models Access', 'Over-limit uses Credits']
    }
];

export async function getSubscriptionPlans(): Promise<Plan[]> {
    // In the future, fetch from Firestore 'subscriptionPlans' collection
    return PLANS;
}
