import { validateRequest } from '../../_middleware/auth.js';
import { errorResponse } from '../../_utils/responseFormatter.js';
import textHandler from './text.js';
import imageHandler from './image.js';
import videoHandler from './video.js';
import urlHandler from './url.js';
import riskHandler from './risk.js';

export const config = {
    runtime: 'edge', // Or nodejs, depending on dependencies. Video/Risk use nodejs usually? 
    // Actually, most handlers use GoogleGenerativeAI which works in Edge, 
    // but some might use other libs. Let's check dependencies.
    // text.ts uses GoogleGenerativeAI (Edge OK)
    // risk.ts uses GoogleGenerativeAI (Edge OK)
    // video.ts uses GoogleGenerativeAI (Edge OK)
    // However, if we use firebase-admin in any of them, we MUST use nodejs.
    // risk.ts imports userService which imports db from firebaseAdmin (Node.js).
    // So we must use Node.js runtime.
};

// We need to export a default handler that routes based on a query param or path
// Since Vercel file-based routing is /api/analyze/[type], we can use a dynamic route.
// But to reduce function count, we want ONE function for ALL analyze.
// So we should move this file to `api/analyze/index.ts` or `api/analyze.ts` 
// and handle `?type=text` etc.

export default async function handler(req: Request) {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    // If we use a dynamic route file like `api/analyze/[type].ts`, it still counts as 1 function?
    // No, dynamic routes usually count as 1 function for all matches.
    // BUT, the user has `api/analyze/text.ts`, `api/analyze/image.ts` etc.
    // These are 5 separate functions.

    // Strategy:
    // 1. Rename `api/analyze/text.ts` to `api/_controllers/analyze/text.ts` (so it's not a route)
    // 2. Create `api/analyze/[type].ts` that imports them and dispatches.

    // Wait, I cannot easily move files and change imports in one go without breaking things.
    // A safer way is to create a new `api/analyze/route.ts` (if using App Router) or `api/analyze/index.ts`
    // and DELETE the individual files.

    // Let's try to consolidate into `api/analyze.ts` and handle routing manually.

    if (!type) {
        return new Response(JSON.stringify(errorResponse(400, 'Missing analysis type')), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    switch (type) {
        case 'text': return (textHandler as any)(req);
        case 'image': return (imageHandler as any)(req);
        case 'video': return (videoHandler as any)(req);
        case 'url': return (urlHandler as any)(req);
        case 'risk': return (riskHandler as any)(req);
        default:
            return new Response(JSON.stringify(errorResponse(400, 'Invalid analysis type')), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
    }
}
