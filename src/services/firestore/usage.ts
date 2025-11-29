import { db } from '../../config/firebaseClient';
import { doc, getDoc, setDoc, deleteDoc, increment, runTransaction } from 'firebase/firestore';

export async function getDailyUsage(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, 'usage', `${userId}_${today}`);
    const usageDoc = await getDoc(usageRef);

    if (!usageDoc.exists()) return 0;
    return usageDoc.data()?.count || 0;
}

export async function incrementDailyUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, 'usage', `${userId}_${today}`);

    await setDoc(usageRef, {
        count: increment(1),
        userId,
        date: today
    }, { merge: true });
}

export async function resetDailyUsage(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, 'usage', `${userId}_${today}`);
    await deleteDoc(usageRef);
}

export async function deductPointsOnly(userId: string, amount: number): Promise<void> {
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');

        const currentCredits = userDoc.data()?.credits || 0;
        if (currentCredits < amount) {
            throw new Error('Insufficient credits');
        }

        transaction.update(userRef, { credits: currentCredits - amount });
    });
}
