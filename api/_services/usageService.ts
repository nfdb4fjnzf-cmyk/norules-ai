import { db } from '../_config/firebaseAdmin.js';

export const logUsage = async (uid: string, type: string, credits: number) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const usageRef = db.collection('usage').doc(`${uid}_${today}`);

        await usageRef.set({
            uid,
            date: today,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        // We can add a subcollection for detailed logs if needed, 
        // but for now we just ensure the document exists or update a counter if we were tracking count.
        // Since we are tracking credits in user profile, this might be for audit logs.

        await db.collection('usage_logs').add({
            uid,
            type,
            credits,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Failed to log usage:', error);
        // Non-blocking error
    }
};
