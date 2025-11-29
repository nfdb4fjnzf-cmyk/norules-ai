import { RequestContext } from '../security/context';

export function calculatePointCost(tokenUsage: number): number {
    return Math.ceil(tokenUsage * 1.0);
}

export function hasEnoughPoints(context: RequestContext, cost: number): boolean {
    return context.points >= cost;
}

export function deductPoints(context: RequestContext, cost: number): void {
    if (context.points >= cost) {
        context.points -= cost;
    }
    // In a real implementation, this would update the database
}
