import api from './api';

export interface LLMResponse {
    data: {
        text: string;
        mediaUrl?: string;
        mediaType?: 'image' | 'video';
    };
    riskScore: number;
    meta?: any;
}

export const llmService = {
    generateText: async (prompt: string, model: string, targetRiskScore: number, privateMode: boolean = false): Promise<LLMResponse> => {
        const response = await api.post('/llm/generate', { prompt, model, targetRiskScore, privateMode });
        return response.data.data;
    },

    generateImage: async (prompt: string, model: string, targetRiskScore: number, aspectRatio?: string, privateMode: boolean = false): Promise<LLMResponse> => {
        const response = await api.post('/llm/image', { prompt, model, targetRiskScore, aspectRatio, privateMode });
        return response.data.data;
    },

    generateVideo: async (prompt: string, model: string, targetRiskScore: number, aspectRatio?: string, privateMode: boolean = false): Promise<LLMResponse> => {
        const response = await api.post('/llm/video', { prompt, model, targetRiskScore, aspectRatio, privateMode });
        const initialData = response.data.data;

        if (initialData.status === 'processing' && initialData.id) {
            // Poll for completion
            const pollInterval = 5000; // 5 seconds
            const maxAttempts = 60; // 5 minutes timeout
            let attempts = 0;

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;

                try {
                    const statusRes = await api.get(`/llm/video/status?id=${initialData.id}`);
                    const statusData = statusRes.data.data;

                    if (statusData.status === 'completed') {
                        return {
                            data: {
                                text: `Video generated successfully via Luma.`,
                                mediaUrl: statusData.videoUrl,
                                mediaType: 'video'
                            },
                            riskScore: targetRiskScore,
                            meta: initialData.meta
                        };
                    } else if (statusData.status === 'failed') {
                        throw new Error(`Video generation failed: ${statusData.failureReason || 'Unknown error'}`);
                    }
                    // Continue polling if 'processing'
                } catch (e) {
                    console.warn('Polling error:', e);
                    // Continue polling on transient errors
                }
            }
            throw new Error('Video generation timed out');
        }

        return initialData;
    }
};
