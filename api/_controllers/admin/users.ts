import { validateAdmin } from '../../_middleware/adminAuth.js';
import { db } from '../../_config/firebaseAdmin.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        await validateAdmin(req);

        const { search, limit = '20', offset = '0' } = req.query;
        const limitNum = parseInt(limit as string);
        // Offset is tricky in Firestore without a cursor. 
        // For simple admin, we might just fetch all or use startAfter if we had the last doc.
        // Let's implement basic search by email if provided, otherwise list recent users.

        let query: FirebaseFirestore.Query = db.collection('users');

        if (search) {
            // Simple prefix search on email (works if we have index, or just exact match)
            // Firestore doesn't support full text search natively.
            // We'll assume exact match or use >= and <= for prefix.
            const searchStr = search as string;
            query = query.where('email', '>=', searchStr).where('email', '<=', searchStr + '\uf8ff');
        } else {
            query = query.orderBy('createdAt', 'desc');
        }

        const snapshot = await query.limit(limitNum).get();

        const users = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));

        return res.status(200).json(successResponse({ users }));

    } catch (e: any) {
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
