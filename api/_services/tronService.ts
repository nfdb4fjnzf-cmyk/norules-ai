/**
 * TronGrid Service
 * 
 * Handles TRC20 USDT transaction monitoring via TronGrid API
 */

import axios from 'axios';

const TRONGRID_API = 'https://api.trongrid.io';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT TRC20 Contract
const WALLET_ADDRESS = process.env.USDT_WALLET_ADDRESS || '';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || '';

export interface TRC20Transaction {
    transaction_id: string;
    from: string;
    to: string;
    value: string;           // Raw value (6 decimals for USDT)
    block_timestamp: number;
    type: string;
    token_info: {
        symbol: string;
        address: string;
        decimals: number;
        name: string;
    };
}

export interface TransactionResponse {
    data: TRC20Transaction[];
    success: boolean;
    meta: {
        at: number;
        page_size: number;
    };
}

export const tronService = {
    /**
     * Get recent TRC20 USDT transactions to our wallet
     */
    getRecentTransactions: async (limit: number = 50): Promise<TRC20Transaction[]> => {
        if (!WALLET_ADDRESS) {
            console.error('USDT_WALLET_ADDRESS not configured');
            return [];
        }

        try {
            const url = `${TRONGRID_API}/v1/accounts/${WALLET_ADDRESS}/transactions/trc20`;

            const response = await axios.get<TransactionResponse>(url, {
                params: {
                    only_to: true,                    // Only incoming transfers
                    contract_address: USDT_CONTRACT,  // Only USDT
                    limit: limit,
                    order_by: 'block_timestamp,desc'
                },
                headers: TRONGRID_API_KEY ? {
                    'TRON-PRO-API-KEY': TRONGRID_API_KEY
                } : {}
            });

            if (response.data.success && response.data.data) {
                return response.data.data.filter(tx =>
                    tx.to.toLowerCase() === WALLET_ADDRESS.toLowerCase() &&
                    tx.token_info?.symbol === 'USDT'
                );
            }

            return [];
        } catch (error: any) {
            console.error('TronGrid API Error:', error.message);
            return [];
        }
    },

    /**
     * Get transaction details by hash
     */
    getTransaction: async (txHash: string): Promise<TRC20Transaction | null> => {
        try {
            const url = `${TRONGRID_API}/v1/transactions/${txHash}`;
            const response = await axios.get(url, {
                headers: TRONGRID_API_KEY ? {
                    'TRON-PRO-API-KEY': TRONGRID_API_KEY
                } : {}
            });

            return response.data;
        } catch (error) {
            console.error('Failed to get transaction:', error);
            return null;
        }
    },

    /**
     * Convert raw USDT value to decimal (6 decimals)
     */
    parseUsdtAmount: (rawValue: string): number => {
        return parseFloat(rawValue) / 1_000_000;
    },

    /**
     * Format USDT amount for storage (raw value)
     */
    formatUsdtAmount: (amount: number): string => {
        return Math.round(amount * 1_000_000).toString();
    },

    /**
     * Check if a transaction is confirmed (TRC20 usually confirms quickly)
     */
    isConfirmed: (tx: TRC20Transaction): boolean => {
        // TronGrid returns transactions that are already confirmed
        // We consider any transaction older than 1 minute as confirmed
        const oneMinuteAgo = Date.now() - 60 * 1000;
        return tx.block_timestamp < oneMinuteAgo;
    },

    /**
     * Get wallet address
     */
    getWalletAddress: (): string => {
        return WALLET_ADDRESS;
    }
};
