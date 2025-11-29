import { validateRequest } from '../_middleware/auth.js';
import { getSubscription, upgradePlan } from '../_services/subscriptionService.js';
import { successResponse, errorResponse } from '../_utils/responseFormatter.js';
import { resetDailyQuota, getDailyUsage } from '../_utils/quota.js';
import { PlanType } from '../_types/plans.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const user = await validateRequest(req.headers);
        const uid = user.uid;

        if (req.method === 'GET') {
            const sub = await getSubscription(uid);
            const usage = await getDailyUsage(uid);

            const responseData = {
                ...sub,
                usage: {
                    used: usage,
                    limit: sub.daily_limit,
                    remaining: Math.max(0, sub.daily_limit - usage)
                }
            };

            return res.status(200).json(successResponse(responseData));
        }

        if (req.method === 'POST') {
            const body = req.body;
            const { plan, billingCycle } = body;

            if (!plan) throw new Error('Plan is required');

            // Validate plan type
            if (!['lite', 'pro', 'ultra'].includes(plan)) {
                return res.status(400).json(errorResponse(400, 'Invalid plan type'));
            }

            // Validate billing cycle
            const cycle = billingCycle || 'monthly';
            if (!['monthly', 'quarterly', 'annual'].includes(cycle)) {
                return res.status(400).json(errorResponse(400, 'Invalid billing cycle'));
            }

            // 1. Update Plan
            await upgradePlan(uid, plan as PlanType, cycle);

            // 2. Reset Quota (New plan starts fresh)
            await resetDailyQuota(uid);

            // 3. Return updated subscription
            const updatedSub = await getSubscription(uid);
            const responseData = {
                ...updatedSub,
                usage: {
                    used: 0,
                    limit: updatedSub.daily_limit,
                    remaining: updatedSub.daily_limit
                }
            };

            return res.status(200).json(successResponse(responseData));
        }

        return res.status(405).send('Method Not Allowed');

    } catch (e: any) {
        const status = e.statusCode || 500;
        const code = e.code || 5000;
        return res.status(status).json(errorResponse(code, e.message));
    }
}
