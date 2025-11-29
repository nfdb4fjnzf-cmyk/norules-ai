export interface QuotaUsage {
    used: number;
    limit: number;
    remaining: number;
}

export interface SubscriptionInfo {
    plan: string;
    dailyLimit: number;
    usage: QuotaUsage;
}

export const getSubscriptionOverview = async (): Promise<SubscriptionInfo | null> => {
    try {
        const res = await fetch('/api/subscription/manage');
        if (!res.ok) throw new Error('Failed to fetch subscription');
        const data = await res.json();
        if (data.success) {
            return data.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
    }
};
