import { validateRequest } from '../../_middleware/auth.js';
import { successResponse, errorResponse } from '../../_utils/responseFormatter.js';
import { AppError, ErrorCodes } from '../../_utils/errorHandler.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed'));
    }

    try {
        await validateRequest(req.headers);
        const { id } = req.query;

        if (!id) {
            throw new AppError(ErrorCodes.BAD_REQUEST, 'Generation ID is required', 400);
        }

        const lumaApiKey = process.env.LUMA_API_KEY;
        if (!lumaApiKey) {
            throw new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Luma API Key is missing', 500);
        }

        const lumaResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${lumaApiKey}`
            }
        });

        if (!lumaResponse.ok) {
            const errText = await lumaResponse.text();
            throw new Error(`Luma API Error: ${lumaResponse.status} - ${errText}`);
        }

        const data = await lumaResponse.json();

        // Map Luma status to our status
        // Luma: queued, dreaming, completed, failed
        let status = 'processing';
        let videoUrl = '';

        if (data.state === 'completed') {
            status = 'completed';
            videoUrl = data.assets?.video || '';
        } else if (data.state === 'failed') {
            status = 'failed';
        }

        return res.status(200).json(successResponse({
            id: data.id,
            status: status,
            lumaState: data.state,
            videoUrl: videoUrl,
            failureReason: data.failure_reason
        }));

    } catch (error: any) {
        console.error('Video Status Error:', error);
        const code = error.code || ErrorCodes.INTERNAL_SERVER_ERROR;
        const status = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        return res.status(status).json(errorResponse(code, message));
    }
}
