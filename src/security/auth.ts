import jwt from 'jsonwebtoken';
import { RequestContext, createEmptyContext } from './context';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-do-not-use';

export async function verifyJWT(req: Request): Promise<RequestContext> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const context = createEmptyContext();
        context.userId = decoded.uid || decoded.sub || decoded.user_id;
        context.email = decoded.email;
        context.ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        context.requestId = crypto.randomUUID();

        // Note: Plan is fetched by middleware from DB to ensure it's up to date,
        // so we don't rely on the token claim for plan.

        return context;
    } catch (err) {
        console.error('JWT Verification Failed:', err);
        throw new Error('Invalid Token');
    }
}

// Helper to issue tokens (for login/register endpoints)
export function issueJWT(payload: any): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
