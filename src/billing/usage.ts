export interface DailyUsage {
    date: string;
    count: number;
}

// In-memory storage
const usageStore: Record<string, DailyUsage> = {};

export function getDailyUsage(userId: string): number {
    const today = new Date().toISOString().split('T')[0];
    const record = usageStore[userId];
    if (record && record.date === today) {
        return record.count;
    }
    return 0;
}

export function incrementDailyUsage(userId: string): void {
    const today = new Date().toISOString().split('T')[0];
    const record = usageStore[userId];
    if (record && record.date === today) {
        record.count++;
    } else {
        usageStore[userId] = { date: today, count: 1 };
    }
}

export function isDailyLimitExceeded(plan: string, usageCount: number): boolean {
    let limit = 5;
    switch (plan) {
        case 'free':
            limit = 5;
            break;
        case 'lite':
            limit = 5;
            break;
        case 'standard':
            limit = 30;
            break;
        case 'pro':
        case 'unlimited':
            return false; // Infinity
        default:
            limit = 5;
    }
    return usageCount >= limit;
}
