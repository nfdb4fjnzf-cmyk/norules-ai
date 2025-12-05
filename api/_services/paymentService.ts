/**
 * Payment Service V2
 * 
 * Self-hosted USDT TRC20 payment system using unique amount matching.
 * Replaces NOWPayments integration.
 */

import { db } from '../_config/firebaseAdmin.js';
import { tronService } from './tronService.js';
import admin from 'firebase-admin';
import crypto from 'crypto';

const WALLET_ADDRESS = process.env.USDT_WALLET_ADDRESS || 'TMtVqkC5P7MPExWD3p1esQmsyhyzvirELw';
const ORDER_EXPIRY_MINUTES = 30;

export interface PaymentOrder {
    orderId: string;
    userId: string;
    type: 'TOPUP' | 'SUB';

    // Order details
    points?: number;
    planId?: string;
    billingCycle?: string;

    // Payment info
    baseAmount: number;         // Base price without unique suffix
    expectedAmount: number;     // Unique amount (base + decimal suffix)
    walletAddress: string;
    currency: 'USDT-TRC20';

    // Status
    status: 'pending' | 'confirming' | 'completed' | 'expired' | 'failed';
    txHash?: string;

    // Timestamps
    createdAt: admin.firestore.Timestamp;
    expiresAt: admin.firestore.Timestamp;
    confirmedAt?: admin.firestore.Timestamp;
    completedAt?: admin.firestore.Timestamp;
}

