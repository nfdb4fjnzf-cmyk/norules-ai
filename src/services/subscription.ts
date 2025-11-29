import api from './api';

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
        const res = await api.get('/subscription/manage');
        if (res.data.success) {
            return res.data.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
    }
};
