import { decryptTransportKey } from ../_utils/encryption';
import generateHandler from './llm/generate';
import imageHandler from './llm/image';
import videoHandler from './llm/video';
import { validateRequest } from ../_middleware/auth';
import { errorResponse } from ../_utils/responseFormatter';
import { ErrorCodes } from ../_utils/errorHandler';

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed')), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // 1. Validate Auth
        await validateRequest(req.headers);

        // 2. Get Headers
        const encryptedKey = req.headers.get('X-Encrypted-Key');
        const targetEndpoint = req.headers.get('X-Target-Endpoint');

        if (!encryptedKey || !targetEndpoint) {
            return new Response(JSON.stringify(errorResponse(ErrorCodes.BAD_REQUEST, 'Missing X-Encrypted-Key or X-Target-Endpoint')), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Decrypt Key
        const apiKey = decryptTransportKey(encryptedKey);

        // 4. Prepare New Request
        // We must clone the body because we consumed it (if we did). 
        // Actually we haven't consumed it yet in this function, but we need to pass it to the handler.
        // The handler will try to read req.json().
        // If we read it here to stringify it, we consume it.
        // So we read it, then create a new Request with the body.
        const body = await req.json();

        const newHeaders = new Headers(req.headers);
        newHeaders.set('X-Gemini-API-Key', apiKey);
        newHeaders.delete('X-Encrypted-Key');
        newHeaders.delete('X-Target-Endpoint');

        const newReq = new Request(req.url, {
            method: req.method,
            headers: newHeaders,
            body: JSON.stringify(body)
        });

        // 5. Route
        switch (targetEndpoint) {
            case 'llm/generate':
                return generateHandler(newReq);
            case 'llm/image':
                return imageHandler(newReq);
            case 'llm/video':
                return videoHandler(newReq);
            default:
                return new Response(JSON.stringify(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid Target Endpoint')), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
        }

    } catch (error: any) {
        console.error('Secure Proxy Error:', error);
        return new Response(JSON.stringify(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message)), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
