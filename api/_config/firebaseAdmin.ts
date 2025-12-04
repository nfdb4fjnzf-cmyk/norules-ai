import admin from 'firebase-admin';

// Global instance holder
let isInitialized = false;

export function initializeFirebase(env?: any) {
    if (admin.apps.length) {
        isInitialized = true;
        return;
    }

    try {
        let credential;
        // 1. Try process.env (Vercel / Local)
        let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        let projectId = process.env.FIREBASE_PROJECT_ID;

        // 2. Try Cloudflare Env (passed as argument)
        if (!serviceAccountJson && env && env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
        }
        if (!projectId && env && env.FIREBASE_PROJECT_ID) {
            projectId = env.FIREBASE_PROJECT_ID;
        }

        console.log('Initializing Firebase Admin...');

        if (serviceAccountJson) {
            try {
                const serviceAccount = typeof serviceAccountJson === 'string'
                    ? JSON.parse(serviceAccountJson)
                    : serviceAccountJson;

                // Patch project_id if missing
                if (!serviceAccount.project_id && projectId) {
                    serviceAccount.project_id = projectId;
                }

                if (!serviceAccount.project_id) {
                    throw new Error(`Missing project_id. Keys: ${Object.keys(serviceAccount).join(',')}`);
                }

                credential = admin.credential.cert(serviceAccount);
            } catch (e: any) {
                console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', e);
                throw e;
            }
        } else {
            // Fallback to individual vars (Vercel only usually)
            if (!projectId) {
                // If we are here, we really have no creds.
                // But maybe we are in build phase?
                console.warn('No Firebase credentials found. Skipping init.');
                return;
            }

            console.log('Using individual env vars for Firebase creds');
            credential = admin.credential.cert({
                projectId: projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL || (env && env.FIREBASE_CLIENT_EMAIL),
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || (env && env.FIREBASE_PRIVATE_KEY))?.replace(/\\n/g, '\n'),
            });
        }

        admin.initializeApp({
            credential,
        });
        isInitialized = true;
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
        throw error;
    }
}

// Auto-init for Vercel (where process.env is available immediately)
if (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PROJECT_ID) {
    try {
        initializeFirebase();
    } catch (e) {
        console.error('Auto-init failed (suppressed to allow module load):', e);
    }
}

// Use Proxy to allow lazy initialization (required for Cloudflare Workers)
export const db = new Proxy({} as admin.firestore.Firestore, {
    get: (_target, prop) => {
        if (!isInitialized && !admin.apps.length) {
            throw new Error('Firebase Admin not initialized. Call initializeFirebase(env) first.');
        }
        return (admin.firestore() as any)[prop];
    }
});

export const auth = new Proxy({} as admin.auth.Auth, {
    get: (_target, prop) => {
        if (!isInitialized && !admin.apps.length) {
            throw new Error('Firebase Admin not initialized. Call initializeFirebase(env) first.');
        }
        return (admin.auth() as any)[prop];
    }
});
