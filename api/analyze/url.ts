import type { VercelRequest, VercelResponse } from '@vercel/node';
import urlHandler from '../_controllers/analyze/url.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Manual CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Encrypted-Key, X-Target-Endpoint, X-Gemini-API-Key, x-gemini-api-key, x-openai-api-key, x-private-mode'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return urlHandler(req, res);
}
