import api from './api';

export interface AnalysisResult {
    score: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    issues: string[];
    suggestions?: string[];
    details?: string;
    raw?: string;
}

export const analyzerService = {
    analyzeText: async (text: string): Promise<AnalysisResult> => {
        const response = await api.post('/analyze/text', { text });
        if (response.data.code !== 0) throw new Error(response.data.message || 'Analysis failed');
        return response.data.data;
    },

    analyzeImage: async (file: File): Promise<AnalysisResult> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64Image = reader.result as string;
                    const response = await api.post('/analyze/image', { image: base64Image });
                    if (response.data.code !== 0) throw new Error(response.data.message || 'Analysis failed');
                    resolve(response.data.data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
        });
    },

    analyzeVideo: async (videoUri: string): Promise<AnalysisResult> => {
        const response = await api.post('/analyze/video', { videoUri });
        if (response.data.code !== 0) throw new Error(response.data.message || 'Analysis failed');
        return response.data.data;
    },

    analyzeUrl: async (url: string): Promise<AnalysisResult> => {
        const response = await api.post('/analyze/url', { url });
        if (response.data.code !== 0) throw new Error(response.data.message || 'Analysis failed');
        return response.data.data;
    },

    analyzeRisk: async (content: string, platform: 'tiktok' | 'meta' | 'general' = 'general'): Promise<AnalysisResult> => {
        const response = await api.post('/analyze/risk', { content, platform });
        if (response.data.code !== 0) throw new Error(response.data.message || 'Analysis failed');
        return response.data.data;
    },

    analyzeMaterial: async (data: {
        image_base64?: string;
        video_base64?: string;
        video_url?: string;
        copywriting?: string;
        landing_page_url?: string;
        language?: string;
    }): Promise<any> => {
        const response = await api.post('/analyze/material', data);
        if (response.data.code !== 0) throw new Error(response.data.message || 'Analysis failed');
        return response.data.data;
    },
};
