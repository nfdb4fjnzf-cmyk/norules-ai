import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in .env file');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log('Fetching available models...');
        // The SDK doesn't have a direct listModels method on the main class in some versions,
        // but let's try to infer or use the model manager if available.
        // Actually, for the JS SDK, we might need to use the REST API or check if there is a helper.
        // Wait, the error message said "Call ListModels to see the list...".
        // Let's try to use the model manager if it exists, or just try to generate with a known model to verify connectivity.

        // Since I can't easily list models with the simplified SDK without looking up the specific method (it's often on a ModelManager),
        // I will try to generate content with a few candidate names to see which one works.

        const candidates = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash-001',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest',
            'gemini-1.5-pro-001',
            'gemini-pro'
        ];

        for (const modelName of candidates) {
            console.log(`Testing model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hello, are you there?');
                const response = await result.response;
                console.log(`✅ SUCCESS: ${modelName}`);
            } catch (error: any) {
                console.log(`❌ FAILED: ${modelName} - ${error.message.split('\n')[0]}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
