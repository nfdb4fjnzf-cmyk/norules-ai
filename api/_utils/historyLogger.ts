import { db } from '../_config/firebaseAdmin.js';

interface LogParams {
    context: { userId: string; email?: string };
    mode: 'INTERNAL' | 'EXTERNAL';
    apiPath: string;
    prompt: string;
    resultSummary: string;
    pointsDeducted?: number;
    quotaRemaining?: number;
    tokensUsed?: number;
    errorCode?: number;
    status: 'SUCCESS' | 'FAILURE';
    privateMode?: boolean;
}

export const logUsage = async (params: LogParams) => {
    try {
        const isPrivate = params.privateMode;

        const logEntry = {
            userId: params.context.userId,
            mode: params.mode,
            apiPath: params.apiPath,
            prompt: isPrivate ? '[REDACTED - PRIVATE MODE]' : params.prompt.substring(0, 200),
            resultSummary: isPrivate ? '[REDACTED - PRIVATE MODE]' : params.resultSummary.substring(0, 200),
            pointsDeducted: params.pointsDeducted,
            quotaRemaining: params.quotaRemaining,
            tokensUsed: params.tokensUsed,
            errorCode: params.errorCode,
            status: params.status,
            timestamp: Date.now()
        };

        await db.collection('users').doc(params.context.userId).collection('logs').add(logEntry);
    } catch (e) {
        console.error("Failed to log usage history", e);
        // Don't fail the request if logging fails
    }
};
