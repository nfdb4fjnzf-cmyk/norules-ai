import { verifyJWT } from './auth';
import { validatePayload } from './requestValidator';

// Firestore Services
import { checkRateLimit } from '../services/firestore/rateLimit';
import { getSubscription, isSubscriptionActive } from '../services/firestore/subscriptions';
import { isIpBlocked } from '../services/firestore/ipBlock';
import { deductPointsOnly } from '../services/firestore/usage';
import { checkAndResetDailyQuota, getDailyUsage, incrementDailyUsage } from '../../api/_utils/quota';

export async function runSecurityPipeline(request: Request, apiPath: string): Promise<any> {
    // 1. Authentication (ALWAYS REQUIRED)
    // Even in External Mode, we need to know WHO the user is to check their Plan (Free vs Paid).
    // The "External Key" is just for the LLM Provider, not for AdGuardian identity.
    const context = await verifyJWT(request);

    // 2. Determine Mode
    // If X-Custom-API-Key is present, it means the user wants to use their own key.
    // This header is injected by the Secure Proxy (or sent directly if testing).
    // In our architecture, the Secure Proxy injects it after decryption.
    const customApiKey = request.headers.get('X-Custom-API-Key');
    const mode = customApiKey ? 'EXTERNAL' : 'INTERNAL';

    // Update context with mode
    context.mode = mode;
    (request as any).llmMode = mode;

    // 2. Rate Limit
    const allowedRate = await checkRateLimit(context.userId, context.ip);
    if (!allowedRate) {
        throw new Error('Rate limit exceeded');
    }

    // 3. Subscription Fetch
    const subscription = await getSubscription(context.userId);
    (request as any).subscription = subscription;
    context.plan = subscription.plan; // Update context with real plan

    // 4. Subscription Permission Check
    // Free users CANNOT use EXTERNAL mode
    if (subscription.plan === 'free' && mode === 'EXTERNAL') {
        throw new Error('Free 方案不可使用外部 API Key');
    }

    // Check if subscription is active (for paid plans)
    if (subscription.plan !== 'free' && !isSubscriptionActive(subscription)) {
        throw new Error('Subscription invalid or expired');
    }

    // 5. Daily Quota Check & Reset
    await checkAndResetDailyQuota(context.userId);
    const todayUsage = await getDailyUsage(context.userId);

    // Check limit (API Key mode usually has unlimited or provider limit, but we check plan definition)
    // For now, assume API Key mode bypasses our internal daily limit or has a very high one?
    // Requirement says: "每一次 query... 都需... todayCount >= dailyLimit -> 429"
    // So we enforce it based on subscription.dailyLimit
    if (todayUsage >= subscription.daily_limit) {
        throw new Error('已達每日查詢上限');
    }

    // 6. Points Deduction (INTERNAL mode only)
    let actualCost = 0;
    if (mode === 'INTERNAL') {
        const baseCost = 10;
        actualCost = baseCost * 2;

        try {
            await deductPointsOnly(context.userId, actualCost);
        } catch (e: any) {
            throw new Error('點數不足，請升級或儲值');
        }
    }

    // 7. Increment Usage
    await incrementDailyUsage(context.userId);

    // Attach usage info for response
    (request as any).quotaUsage = {
        today: todayUsage + 1,
        limit: subscription.daily_limit,
        cost: actualCost,
        mode: mode
    };

    // 8. IP Protection
    const isBlocked = await isIpBlocked(context.ip);
    if (isBlocked) {
        throw new Error('Access denied: IP blocked');
    }

    // 9. Payload Validation
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            const payload = await request.clone().json();
            validatePayload(payload);
        } catch (e) {
            // Ignore JSON parse errors here
        }
    }
}
