import { db } from '../_config/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const resetDailyQuota = async (userId: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    await db.collection('usage').doc(`${userId}_${today}`).delete();
};

export const checkAndResetDailyQuota = async (userId: string): Promise<void> => {
    // No-op: Usage is tracked by date key (userId_YYYY-MM-DD), so auto-reset is handled by key change.
};

export const incrementDailyUsage = async (userId: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    const docRef = db.collection('usage').doc(`${userId}_${today}`);

    await docRef.set({
        count: FieldValue.increment(1),
        userId,
        date: today
    }, { merge: true });
};

export const getDailyUsage = async (userId: string): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const doc = await db.collection('usage').doc(`${userId}_${today}`).get();

    if (!doc.exists) return 0;
    return doc.data()?.count || 0;
};
