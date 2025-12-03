import { db } from '../../config/firebaseClient';
import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    createdAt: string; // ISO string or timestamp
    lastLogin: string;
    credits: number;   // Replaces 'points'
    mode: 'internal' | 'external';
    updatedAt?: string;
    role?: 'user' | 'admin';
    isBanned?: boolean;
    total_spent_points?: number;
    total_purchased_points?: number;
    subscription?: {
        plan: string;
        status: string; // 'active' | 'trial' | 'expired'
        trialEndsAt?: string;
    };
}

export async function getUser(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return null;
    return userDoc.data() as UserProfile;
}

export async function createUser(user: Partial<UserProfile> & { uid: string; email: string }): Promise<void> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days later
    const nowISO = now.toISOString();

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        // User exists, only update allowed fields
        // Avoid updating protected fields like credits, plan, etc.
        await updateDoc(userRef, {
            lastLogin: nowISO,
            displayName: user.displayName || userDoc.data().displayName,
            photoURL: user.photoURL || userDoc.data().photoURL,
            updatedAt: nowISO
        });
    } else {
        // Default values for new users (Schema v3 + Ch.73 Sign Up Bonus + Ch.4 Free Trial)
        const newUser: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: user.createdAt || nowISO,
            lastLogin: user.lastLogin || nowISO,
            credits: 100, // Sign up bonus (Ch.73.2)
            mode: 'internal', // Default mode
            updatedAt: nowISO,
            subscription: {
                plan: 'free',
                status: 'trial',
                trialEndsAt: trialEndsAt
            }
        };
        // New user, create with defaults
        await setDoc(userRef, newUser);
    }
}

export async function updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
    const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
    };
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updateData);
}

export async function deductCredits(uid: string, amount: number): Promise<boolean> {
    const userRef = doc(db, 'users', uid);

    try {
        return await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error('User not found');

            const userData = userDoc.data() as UserProfile;
            const currentCredits = userData.credits || 0;

            if (currentCredits < amount) return false;

            transaction.update(userRef, {
                credits: currentCredits - amount,
                updatedAt: new Date().toISOString()
            });
            return true;
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        return false;
    }
}
