import { db } from '../_config/firebaseAdmin.js';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';
import admin from 'firebase-admin';

export interface LedgerEntry {
    userId: string;
    type: 'DEBIT' | 'CREDIT' | 'REFUND' | 'ADJUST';
    reason: string;
    related_operation_id: string | null;
    amount: number;
    balance_after: number;
    metadata?: any;
    createdAt: admin.firestore.Timestamp;
}

export const creditService = {
    /**
     * Reserve credits for an operation (DEBIT)
     * Returns the actual amount deducted (after plan discounts)
     */
    reserveCredits: async (userId: string, amount: number, operationId: string, reason: string): Promise<number> => {
        return await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
            }

            const userData = userDoc.data();
            const currentCredits = userData?.credits || 0;
            const plan = userData?.subscription?.plan || 'free';
            const mode = userData?.mode || 'internal';

            // External mode: No deduction
            if (mode === 'external') return 0;

            // Enterprise: No deduction (Unlimited)
            if (plan === 'enterprise') return 0;

            // Calculate Discount
            let multiplier = 1;
            if (plan === 'light') multiplier = 0.8;
            else if (plan === 'medium') multiplier = 0.6;

            const finalAmount = Math.ceil(amount * multiplier);

            if (currentCredits < finalAmount) {
                throw new AppError(ErrorCodes.INSUFFICIENT_POINTS, `Insufficient credits. Required: ${finalAmount}, Available: ${currentCredits}`, 402);
            }

            const newBalance = currentCredits - finalAmount;

            // Update User Balance
            transaction.update(userRef, {
                credits: newBalance,
                total_spent_points: admin.firestore.FieldValue.increment(finalAmount),
                updatedAt: admin.firestore.Timestamp.now()
            });

            // Write Ledger Entry
            const ledgerRef = db.collection('credit_ledger').doc();
            transaction.set(ledgerRef, {
                userId,
                type: 'DEBIT',
                reason,
                related_operation_id: operationId,
                amount: finalAmount,
                balance_after: newBalance,
                metadata: { plan, originalAmount: amount },
                createdAt: admin.firestore.Timestamp.now()
            });

            return finalAmount;
        });
    },

    /**
     * Finalize credits (Refund excess or full refund on failure)
     */
    finalizeCredits: async (userId: string, reservedAmount: number, actualAmount: number, operationId: string, success: boolean): Promise<void> => {
        if (reservedAmount === 0) return; // Nothing was reserved (e.g. Enterprise/External)

        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) return; // Should not happen

            const userData = userDoc.data();
            const currentCredits = userData?.credits || 0;

            let refundAmount = 0;
            let reason = '';

            if (!success) {
                // Full Refund
                refundAmount = reservedAmount;
                reason = 'Refund: Operation Failed';
            } else {
                // Partial Refund if actual < reserved
                // Note: actualAmount passed here should be the *discounted* actual cost.
                // But usually the caller knows the base cost.
                // To be safe, we assume actualAmount is the FINAL amount that SHOULD have been charged.
                // If reserved > actual, refund difference.
                if (reservedAmount > actualAmount) {
                    refundAmount = reservedAmount - actualAmount;
                    reason = 'Refund: Usage Adjustment';
                }
            }

            if (refundAmount > 0) {
                const newBalance = currentCredits + refundAmount;

                transaction.update(userRef, {
                    credits: newBalance,
                    updatedAt: admin.firestore.Timestamp.now()
                });

                const ledgerRef = db.collection('credit_ledger').doc();
                transaction.set(ledgerRef, {
                    userId,
                    type: 'REFUND',
                    reason,
                    related_operation_id: operationId,
                    amount: refundAmount,
                    balance_after: newBalance,
                    metadata: { reservedAmount, actualAmount, success },
                    createdAt: admin.firestore.Timestamp.now()
                });
            }
        });
    },

    getBalance: async (userId: string): Promise<number> => {
        const doc = await db.collection('users').doc(userId).get();
        return doc.data()?.credits || 0;
    }
};
