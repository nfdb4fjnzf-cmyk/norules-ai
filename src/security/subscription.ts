import { RequestContext } from './context';
import { PLANS } from '../services/firestore/plans';

export const checkSubscription = async (context: RequestContext): Promise<boolean> => {
    const { plan } = context;
    // Basic check if plan exists in our definitions
    const planDef = PLANS.find(p => p.id === plan);
    return !!planDef;
};

export const validateSubscriptionChange = (currentPlanId: string, newPlanId: string): { allowed: boolean; message?: string } => {
    // Rule 1: Free -> Any Plan is generally allowed
    // Rule 2: Paid -> Paid is allowed
    // Rule 3: API Key Mode -> Any Plan is allowed

    // Specific Forbidden Rule: Free -> External API Key Mode (if strictly interpreted as "Free 方案不可切換至含外部 API Key 的方案")
    // However, usually upgrading from Free to a paid plan that supports API Key is the goal.
    // The user requirement says: "Free -> External API Key Mode 禁止" (Free 方案不可切換至含外部 API Key 的方案)
    // This phrasing is slightly ambiguous. It likely means "You cannot use External API Key features WHILE on Free plan",
    // OR "You cannot switch DIRECTLY from Free to a plan that ONLY offers API Key mode without paying?"
    // Let's look at the requirement: "Free 方案不可切換至含外部 API Key 的方案"
    // And "Free 方案將扣點且不可使用外部 API Key"
    // Actually, usually you UPGRADE to get API Key access.
    // Wait, the requirement says: "Free -> External API Key Mode 禁止".
    // Let's assume this refers to the specific 'apikey' plan or any plan with external key support?
    // Re-reading: "Free -> External API Key Mode 禁止".
    // If 'apikey' is a specific plan ID, then:

    if (currentPlanId === 'free' && newPlanId === 'apikey') {
        return { allowed: false, message: 'Free 方案不可切換至含外部 API Key 的方案' };
    }

    return { allowed: true };
};

export const checkDailyQuota = async (userId: string): Promise<boolean> => {
    // TODO: Implement logic
    return false;
};

export const decreaseQuota = async (userId: string): Promise<void> => {
    // TODO: Implement logic
    return Promise.resolve();
};
