import { decryptTransportKey } from './_utils/encryption.js';
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

        // 4. Inject API Key into Headers for Controllers
        req.headers['x-gemini-api-key'] = apiKey;

        // 5. Route to Controller
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
        return res.status(500).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal Server Error'));
    }
}
