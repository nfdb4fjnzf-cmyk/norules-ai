import { getSubscriptionPlans } from '../../src/services/firestore/plans';
import { successResponse, errorResponse } from '../_utils/responseFormatter';

export default async function handler(req: Request): Promise<Response> {
    try {
        if (req.method !== 'GET') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        const plans = await getSubscriptionPlans();
        return new Response(JSON.stringify(successResponse(plans)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify(errorResponse(500, e.message)), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
