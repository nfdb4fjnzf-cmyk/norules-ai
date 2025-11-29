import type { VercelRequest, VercelResponse } from '@vercel/node';
import textHandler from '../_controllers/analyze/text.js';
import imageHandler from '../_controllers/analyze/image.js';
import videoHandler from '../_controllers/analyze/video.js';
import urlHandler from '../_controllers/analyze/url.js';
import riskHandler from '../_controllers/analyze/risk.js';
import { errorResponse } from '../_utils/responseFormatter.js';
import { ErrorCodes } from '../_utils/errorHandler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
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

    const { type } = req.query;

    switch (type) {
        case 'text':
            return textHandler(req, res);
        case 'image':
            return imageHandler(req, res);
        case 'video':
            return videoHandler(req, res);
        case 'url':
            return urlHandler(req, res);
        case 'risk':
            return riskHandler(req, res);
        default:
            return res.status(404).json(errorResponse(ErrorCodes.NOT_FOUND, 'Invalid Analysis Endpoint'));
    }
}
