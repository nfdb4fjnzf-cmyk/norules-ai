import type { VercelRequest, VercelResponse } from '@vercel/node';
import { decryptTransportKey } from './_utils/encryption';
import { validateRequest } from './_middleware/auth';
import { errorResponse } from './_utils/responseFormatter';
import { ErrorCodes } from './_utils/errorHandler';

// Unified dynamic LLM router
import llmRouter from './_controllers/llm/[type]';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Encrypted-Key, X-Target-Endpoint'
    );

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        // 1. Verify Auth
        await validateRequest(req.headers);

        // 2. Extract headers
        const encryptedKey = req.headers['x-encrypted-key'];
        const targetEndpoint = req.headers['x-target-endpoint'];

        if (!encryptedKey || !targetEndpoint) {
            return res
                .status(400)
                .json(errorResponse(ErrorCodes.BAD_REQUEST, 'Missing X-Encrypted-Key or X-Target-Endpoint'));
        }

        // 3. Decrypt User API Key
        const apiKey = decryptTransportKey(encryptedKey);
        req.headers['x-gemini-api-key'] = apiKey;

        // 4. Route LLM requests via unified [type].ts router
        if (targetEndpoint.startsWith('llm/')) {
            const llmType = targetEndpoint.split('/')[1]; // generate, image, video
            req.query = { ...req.query, type: llmType };
            return llmRouter(req, res);
        }

        return res.status(400).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid Target Endpoint'));
    } catch (err: any) {
        console.error('Secure Proxy Error:', err);
        return res
            .status(500)
            .json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, err.message || 'Internal Server Error'));
    }
}
