import { db } from '../_config/firebaseAdmin.js';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';

export interface HistoryFilter {
    userId: string;
    limit?: number;
    startAfter?: any;
    type?: string; // 'ANALYZE' | 'IMAGE_GEN' | 'VIDEO_GEN' | 'LLM_CHAT'
}

export const historyService = {
    /**
     * Get Usage History (Operations)
     * Returns a list of operations with their status and cost.
     */
    getUsageHistory: async (filter: HistoryFilter) => {
        let query = db.collection('usage_operations')
            .where('userId', '==', filter.userId)
            .orderBy('createdAt', 'desc');

        if (filter.type) {
            query = query.where('actionType', '==', filter.type);
        }

        if (filter.limit) {
            query = query.limit(filter.limit);
        }

        if (filter.startAfter) {
            query = query.startAfter(filter.startAfter);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    /**
     * Get Credit Ledger (Point Transactions)
     */
    getCreditLedger: async (userId: string, limit: number = 20) => {
        const query = db.collection('credit_ledger')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit);

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    },

    /**
     * Get Analysis Report Detail
     */
    getAnalysisReport: async (reportId: string, userId: string) => {
        const doc = await db.collection('analysis_reports').doc(reportId).get();
        if (!doc.exists) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Report not found', 404);
        }
        const data = doc.data();
        if (data?.userId !== userId) {
            throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
        }
        return { id: doc.id, ...data };
    },

    /**
     * Get Generation Detail (Image/Video/Chat)
     */
    getGeneration: async (generationId: string, userId: string) => {
        const doc = await db.collection('generations').doc(generationId).get();
        if (!doc.exists) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Generation not found', 404);
        }
        const data = doc.data();
        if (data?.userId !== userId) {
            throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
        }
        return { id: doc.id, ...data };
    }
};
