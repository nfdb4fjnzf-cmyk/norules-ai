import { decryptTransportKey } from '../_utils/encryption.js';
import generateHandler from './_controllers/llm/generate.js';
import imageHandler from './_controllers/llm/image.js';
import videoHandler from './_controllers/llm/video.js';
import { validateRequest } from './_middleware/auth.js';
import { errorResponse } from './_utils/responseFormatter.js';
import { ErrorCodes } from './_utils/errorHandler.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Encrypted-Key, X-Target-Endpoint'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        // 1. Validate Auth
        await validateRequest(req.headers);

        // 2. Get Headers
        const encryptedKey = req.headers['x-encrypted-key'] as string;
        const targetEndpoint = req.headers['x-target-endpoint'] as string;

        if (!encryptedKey || !targetEndpoint) {
            return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Missing X-Encrypted-Key or X-Target-Endpoint'));
        }

        // 3. Decrypt Key
        const apiKey = decryptTransportKey(encryptedKey);

        // 4. Prepare Context for Controller
        // Since we are inside the same Vercel function environment, we can't easily "forward" the request object 
        // with modified headers to another handler function that expects VercelRequest.
        // Instead, we should manually inject the API key into the body or context, 
        // OR (simpler for now) just set it in the current request object's headers if possible, 
        // but VercelRequest headers might be read-only or difficult to mock.

        // However, our controllers (generateHandler, etc.) likely read from process.env or req.headers.
        // If they read from req.headers['x-gemini-api-key'], we need to mock that.

        // A better approach for this "proxy" pattern within serverless is to just call the controller logic directly.
        // But the controllers expect (req, res).

        // Let's try to modify the headers of the incoming req object.
        req.headers['x-gemini-api-key'] = apiKey;

        // 5. Route
        switch (targetEndpoint) {
            case 'llm/generate':
                return generateHandler(req, res);
            case 'llm/image':
                return imageHandler(req, res);
            case 'llm/video':
                return videoHandler(req, res);
            default:
                return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid Target Endpoint'));
        }

    } catch (error: any) {
        console.error('Secure Proxy Error:', error);
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message));
    }
}
