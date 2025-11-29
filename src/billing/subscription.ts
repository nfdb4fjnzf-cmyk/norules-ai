import { RequestContext } from '../security/context';

export function isTrialActive(context: RequestContext): boolean {
    // Placeholder: Check if user is in trial period
    return true;
}

export function isSubscriptionValid(context: RequestContext): boolean {
    // Placeholder: Check if subscription is active/expired
    return true;
}

export function getPlanLimit(plan: string): number {
    switch (plan) {
        case 'free': return 5;
        case 'lite': return 5;
        case 'standard': return 30;
        case 'pro': return Infinity;
        case 'unlimited': return Infinity;
        default: return 5;
    }
}
