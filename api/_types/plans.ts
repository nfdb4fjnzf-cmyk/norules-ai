export type PlanType = 'free' | 'light' | 'medium' | 'enterprise';
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
        id: 'light',
        name: '輕量版 Light',
        description: '適合初學者',
        monthlyPrice: 5,
        quarterlyPrice: 13.5, // 5 * 3 * 0.9
        yearlyPrice: 51,      // 5 * 12 * 0.85
        dailyLimit: 5,
        monthlyCredits: 500, // ~16.5 USD value
        features: ['每月 500 點數', '基礎客服', '標準速度']
    },
    {
        id: 'medium',
        name: '中量版 Medium',
        description: '適合成長中的使用者',
        monthlyPrice: 15,
        quarterlyPrice: 40.5, // 15 * 3 * 0.9
        yearlyPrice: 153,     // 15 * 12 * 0.85
        dailyLimit: 30,
        monthlyCredits: 2000, // ~66 USD value
        features: ['每月 2000 點數', '優先客服', '快速速度', '可使用所有模型']
    },
    {
        id: 'enterprise',
        name: '企業版 Enterprise',
        description: '適合大型需求',
        monthlyPrice: 30,
        quarterlyPrice: 81,   // 30 * 3 * 0.9
        yearlyPrice: 306,     // 30 * 12 * 0.85
        dailyLimit: -1,       // Unlimited
        monthlyCredits: 10000, // Effectively unlimited for normal use
        features: ['每月 10,000 點數', '24/7 客服', '最高速度', '客製化方案']
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
