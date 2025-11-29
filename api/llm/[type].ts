import type { VercelRequest, VercelResponse } from '@vercel/node';
import generateHandler from '../_controllers/llm/generate';
import imageHandler from '../_controllers/llm/image';
import videoHandler from '../_controllers/llm/video';
import { errorResponse } from '../_utils/responseFormatter';
import { ErrorCodes } from '../_utils/errorHandler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Encrypted-Key, X-Target-Endpoint, X-Gemini-API-Key'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { type } = req.query;

    switch (type) {
        case 'generate':
            return generateHandler(req, res);
        case 'image':
            return imageHandler(req, res);
        case 'video':
            return videoHandler(req, res);
        default:
            return res.status(404).json(errorResponse(ErrorCodes.NOT_FOUND, 'Invalid LLM Endpoint'));
    }
}
