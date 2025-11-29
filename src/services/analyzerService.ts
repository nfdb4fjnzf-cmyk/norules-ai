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
                    resolve(response.data.data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
        });
    },

    analyzeVideo: async (videoUri: string): Promise<AnalysisResult> => {
        // Note: This expects a Google File API URI or similar. 
        // For MVP with small files, we might try base64 but Gemini Video usually needs File API.
        // If we are just sending a URL (e.g. YouTube or public URL), we use the URL endpoint or a specific video one.
        // For now, let's assume the backend handles the URI we pass.
        const response = await api.post('/analyze/video', { videoUri });
        return response.data.data;
    },

    analyzeUrl: async (url: string): Promise<AnalysisResult> => {
        const response = await api.post('/analyze/url', { url });
        return response.data.data;
    },

    analyzeRisk: async (content: string, platform: 'tiktok' | 'meta' | 'general' = 'general'): Promise<AnalysisResult> => {
        const response = await api.post('/analyze/risk', { content, platform });
        return response.data.data;
    },
};
