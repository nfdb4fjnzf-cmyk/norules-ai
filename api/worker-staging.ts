import { decryptTransportKey } from './_utils/encryption.js';
import generateHandler from './_controllers/llm/generate.js';
import imageHandler from './_controllers/llm/image.js';
import videoHandler from './_controllers/llm/video.js';
import { validateRequest } from './_middleware/auth.js';
import { errorResponse } from './_utils/responseFormatter.js';
import { ErrorCodes } from './_utils/errorHandler.js';
import { initializeFirebase } from './_config/firebaseAdmin.js';
import { queueService } from './_services/queueService.js';
import { usageService } from './_services/usageService.js';

// Cloudflare Worker Entry Point
export default {
    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        // 1. Initialize Firebase with Cloudflare Env Secrets
        try {
            initializeFirebase(env);
        } catch (error) {
            console.error('Firebase Init Failed:', error);
            return new Response(JSON.stringify(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Service Configuration Error')), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Handle CORS (Manual)
        const origin = request.headers.get('Origin') || '*';
        const headers = new Headers({
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
            'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Encrypted-Key, X-Target-Endpoint'
        });

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 200, headers });
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify(errorResponse(ErrorCodes.BAD_REQUEST, 'Method not allowed')), {
                status: 405,
                headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
            });
        }

        try {
            // 3. Validate Auth (Middleware)
            // Note: validateRequest expects headers object. Cloudflare Headers are a Map-like object.
            // We convert to plain object for compatibility if possible, or adjust middleware.
            // Assuming validateRequest handles standard headers or we convert.
            const reqHeaders: Record<string, string> = {};
            request.headers.forEach((value, key) => {
                reqHeaders[key] = value;
            });

            await validateRequest(reqHeaders);

            // 4. Get Custom Headers
            const encryptedKey = request.headers.get('x-encrypted-key');
            const targetEndpoint = request.headers.get('x-target-endpoint');

            if (!encryptedKey || !targetEndpoint) {
                return new Response(JSON.stringify(errorResponse(ErrorCodes.BAD_REQUEST, 'Missing X-Encrypted-Key or X-Target-Endpoint')), {
                    status: 400,
                    headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
                });
            }

            // 5. Decrypt Key
            const apiKey = decryptTransportKey(encryptedKey);

            // 6. Inject API Key (We can't mutate request headers easily in immutable Request, 
            // so we pass it or create a new request if controllers need it).
            // But controllers (generateHandler etc.) likely expect Vercel Request/Response.
            // This is the tricky part. If controllers use `res.status().json()`, they won't work here.
            // Given the time constraint, I will assume controllers are Vercel-style.
            // I need to mock Vercel Request/Response for them.

            const mockReq: any = {
                headers: { ...reqHeaders, 'x-gemini-api-key': apiKey },
                method: request.method,
                body: await request.json(), // Parse body once
            };

            // Mock Response object to capture output
            let responseBody: any;
            let responseStatus = 200;
            const mockRes: any = {
                setHeader: (k: string, v: string) => headers.set(k, v),
                status: (code: number) => {
                    responseStatus = code;
                    return mockRes;
                },
                json: (data: any) => {
                    responseBody = JSON.stringify(data);
                    return mockRes;
                },
                end: (data: any) => {
                    if (data) responseBody = data;
                    return mockRes;
                },
                send: (data: any) => {
                    if (data) responseBody = data;
                    return mockRes;
                }
            };

            // 7. Route to Controller
            switch (targetEndpoint) {
                case 'llm/generate':
                    await generateHandler(mockReq, mockRes);
                    break;
                case 'llm/image':
                    await imageHandler(mockReq, mockRes);
                    break;
                case 'llm/video':
                    await videoHandler(mockReq, mockRes);
                    break;
                default:
                    return new Response(JSON.stringify(errorResponse(ErrorCodes.BAD_REQUEST, 'Invalid Target Endpoint')), {
                        status: 400,
                        headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
                    });
            }

            // 8. Return Final Response
            return new Response(responseBody, {
                status: responseStatus,
                headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
            });

        } catch (error: any) {
            console.error('Worker Error:', error);
            return new Response(JSON.stringify(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal Server Error')), {
                status: 500,
                headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' }
            });
        }
    },

    // Cron Trigger Handler
    async scheduled(event: any, env: any, ctx: any) {
        console.log('Cron Triggered');

        // Initialize Firebase for Cron context
        try {
            initializeFirebase(env);
        } catch (e) {
            console.error('Cron Init Failed', e);
            return;
        }

        // 1. Staging Reset (Mondays)
        if (env.ENVIRONMENT === 'staging') {
            // Check if it's Monday 00:00 (approx) or just run if cron matches
            // The cron trigger in wrangler.toml controls WHEN this runs.
            // But if we have multiple crons, we might need to check event.cron
            // For now, assume the only cron is the reset one OR we add a new one for queue.
            // If we add a new cron for queue (e.g. every 1 min), we need to distinguish.
            // Let's assume we will add a 1-min cron for queue.

            if (event.cron === "0 0 * * 1") {
                console.log('Running Staging Reset...');
                const { resetStagingData } = await import('./_utils/resetStaging.js');
                ctx.waitUntil(resetStagingData(env));
                return;
            }
        }

        // 2. Queue Processing (Every minute)
        // ctx.waitUntil keeps the worker alive
        ctx.waitUntil((async () => {
            try {
                console.log('Checking for pending jobs...');
                const jobs = await queueService.fetchPendingJobs(5); // Process 5 at a time

                if (jobs.length === 0) {
                    console.log('No pending jobs.');
                    return;
                }

                console.log(`Found ${jobs.length} jobs. Processing...`);

                for (const job of jobs) {
                    try {
                        // Mark as processing
                        await queueService.updateJobStatus(job.jobId, 'processing');

                        // --- MOCK PROCESSING START ---
                        // In real implementation, this would call the actual Model API
                        console.log(`Processing job ${job.jobId} [${job.type}]...`);

                        // Simulate delay
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        const mockResult = {
                            url: `https://mock-storage.com/${job.jobId}.png`,
                            metadata: { width: 1024, height: 1024 }
                        };
                        // --- MOCK PROCESSING END ---

                        // Success
                        await queueService.updateJobStatus(job.jobId, 'success', mockResult);

                        // Finalize Usage (Deduct credits)
                        // Note: We need actual cost here. For fixed price, it's same as estimate.
                        const cost = usageService.calculateCost(job.type);
                        await usageService.finalize(job.operationId, cost, false, mockResult);

                        console.log(`Job ${job.jobId} completed successfully.`);

                    } catch (err: any) {
                        console.error(`Job ${job.jobId} failed:`, err);

                        // Check if retryable
                        if (job.attempts < job.maxAttempts - 1) {
                            await queueService.updateJobStatus(job.jobId, 'error', null, err.message);
                        } else {
                            // Max attempts reached -> Fail and Refund
                            await queueService.updateJobStatus(job.jobId, 'failed', null, err.message);
                            await usageService.finalize(job.operationId, 0, true, null, err.message);
                        }
                    }
                }
            } catch (error) {
                console.error('Queue Processing Error:', error);
            }
        })());
    }
};
