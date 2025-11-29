import { validateRequest } from '../_middleware/auth.js';
import { db } from '../_config/firebaseAdmin.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Manual CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const user = await validateRequest(req.headers);
        const uid = user.uid;

        const cursor = req.query.cursor as string | undefined;
        const limit = parseInt((req.query.limit as string) || '20');

        let query = db.collection('users').doc(uid).collection('logs')
            .orderBy('timestamp', 'desc')
            .limit(limit);

        if (cursor) {
            const cursorDoc = await db.collection('users').doc(uid).collection('logs').doc(cursor).get();
            if (cursorDoc.exists) {
                query = query.startAfter(cursorDoc);
            }
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

        return res.status(200).json(successResponse({ logs, nextCursor }));
    } catch (e: any) {
        const status = e.statusCode || 500;
        const code = e.code || 5000;
        return res.status(status).json(errorResponse(code, e.message));
    }
}
