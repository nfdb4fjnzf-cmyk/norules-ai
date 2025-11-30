export type PlanType = 'free' | 'lite' | 'standard' | 'enterprise';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface Plan {
    id: PlanType;
    name: string;
    description: string;
    monthlyPrice: number;
    quarterlyPrice: number;
    yearlyPrice: number;
    dailyLimit: number; // -1 for unlimited
    features: string[];
}

export const PLANS: Plan[] = [
    {
        id: 'lite',
        name: 'Lite',
        description: 'Perfect for beginners',
        monthlyPrice: 5,
        quarterlyPrice: 13.5, // 5 * 3 * 0.9
        yearlyPrice: 51,      // 5 * 12 * 0.85
        dailyLimit: 5,
        features: ['5 Daily Requests', 'Basic Support', 'Standard Speed']
    },
    {
        id: 'standard',
        name: 'Standard',
        description: 'For growing businesses',
        monthlyPrice: 15,
        quarterlyPrice: 40.5, // 15 * 3 * 0.9
        yearlyPrice: 153,     // 15 * 12 * 0.85
        dailyLimit: 30,
        features: ['30 Daily Requests', 'Priority Support', 'Fast Speed', 'All Models Access']
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For large scale needs',
        monthlyPrice: 30,
        quarterlyPrice: 81,   // 30 * 3 * 0.9
        yearlyPrice: 306,     // 30 * 12 * 0.85
        dailyLimit: -1,       // Unlimited
        features: ['Unlimited Requests', '24/7 Support', 'Max Speed', 'Custom Solutions']
    }
];

export const calculatePrice = (planId: PlanType, cycle: BillingCycle): number => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return 0;

    switch (cycle) {
        case 'quarterly': return plan.quarterlyPrice;
        case 'yearly': return plan.yearlyPrice;
        default: return plan.monthlyPrice;
    }
};

export const calculateRenewalDate = (cycle: BillingCycle): Date => {
    const date = new Date();
    switch (cycle) {
        case 'monthly': date.setDate(date.getDate() + 30); break;
        case 'quarterly': date.setDate(date.getDate() + 90); break;
        case 'yearly': date.setDate(date.getDate() + 365); break;
    }
    return date;
};
