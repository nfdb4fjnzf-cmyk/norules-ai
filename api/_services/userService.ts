import { db } from '../_config/firebaseAdmin';
import { AppError, ErrorCodes } from '../_utils/errorHandler';

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    credits: number;
    mode: 'internal' | 'external';
    subscription?: {
        plan: string;
        status: string;
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

    deductCredits: async (uid: string, amount: number): Promise<boolean> => {
        return await db.runTransaction(async (transaction) => {
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
    }
};
