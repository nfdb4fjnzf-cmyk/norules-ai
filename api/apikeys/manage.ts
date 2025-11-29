import { validateRequest } from '../_middleware/auth';
import { db } from '../_config/firebaseAdmin';
import { successResponse, errorResponse } from '../_utils/responseFormatter';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Private-Mode'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Validate Auth
        // req.headers is IncomingHttpHeaders, compatible with our updated validateRequest logic (need to verify)
        const user = await validateRequest(req.headers as any);
        const uid = user.uid;

        if (req.method === 'GET') {
            const snapshot = await db.collection('users').doc(uid).collection('apikeys').get();
            const keys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.status(200).json(successResponse(keys));
        }

        if (req.method === 'POST') {
            const body = req.body; // Vercel parses JSON body automatically
            const { name } = body;
            if (!name) throw new Error('Key name is required');

            const key = 'sk-' + crypto.randomUUID().replace(/-/g, '');
            const now = new Date().toISOString();

            const newKey = {
                uid,
                name,
                key,
                createdAt: now,
                lastUsed: now
            };

            // Add to users/{uid}/apikeys
            const docRef = await db.collection('users').doc(uid).collection('apikeys').add(newKey);

            // Global lookup
            await db.collection('apikeys').doc(key).set({ uid, keyId: docRef.id });

            return res.status(201).json(successResponse({ ...newKey, id: docRef.id }));
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            const keyId = Array.isArray(id) ? id[0] : id;

            if (!keyId) throw new Error('Key ID is required');

            const keyDoc = await db.collection('users').doc(uid).collection('apikeys').doc(keyId).get();
            if (keyDoc.exists) {
                const keyData = keyDoc.data();
                if (keyData && keyData.key) {
                    await db.collection('apikeys').doc(keyData.key).delete();
                }
                await db.collection('users').doc(uid).collection('apikeys').doc(keyId).delete();
            }

            return res.status(200).json(successResponse({ success: true }));
        }

        return res.status(405).json(errorResponse(405, 'Method Not Allowed'));

    } catch (e: any) {
        console.error('API Key Error:', e);
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
