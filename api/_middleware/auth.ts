import { auth } from '../_config/firebaseAdmin.js';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';
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
        // Ensure Firebase is initialized before verification
        // This handles cases where auto-init failed or env vars were lazy-loaded
        try {
            const { initializeFirebase } = await import('../_config/firebaseAdmin.js');
            initializeFirebase();
        } catch (initError: any) {
            console.error('Lazy Init Error:', initError);
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, `Firebase Init Failed: ${initError.message}`, 500);
        }

        decodedToken = await auth.verifyIdToken(token);

        // Check for Banned Status (Custom Claim)
        if (decodedToken.banned) {
            throw new AppError(ErrorCodes.FORBIDDEN, 'User is banned', 403);
        }
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        // Log the actual verification error for debugging
        console.error('JWT Verification Error:', error);
        throw new AppError(ErrorCodes.INVALID_JWT, `Invalid or expired JWT: ${error.message}`, 401);
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
        ...decodedToken,
        uid: decodedToken.uid,
        email: decodedToken.email,
    };
};
