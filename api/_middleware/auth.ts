import { auth } from '../_config/firebaseAdmin';
import { AppError, ErrorCodes } from '../_utils/errorHandler';
import { IncomingHttpHeaders } from 'http';

export interface AuthenticatedUser {
    uid: string;
    email?: string;
    [key: string]: any;
}

/**
 * Validate Request Authentication
 * Checks JWT and Timestamp
 */
export const validateRequest = async (headers: Headers | Record<string, string> | IncomingHttpHeaders): Promise<AuthenticatedUser> => {
    const getHeader = (key: string): string | undefined => {
        if (headers instanceof Headers) return headers.get(key) || undefined;

        // Handle IncomingHttpHeaders (Node.js) and Record<string, string>
        const lowerKey = key.toLowerCase();
        const value = (headers as any)[key] || (headers as any)[lowerKey];

        if (Array.isArray(value)) return value[0];
        return value;
    };

    const authHeader = getHeader('Authorization');
    const timestampHeader = getHeader('X-Timestamp');

    // 1. Check Authorization Header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(ErrorCodes.UNAUTHORIZED, 'Missing or invalid Authorization header', 401);
    }

    const token = authHeader.split('Bearer ')[1];

    // 2. Verify JWT
    let decodedToken;
    try {
        decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
        throw new AppError(ErrorCodes.INVALID_JWT, 'Invalid or expired JWT', 401);
    }

    // 3. Check Replay Attack (Timestamp)
    if (timestampHeader) {
        const timestamp = parseInt(timestampHeader, 10);
        const now = Date.now();
        const windowMs = 60 * 1000; // 60 seconds

        if (isNaN(timestamp) || Math.abs(now - timestamp) > windowMs) {
            throw new AppError(ErrorCodes.REPLAY_ATTACK, 'Request timestamp expired (Replay Attack Protection)', 401);
        }
    }

    return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...decodedToken,
    };
};
