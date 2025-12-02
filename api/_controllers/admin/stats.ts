import { validateAdmin } from '../../_middleware/adminAuth.js';
import { db } from '../../_config/firebaseAdmin.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        await validateAdmin(req);

        // 1. Total Users
        const usersSnapshot = await db.collection('users').count().get();
        const totalUsers = usersSnapshot.data().count;

        // 2. DAU (Last 24h) - Requires index on lastLogin
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dauSnapshot = await db.collection('users')
            .where('lastLogin', '>=', yesterday.toISOString())
            .count().get();
        const dau = dauSnapshot.data().count;

        // 3. Subscription Stats (Simple aggregation)
        const subsSnapshot = await db.collection('subscriptions').where('status', '==', 'active').get();
        const activeSubscriptions = subsSnapshot.size;

        // Revenue (Mock or calculate from plans)
        // In a real app, we'd sum up from Stripe or subscription_events
        let estimatedMonthlyRevenue = 0;
        subsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.planId === 'lite') estimatedMonthlyRevenue += 5;
            if (data.planId === 'pro') estimatedMonthlyRevenue += 10;
            if (data.planId === 'ultra') estimatedMonthlyRevenue += 30;
        });

        // 4. Usage Stats (Last 24h)
        // Requires index on createdAt
        const usageSnapshot = await db.collection('usage_operations')
            .where('createdAt', '>=', yesterday) // Timestamp
            .get();

        const totalOperations = usageSnapshot.size;
        let failedOperations = 0;
        let totalCreditsConsumed = 0;

        usageSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'FAILED') failedOperations++;
            if (data.actual_cost) totalCreditsConsumed += data.actual_cost;
        });

        const errorRate = totalOperations > 0 ? (failedOperations / totalOperations) : 0;

        const stats = {
            totalUsers,
            dau,
            activeSubscriptions,
            estimatedMonthlyRevenue,
            usage: {
                totalOperations,
                failedOperations,
                errorRate,
                totalCreditsConsumed
            }
        };

        return res.status(200).json(successResponse(stats));

    } catch (e: any) {
        const status = e.statusCode || 500;
        return res.status(status).json(errorResponse(status, e.message));
    }
}
