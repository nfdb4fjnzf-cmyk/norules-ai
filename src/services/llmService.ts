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
        return response.data.data;
    }
};
