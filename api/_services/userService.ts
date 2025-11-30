import { db } from '../_config/firebaseAdmin.js';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';
import admin from 'firebase-admin';

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    credits: number;
    dailyLimit?: number;
    mode: 'internal' | 'external';
    subscription?: {
        plan: string;
        status: string;
        startDate?: string;
        endDate?: string;
    };
}

export const userService = {
    getUserProfile: async (uid: string): Promise<UserProfile> => {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
        }
        const data = userDoc.data();
        return {
            uid,
            email: data?.email,
            displayName: data?.displayName,
            photoURL: data?.photoURL,
            credits: data?.credits || 0,
            mode: data?.mode || 'internal',
            subscription: data?.subscription
        };
    },

    updateUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
        await db.collection('users').doc(uid).set(data, { merge: true });
    },

    deductCredits: async (uid: string, amount: number): Promise<boolean> => {
        return await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const userRef = db.collection('users').doc(uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
            }

            const userData = userDoc.data();
            const currentCredits = userData?.credits || 0;
            const mode = userData?.mode || 'internal';
            const plan = userData?.subscription?.plan || 'free';

            // External mode users don't pay credits (Ch.3 Mode C)
            if (mode === 'external') {
                return true;
            }

            // Calculate Discount (Ch.3 Mode A)
            let multiplier = 1;
            if (plan === 'lite') multiplier = 0.8; // 20% off
            else if (plan === 'pro') multiplier = 0.6; // 40% off
            else if (plan === 'ultra') multiplier = 0.4; // 60% off

            const finalAmount = amount * multiplier;

            if (currentCredits < finalAmount) {
                return false;
            }

            transaction.update(userRef, {
                credits: currentCredits - finalAmount,
                updatedAt: new Date().toISOString()
            });

            return true;
        });
    },

    addCredits: async (uid: string, amount: number): Promise<void> => {
        await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const userRef = db.collection('users').doc(uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
            }

            const userData = userDoc.data();
            const currentCredits = userData?.credits || 0;

            // We don't apply discount multiplier on refund because we want to refund exactly what was deducted?
            // Wait, deductCredits applies multiplier. So if we deduct 10 * 0.8 = 8, we should refund 8.
            // But the caller passes 'amount' (e.g. 10).
            // So we need to re-calculate the exact amount that was deducted.
            // This is tricky. Ideally deductCredits returns the *actual* deducted amount.
            // For now, I will assume the caller passes the base amount and I apply the same multiplier logic to be consistent.

            const plan = userData?.subscription?.plan || 'free';
            let multiplier = 1;
            if (plan === 'lite') multiplier = 0.8;
            else if (plan === 'pro') multiplier = 0.6;
            else if (plan === 'ultra') multiplier = 0.4;

            const finalAmount = amount * multiplier;

            transaction.update(userRef, {
                credits: currentCredits + finalAmount,
                updatedAt: new Date().toISOString()
            });
        });
    }
};
