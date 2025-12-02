import { db } from '../_config/firebaseAdmin.js';

export interface UsageLog {
    userId: string;
    actionType: 'chat' | 'image' | 'video' | 'analysis';
    inputText?: string;
    outputType?: string;
    estimatedCost: number;
    actualCost: number;
    timestamp: string;
    modelUsed?: string;
    tokensIn?: number;
    tokensOut?: number;
    status: 'success' | 'failed';
    errorMessage?: string;
}

export const usageService = {
    /**
     * Calculate Cost based on V3 Rules
     * LLM: Token * 2 (If tokens unknown, use rough char estimate: 1 token ~= 4 chars)
     * Image: 30
     * Video: 60
     */
    calculateCost: (actionType: string, model: string, tokensIn = 0, tokensOut = 0): number => {
        if (actionType === 'image') return 30;
        if (actionType === 'video') return 60;

        if (actionType === 'chat' || actionType === 'analysis') {
            const totalTokens = tokensIn + tokensOut;
            let multiplier = 1; // Default Standard

            if (model.includes('flash') || model.includes('gpt-3.5')) {
                multiplier = 0.5;
            } else if (model.includes('gpt-4') || model.includes('o1')) {
                multiplier = 2;
            }

            return Math.ceil(totalTokens * multiplier);
        }

        return 0;
    },

    /**
     * Estimate Cost (for Frontend)
     * Uses character count to estimate tokens for LLM
     */
    estimateCost: (actionType: string, inputLength: number = 0, model: string = 'default'): number => {
        if (actionType === 'image') return 30;
        if (actionType === 'video') return 60;

        if (actionType === 'chat' || actionType === 'analysis') {
            // Estimate: 1 token ~= 4 chars. 
            // Input + Expected Output (assume 500 chars output for estimate?)
            const estimatedTokensIn = Math.ceil(inputLength / 4);
            const estimatedTokensOut = 200; // Buffer

            let multiplier = 1; // Default Standard

            if (model.includes('flash') || model.includes('gpt-3.5')) {
                multiplier = 0.5;
            } else if (model.includes('gpt-4') || model.includes('o1')) {
                multiplier = 2;
            }

            return Math.ceil((estimatedTokensIn + estimatedTokensOut) * multiplier);
        }
        return 0;
    },

    /**
     * Log Usage to 'usage_logs' collection
     */
    logTransaction: async (log: UsageLog) => {
        try {
            await db.collection('usage_logs').add({
                ...log,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to log usage transaction:', error);
        }
    },

    /**
     * Legacy support (optional, can remove if not needed)
     */
    logUsage: async (uid: string, type: string, credits: number) => {
        // Redirect to new logger if possible, or keep for backward compatibility
        // For V3, we prefer logTransaction
    }
};

// Export legacy function for existing calls until refactored
export const logUsage = usageService.logUsage;

