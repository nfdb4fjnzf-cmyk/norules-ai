import { errorResponse } from '../_utils/responseFormatter';
import textHandler from '../_controllers/analyze/text';
import imageHandler from '../_controllers/analyze/image';
import videoHandler from '../_controllers/analyze/video';
import urlHandler from '../_controllers/analyze/url';
import riskHandler from '../_controllers/analyze/risk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    runtime: 'nodejs', // Must be nodejs because risk/video use firebase-admin
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Private-Mode'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { type } = req.query;

    if (!type || Array.isArray(type)) {
        return res.status(400).json(errorResponse(400, `Invalid analysis type: ${type}`));
    }

    switch (type) {
        case 'text': return textHandler(req, res);
        case 'image': return imageHandler(req, res);
        case 'video': return videoHandler(req, res);
        case 'url': return urlHandler(req, res);
        case 'risk': return riskHandler(req, res);
        default:
            return res.status(400).json(errorResponse(400, `Invalid analysis type: ${type}`));
    }
}
