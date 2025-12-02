import { auth, db } from '../_config/firebaseAdmin.js';
import { VercelRequest, VercelResponse } from '@vercel/node';

export interface AdminUser {
    uid: string;
    email?: string;
    role: 'admin';
}

export const validateAdmin = async (req: VercelRequest): Promise<AdminUser> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw { statusCode: 401, message: 'Unauthorized: No token provided' };
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Check Firestore for Admin Role
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw { statusCode: 403, message: 'Forbidden: User not found' };
        }

        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw { statusCode: 403, message: 'Forbidden: Admin access required' };
        }

        return {
            uid,
            email: decodedToken.email,
            role: 'admin'
        };
    } catch (error: any) {
        if (error.statusCode) throw error;
        console.error('Admin Auth Error:', error);
        throw { statusCode: 401, message: 'Unauthorized: Invalid token' };
    }
};