export const paymentService = {
    /**
     * Generate unique amount for order matching
     * Uses orderId hash to create a deterministic 3-digit decimal suffix
     */
    generateUniqueAmount: (baseAmount: number, orderId: string): number => {
        // Create a hash of the orderId
        const hash = crypto.createHash('md5').update(orderId).digest('hex');
        // Take first 3 hex chars and convert to decimal (0.001 - 0.999)
        const decimalSuffix = (parseInt(hash.substring(0, 3), 16) % 999 + 1) / 1000;

        // Round to 3 decimal places
        const uniqueAmount = Math.round((baseAmount + decimalSuffix) * 1000) / 1000;

        return uniqueAmount;
    },

    /**
     * Create a new payment order
     */
    createOrder: async (
        userId: string,
        type: 'TOPUP' | 'SUB',
        baseAmount: number,
        details: {
            points?: number;
            planId?: string;
            billingCycle?: string;
            description?: string;
        }
    ): Promise<PaymentOrder> => {
        // Generate order ID
        const orderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        // Generate unique amount
        const expectedAmount = paymentService.generateUniqueAmount(baseAmount, orderId);

        // Calculate expiry time
        const now = admin.firestore.Timestamp.now();
        const expiresAt = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000)
        );

        // Build order object, excluding undefined values (Firestore doesn't accept undefined)
        const order: PaymentOrder = {
            orderId,
            userId,
            type,
            baseAmount,
            expectedAmount,
            walletAddress: WALLET_ADDRESS,
            currency: 'USDT-TRC20',
            status: 'pending',
            createdAt: now,
            expiresAt
        };

        // Conditionally add optional fields (only if defined)
        if (details.points !== undefined) order.points = details.points;
        if (details.planId !== undefined) order.planId = details.planId;
        if (details.billingCycle !== undefined) order.billingCycle = details.billingCycle;

        // Save to Firestore
        await db.collection('payment_orders').doc(orderId).set(order);

        console.log(`[Payment] Created order ${orderId}: ${expectedAmount} USDT for user ${userId}`);

        return order;
    },

    /**
     * Get order by ID
     */
    getOrder: async (orderId: string): Promise<PaymentOrder | null> => {
        const doc = await db.collection('payment_orders').doc(orderId).get();
        if (!doc.exists) return null;
        return doc.data() as PaymentOrder;
    },

    /**
     * Get all pending orders (for cron job)
     */
    getPendingOrders: async (): Promise<PaymentOrder[]> => {
        const now = admin.firestore.Timestamp.now();

        const snapshot = await db.collection('payment_orders')
            .where('status', '==', 'pending')
            .where('expiresAt', '>', now)
            .get();

        return snapshot.docs.map(doc => doc.data() as PaymentOrder);
    },

    /**
     * Update order status
     */
    updateOrderStatus: async (
        orderId: string,
        status: PaymentOrder['status'],
        txHash?: string
    ): Promise<void> => {
        const updateData: any = { status };

        if (txHash) updateData.txHash = txHash;
        if (status === 'confirming') updateData.confirmedAt = admin.firestore.Timestamp.now();
        if (status === 'completed') updateData.completedAt = admin.firestore.Timestamp.now();

        await db.collection('payment_orders').doc(orderId).update(updateData);
    },

    /**
     * Mark expired orders
     */
    expireOldOrders: async (): Promise<number> => {
        const now = admin.firestore.Timestamp.now();

        const snapshot = await db.collection('payment_orders')
            .where('status', '==', 'pending')
            .where('expiresAt', '<=', now)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'expired' });
        });

        await batch.commit();
        return snapshot.size;
    },

    /**
     * Match transactions to pending orders
     */
    matchTransactionsToOrders: async (): Promise<{
        matched: number;
        processed: string[];
        debug?: any;
    }> => {
        // Get pending orders
        const pendingOrders = await paymentService.getPendingOrders();
        console.log(`[Payment] Found ${pendingOrders.length} pending orders`);

        if (pendingOrders.length === 0) {
            return { matched: 0, processed: [], debug: { reason: 'no_pending_orders' } };
        }

        // Get recent transactions
        const transactions = await tronService.getRecentTransactions(50);
        console.log(`[Payment] Found ${transactions.length} recent transactions`);

        if (transactions.length === 0) {
            return { matched: 0, processed: [], debug: { reason: 'no_transactions' } };
        }

        const processed: string[] = [];
        const debugInfo: any[] = [];

        for (const order of pendingOrders) {
            console.log(`[Payment] Checking order ${order.orderId}, expected: ${order.expectedAmount} USDT`);

            // Find matching transaction
            const matchedTx = transactions.find(tx => {
                const txAmount = tronService.parseUsdtAmount(tx.value);
                // Allow 0.01 tolerance for floating point (more tolerant)
                const amountDiff = Math.abs(txAmount - order.expectedAmount);
                const amountMatch = amountDiff < 0.01;
                // Transaction must be after order creation
                const orderCreatedAt = order.createdAt.toMillis();
                const timeValid = tx.block_timestamp > orderCreatedAt;

                console.log(`[Payment] TX ${tx.transaction_id.substring(0, 16)}... amount: ${txAmount}, diff: ${amountDiff.toFixed(4)}, match: ${amountMatch}, timeValid: ${timeValid}`);

                return amountMatch && timeValid;
            });

            if (matchedTx) {
                console.log(`[Payment] Found matching TX for order ${order.orderId}: ${matchedTx.transaction_id}`);

                // Check if this txHash was already processed
                const existingOrder = await db.collection('payment_orders')
                    .where('txHash', '==', matchedTx.transaction_id)
                    .get();

                if (!existingOrder.empty) {
                    console.log(`[Payment] Transaction ${matchedTx.transaction_id} already used`);
                    continue;
                }

                // Update order with transaction
                await paymentService.updateOrderStatus(
                    order.orderId,
                    'confirming',
                    matchedTx.transaction_id
                );

                // Process immediately (TRC20 confirms fast)
                console.log(`[Payment] Processing order ${order.orderId}...`);
                await paymentService.processCompletedOrder(order);
                await paymentService.updateOrderStatus(order.orderId, 'completed');
                processed.push(order.orderId);
                console.log(`[Payment] Order ${order.orderId} completed!`);
            } else {
                debugInfo.push({
                    orderId: order.orderId,
                    expectedAmount: order.expectedAmount,
                    recentTxAmounts: transactions.slice(0, 5).map(tx => tronService.parseUsdtAmount(tx.value))
                });
            }
        }

        return { matched: processed.length, processed, debug: debugInfo };
    },

    /**
     * Process a completed payment order
     */
    processCompletedOrder: async (order: PaymentOrder): Promise<void> => {
        const { userService } = await import('./userService.js');
        const { subscriptionService } = await import('./subscriptionService.js');

        console.log(`[Payment] Processing completed order ${order.orderId}`);

        if (order.type === 'TOPUP' && order.points) {
            // Add credits for TopUp
            await userService.addCredits(order.userId, order.points);
            console.log(`[Payment] Added ${order.points} credits to user ${order.userId}`);

        } else if (order.type === 'SUB' && order.planId && order.billingCycle) {
            // Create subscription
            await subscriptionService.createSubscription(
                order.userId,
                order.planId as 'lite' | 'pro' | 'ultra',
                order.billingCycle as 'monthly' | 'quarterly' | 'yearly'
            );
            console.log(`[Payment] Created ${order.planId} subscription for user ${order.userId}`);
        }
    },

    /**
     * Generate QR code data for payment
     * Format: TronLink/imToken deep link
     */
    generateQRCodeData: (walletAddress: string, amount: number): string => {
        // TronLink compatible format
        // Note: Some wallets may not support amount parameter
        return `tron:${walletAddress}?amount=${amount}&token=USDT`;
    },

    /**
     * Get wallet address
     */
    getWalletAddress: (): string => {
        return WALLET_ADDRESS;
    }
};
