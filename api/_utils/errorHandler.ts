/**
 * Standard Application Error Codes
 */
export const ErrorCodes = {
    OK: 0,
    INVALID_JWT: 1001,
    REPLAY_ATTACK: 1002,
    RATE_LIMIT_EXCEEDED: 1003,
    INSUFFICIENT_POINTS: 1004,
    INVALID_EXTERNAL_KEY: 1005,
    FIREBASE_ERROR: 1006,
    ANALYSIS_FAILED: 1007,
    VIDEO_TOO_LARGE: 1008,
    UNSUPPORTED_FILE: 1009,
    INTERNAL_SERVER_ERROR: 5000,
    BAD_REQUEST: 4000,
    UNAUTHORIZED: 4001,
    FORBIDDEN: 4003,
    NOT_FOUND: 4004,
};

/**
 * Custom Application Error Class
 */
export class AppError extends Error {
    public readonly code: number;
    public readonly statusCode: number;
    public readonly meta: any;

    constructor(code: number, message: string, statusCode = 500, meta = {}) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.meta = meta;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
