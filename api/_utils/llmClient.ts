// --- Configuration ---
const DEFAULT_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = process.env.LLM_MODEL_NAME || 'gemini-1.5-flash';

// --- Interfaces ---
export interface LLMResponse {
    text: string;
    tokensUsed: number;
}

export interface GenerativePart {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

export type LLMInput = string | (string | GenerativePart)[];

// --- Real LLM Client ---
export async function callLLM(input: LLMInput, systemInstruction?: string, apiKey?: string): Promise<LLMResponse> {
    const keyToUse = apiKey || DEFAULT_API_KEY;

    if (!keyToUse) {
        throw new Error('API Key is missing. Please provide an API key or set GEMINI_API_KEY.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${keyToUse}`;

    // Format contents based on input type
    let parts: any[] = [];
    if (typeof input === 'string') {
        parts = [{ text: input }];
    } else if (Array.isArray(input)) {
        parts = input.map(item => {
            if (typeof item === 'string') {
                return { text: item };
            } else {
                return item; // GenerativePart
            }
        });
    }

    const body: any = {
        contents: [{ parts }],
        generationConfig: {
            responseMimeType: "application/json" // Force JSON mode
        }
    };

    if (systemInstruction) {
        body.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 400 || response.status === 403) {
                throw new Error(`Invalid API Key or Permission Denied: ${response.status}`);
            }
            throw new Error(`LLM API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

        return {
            text,
            tokensUsed
        };

    } catch (error) {
        console.error('LLM Call Failed:', error);
        throw error;
    }
}

// Helper to convert ArrayBuffer to Base64
export async function bufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
