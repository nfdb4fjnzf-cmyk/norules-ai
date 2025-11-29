/**
 * Standard API Response Structure
 */
export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data?: T;
    meta?: {
        requestId?: string;
        timestamp: number;
        [key: string]: any;
    };
}

/**
 * Success Response Helper
 */
export const successResponse = <T>(data: T, message = 'OK', meta = {}): ApiResponse<T> => {
    return {
        code: 0,
        message,
        data,
        meta: {
            timestamp: Date.now(),
            ...meta,
        },
    };
};

/**
 * Error Response Helper
 */
export const errorResponse = (code: number, message: string, meta = {}): ApiResponse => {
    return {
        code,
        message,
        meta: {
            timestamp: Date.now(),
            ...meta,
        },
    };
};
