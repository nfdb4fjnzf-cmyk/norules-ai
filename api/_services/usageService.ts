import { db } from '../_config/firebaseAdmin.js';
import { creditService } from './creditService.js';
import admin from 'firebase-admin';

export interface UsageOperation {
    userId: string;
    actionType: 'ANALYZE' | 'LLM_CHAT' | 'IMAGE_GEN' | 'VIDEO_GEN';
    status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    estimated_cost: number;
    actual_cost: number | null;
    reserved_points: number;
    request_payload?: any;
    result_ref?: string | null;
    error_message?: string | null;
    createdAt: string;
    updatedAt: string;
}

export const usageService = {
    /**
     * Start a Usage Operation
     * 1. Create Operation Doc (PENDING)
     * 2. Reserve Credits
     */
    startUsageOperation: async (
        userId: string,
        actionType: UsageOperation['actionType'],
        estimatedCost: number,
        payload: any
    ): Promise<{ operationId: string, reservedPoints: number }> => {

        // 1. Create Operation Doc Reference
        const opRef = db.collection('usage_operations').doc();
        const operationId = opRef.id;

        // 2. Reserve Credits (Atomic)
        // This throws if insufficient funds
        const reservedPoints = await creditService.reserveCredits(userId, estimatedCost, operationId, `Start ${actionType}`);

        // 3. Create Doc
        await opRef.set({
            userId,
            actionType,
            status: 'PENDING',
            estimated_cost: estimatedCost,
            actual_cost: null,
            reserved_points: reservedPoints,
            request_payload: payload,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        });

        return { operationId, reservedPoints };
    },

    /**
     * Finalize a Usage Operation
     * 1. Update Operation Doc (SUCCEEDED/FAILED)
     * 2. Finalize Credits (Refund if needed)
     */
    finalizeUsageOperation: async (
        operationId: string,
        status: 'SUCCEEDED' | 'FAILED',
        actualCost: number = 0,
        resultRef: string | null = null,
        errorMessage: string | null = null
    ): Promise<void> => {
        const opRef = db.collection('usage_operations').doc(operationId);
        const opDoc = await opRef.get();

        if (!opDoc.exists) return;

        const opData = opDoc.data() as UsageOperation;

        // 1. Finalize Credits
        // If failed, actualCost is effectively 0 for the user (full refund), 
        // but we pass 0 here to trigger full refund in creditService logic if we want.
        // Actually creditService.finalizeCredits logic: if !success, refund ALL reserved.
        // If success, refund (reserved - actual).

        // We need to calculate the *discounted* actual cost to pass to finalizeCredits?
        // No, creditService.finalizeCredits takes the *final intended charge*.
        // But wait, reserveCredits calculated the discounted amount.
        // If we pass the base actualCost, creditService needs to know the discount to compare?
        // OR, we re-calculate the discounted actual cost here.
        // Let's assume actualCost passed here is the BASE cost (e.g. 1 credit).

        // To properly handle partial refunds (e.g. estimated 100 tokens, used 50), 
        // we need to know the discount rate used during reservation.
        // But we don't store the rate, only the reserved amount.
        // Simplification: 
        // If status === FAILED, we refund everything.
        // If status === SUCCEEDED, we assume the estimate was accurate for fixed-price items (Image/Video).
        // For LLM (variable), we might need to adjust.
        // For now, let's assume actualCost == estimatedCost for success cases to avoid complex discount reverse-engineering,
        // UNLESS it's a chat where we want to charge exactly for tokens.

        // Let's retrieve the plan from user to re-calculate discount? 
        // Too expensive to read user again.
        // Let's just pass the reserved_points as actual_cost if success, so no refund happens (simple).
        // If we want exact token billing, we'll need to improve this later.

        let finalCharge = opData.reserved_points; // Default to keeping the reserved amount

        // If we really want to support "Pay for what you use" (e.g. estimated 10, used 5):
        // We can't easily do it without knowing the multiplier.
        // For v2.2.0, let's stick to "Fixed Cost" or "Estimate = Final" for simplicity unless failed.

        await creditService.finalizeCredits(
            opData.userId,
            opData.reserved_points,
            finalCharge,
            operationId,
            status === 'SUCCEEDED'
        );

        // 2. Update Doc
        await opRef.update({
            status,
            actual_cost: status === 'SUCCEEDED' ? finalCharge : 0,
            result_ref: resultRef,
            error_message: errorMessage,
            updatedAt: admin.firestore.Timestamp.now()
        });
    },

    /**
     * Calculate Cost Helper
     */
    calculateCost: (actionType: string, model: string, tokensIn = 0, tokensOut = 0): number => {
        if (actionType === 'image') return 30;
        if (actionType === 'video') return 60;
        if (actionType === 'chat' || actionType === 'analysis') {
            const totalTokens = tokensIn + tokensOut;
            let multiplier = 1;
            if (model.includes('flash') || model.includes('gpt-3.5')) multiplier = 0.5;
            else if (model.includes('gpt-4') || model.includes('o1')) multiplier = 2;
            return Math.ceil(totalTokens * multiplier); // This is in "Credits"
        }
        return 0;
    },

    /**
     * Estimate Cost (for Frontend)
     */
    estimateCost: (actionType: string, inputLength: number = 0, model: string = 'default'): number => {
        if (actionType === 'image') return 30;
        if (actionType === 'video') return 60;

        if (actionType === 'chat' || actionType === 'analysis') {
            // Estimate: 1 token ~= 4 chars. 
            // Input + Expected Output (assume 500 chars output for estimate?)
            const estimatedTokensIn = Math.ceil(inputLength / 4);
            const estimatedTokensOut = 200; // Buffer

            let multiplier = 1; // Default Standard

            if (model.includes('flash') || model.includes('gpt-3.5')) {
                multiplier = 0.5;
            } else if (model.includes('gpt-4') || model.includes('o1')) {
                multiplier = 2;
            }

            return Math.ceil((estimatedTokensIn + estimatedTokensOut) * multiplier);
        }
        return 0;
    },

    // Legacy support for logging (can be deprecated)
    logTransaction: async (log: any) => {
        // We can map this to a usage operation if needed, but for now just log to old collection
        try {
            await db.collection('usage_logs').add({
                ...log,
                timestamp: new Date().toISOString()
            });
        } catch (e) { console.error(e); }
    }
};

export const logUsage = usageService.logTransaction;

