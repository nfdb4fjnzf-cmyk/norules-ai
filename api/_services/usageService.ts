import { db } from '../_config/firebaseAdmin.js';
import { creditService } from './creditService.js';
import admin from 'firebase-admin';

export interface UsageOperation {
    userId: string;
    feature: 'text' | 'image' | 'video' | 'lp' | 'analyze' | 'ads.publish' | 'ads.sync';
    status: 'pending' | 'success' | 'failed';
    estimate: number;
    cost: number | null;
    refund: boolean;
    metadata?: any;
    result?: any;
    errorMessage?: string;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

export const usageService = {
    /**
     * V3: Start Usage (Pre-deduct credits)
     * Creates a pending usage_operation and deducts the estimated cost.
     */
    start: async (
        userId: string,
        feature: UsageOperation['feature'],
        estimate: number,
        metadata: any = {}
    ): Promise<{ operationId: string }> => {

        // 1. Create Operation Doc Reference
        const opRef = db.collection('usage_operations').doc();
        const operationId = opRef.id;

        // 2. Reserve/Deduct Credits (Atomic)
        // This throws if insufficient funds
        // We use creditService.deductCredits directly for "reservation" in V3 model
        // If it fails later, we refund.
        await creditService.deductCredits(userId, estimate, operationId, `Start ${feature}`);

        // 3. Create Doc
        await opRef.set({
            userId,
            feature,
            status: 'pending',
            estimate,
            cost: null,
            refund: false,
            metadata,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        });

        return { operationId };
    },

    /**
     * V3: Finalize Usage (Confirm cost or Refund)
     * Updates the usage_operation and handles refunds if needed.
     */
    finalize: async (
        operationId: string,
        actualCost: number,
        isRefund: boolean = false,
        result: any = null,
        errorMessage: string | null = null
    ): Promise<void> => {
        const opRef = db.collection('usage_operations').doc(operationId);

        await db.runTransaction(async (t) => {
            const opDoc = await t.get(opRef);
            if (!opDoc.exists) throw new Error('Operation not found');

            const opData = opDoc.data() as UsageOperation;

            // Idempotency check: if already finalized, do nothing
            if (opData.status !== 'pending') return;

            let finalStatus: UsageOperation['status'] = 'success';
            // let refundAmount = 0; // Unused variable

            if (isRefund) {
                // Full Refund
                finalStatus = 'failed';
                // refundAmount = opData.estimate;
            } else {
                // Partial Refund (if actual < estimate) logic handled after transaction
                finalStatus = 'success';
            }

            // Update Operation Doc
            t.update(opRef, {
                status: finalStatus,
                cost: isRefund ? 0 : actualCost,
                refund: isRefund,
                result: result || null,
                errorMessage: errorMessage || null,
                updatedAt: admin.firestore.Timestamp.now()
            });
        });

        // Handle Refund (Outside Transaction)
        const opDoc = await opRef.get();
        const opData = opDoc.data() as UsageOperation;

        if (isRefund) {
            await creditService.addCredits(opData.userId, opData.estimate, `Refund: ${opData.feature} failed`, operationId);
        } else {
            const diff = opData.estimate - actualCost;
            if (diff > 0) {
                await creditService.addCredits(opData.userId, diff, `Refund: ${opData.feature} cost adjustment`, operationId);
            } else if (diff < 0) {
                // Deduct extra
                await creditService.deductCredits(opData.userId, Math.abs(diff), operationId, `Adjust: ${opData.feature} cost`);
            }
        }
    },

    /**
     * Calculate Cost Helper (V3 Fixed Pricing)
     */
    calculateCost: (feature: string): number => {
        switch (feature) {
            case 'image': return 3;
            case 'video': return 10;
            case 'lp': return 3;
            case 'analyze': return 1; // or free for lite?
            case 'text': return 1;
            case 'ads.publish': return 5;
            default: return 1;
        }
    },

    // --- Deprecated V2 Methods (Keep for compatibility until full migration) ---

    startUsageOperation: async (userId: string, actionType: any, estimatedCost: number, payload: any) => {
        return usageService.start(userId, actionType as any, estimatedCost, payload);
    },

    finalizeUsageOperation: async (operationId: string, status: 'SUCCEEDED' | 'FAILED', actualCost: number = 0, resultRef: string | null = null, errorMessage: string | null = null) => {
        return usageService.finalize(operationId, actualCost, status === 'FAILED', resultRef, errorMessage);
    },

    estimateCost: (actionType: string) => usageService.calculateCost(actionType as any),
    logTransaction: async (log: any) => { console.log('Legacy log:', log); }
};

export const logUsage = usageService.logTransaction;
