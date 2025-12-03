export type PlanType = 'free' | 'lite' | 'pro' | 'ultra';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface Plan {
    id: PlanType;
    name: string;
    description: string;
    monthlyPrice: number;
    quarterlyPrice: number;
    yearlyPrice: number;
    dailyLimit: number; // -1 for unlimited
    monthlyCredits: number; // New: Credits granted per month
    features: string[];
}

export const PLANS: Plan[] = [
    {
        id: 'lite',
        name: 'Lite',
        description: 'Perfect for starters',
        monthlyPrice: 5,
        quarterlyPrice: 13.5, // 5 * 3 * 0.9
        yearlyPrice: 51,      // 5 * 12 * 0.85
        dailyLimit: 20,       // Increased from 5 based on "20% off points" logic? No, let's stick to reasonable limits.
        monthlyCredits: 500,
        features: ['500 Monthly Credits', 'Basic Support', 'Standard Speed', '20% Point Discount']
    },
    {
        id: 'pro',
        name: 'Pro',
        description: 'For growing needs',
        monthlyPrice: 10,
        quarterlyPrice: 27,   // 10 * 3 * 0.9
        yearlyPrice: 102,     // 10 * 12 * 0.85
        dailyLimit: 100,
        monthlyCredits: 2000,
        features: ['2000 Monthly Credits', 'Priority Support', 'Fast Speed', '40% Point Discount']
    },
    {
        id: 'ultra',
        name: 'Ultra',
        description: 'For power users',
        monthlyPrice: 30,
        quarterlyPrice: 81,   // 30 * 3 * 0.9
        yearlyPrice: 306,     // 30 * 12 * 0.85
        dailyLimit: -1,       // Unlimited
        monthlyCredits: 10000,
        features: ['10,000 Monthly Credits', '24/7 Support', 'Max Speed', '60% Point Discount']
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
