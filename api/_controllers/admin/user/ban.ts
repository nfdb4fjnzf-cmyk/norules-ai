import { validateAdmin } from '../../../_middleware/adminAuth.js';
import { db, auth } from '../../../_config/firebaseAdmin.js';
import { successResponse, errorResponse } from '../../../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        await validateAdmin(req);

        const { userId, ban, reason } = req.body;

        if (!userId || typeof ban !== 'boolean') {
            return res.status(400).json(errorResponse(400, 'Missing userId or ban status'));
        }

        // 1. Set Custom Claims (Fast Rejection at Middleware)
        // We preserve existing claims (like role: admin) if any, but for now let's just merge.
        // Actually, we should be careful not to overwrite 'admin' role if we ban an admin (though unlikely).
        // Let's fetch existing claims first.
        const userRecord = await auth.getUser(userId);
        const existingClaims = userRecord.customClaims || {};

        await auth.setCustomUserClaims(userId, {
            ...existingClaims,
            banned: ban
        });

        // 2. Update Firestore (For UI and Record)
        const status = ban ? 'banned' : 'active';
        await db.collection('users').doc(userId).set({
            status,
            banReason: ban ? (reason || 'Admin action') : null,
            bannedAt: ban ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 3. If banning, we might want to revoke refresh tokens to force immediate logout
        if (ban) {
            await auth.revokeRefreshTokens(userId);
        }

        return res.status(200).json(successResponse({
            userId,
            status,
            message: ban ? 'User banned successfully' : 'User unbanned successfully'
        }));

    } catch (e: any) {
        console.error('Ban user error:', e);
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
