import { validateRequest } from '../_middleware/auth.js';
import { db } from '../_config/firebaseAdmin.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const user = await validateRequest(req.headers);
        const uid = user.uid;

        const url = new URL(req.url);
        const cursor = url.searchParams.get('cursor') || undefined;
        const limit = parseInt(url.searchParams.get('limit') || '20');

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

        return new Response(JSON.stringify(successResponse({ logs, nextCursor })), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        const status = e.statusCode || 500;
        const code = e.code || 5000;
        return new Response(JSON.stringify(errorResponse(code, e.message)), { status });
    }
}
