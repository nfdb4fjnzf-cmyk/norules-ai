import { db } from '../_config/firebaseAdmin';
import { AppError, ErrorCodes } from '../_utils/errorHandler';

const DAILY_LIMITS = {
    FREE: 5,
    PRO: 50,
    ENTERPRISE: 1000,
};

/**
 * Check Rate Limit
 */
export const checkRateLimit = async (uid: string, plan: string = 'FREE'): Promise<void> => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const usageRef = db.collection('users').doc(uid).collection('usage').doc(today);

    try {
        const doc = await usageRef.get();
        let currentUsage = 0;

        if (doc.exists) {
            currentUsage = doc.data()?.count || 0;
        }

        const limit = DAILY_LIMITS[plan as keyof typeof DAILY_LIMITS] || DAILY_LIMITS.FREE;

        if (currentUsage >= limit) {
            throw new AppError(ErrorCodes.RATE_LIMIT_EXCEEDED, `Daily limit exceeded for plan ${plan}`, 429);
        }

        // Note: Incrementing usage should happen AFTER successful processing, 
        // but for strict rate limiting we might want to check here.
        // The actual increment will be handled by the logger/history service.

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error('Rate limit check error', error);
        // Fail open if DB error? Or fail closed? 
        // For now, let's fail closed to be safe, or just log and allow if it's a DB connection issue.
        // Throwing generic error for now.
        throw new AppError(ErrorCodes.FIREBASE_ERROR, 'Failed to check rate limit', 500);
    }
};
