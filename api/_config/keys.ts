export const PRIVATE_KEY = process.env.PROD_RSA_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';

if (!PRIVATE_KEY && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: PROD_RSA_PRIVATE_KEY is missing in environment variables.');
}
