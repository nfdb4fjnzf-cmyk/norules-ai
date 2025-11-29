import { db } from '../_config/firebaseAdmin';
import { successResponse, errorResponse } from '../_utils/responseFormatter';
import { validateRequest } from '../_middleware/auth';

export default async function handler(req: Request): Promise<Response> {
    if (req.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const user = await validateRequest(req.headers);
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify(errorResponse(400, 'Missing ID')), { status: 400 });
        }

        const doc = await db.collection('users').doc(user.uid).collection('logs').doc(id).get();

        if (!doc.exists) {
            return new Response(JSON.stringify(errorResponse(404, 'Log not found')), { status: 404 });
        }

        const log = { id: doc.id, ...doc.data() };

        return new Response(JSON.stringify(successResponse(log)), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify(errorResponse(500, e.message)), { status: 500 });
    }
}
