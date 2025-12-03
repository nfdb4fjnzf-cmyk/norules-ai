import { usageService } from '../api/_services/usageService.js';
import { queueService } from '../api/_services/queueService.js';
import { db } from '../api/_config/firebaseAdmin.js';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const verifyV3Core = async () => {
    console.log('🚀 Starting V3 Core Verification...');

    // Initialize Firebase Admin
    if (!admin.apps.length) {
        try {
            let credential;
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                credential = admin.credential.cert(serviceAccount);
            } else {
                credential = admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                });
            }

            admin.initializeApp({
                credential,
            });
        } catch (error) {
            console.error('Firebase admin initialization error', error);
            process.exit(1);
        }
    }

    // 0. Setup Test User
    const testEmail = 'test_v3_core@noai.com';
    let userId = '';

    try {
        const userRecord = await admin.auth().getUserByEmail(testEmail);
        userId = userRecord.uid;
        console.log(`Found test user: ${userId}`);
    } catch (e) {
        console.log('Creating test user...');
        const userRecord = await admin.auth().createUser({
            email: testEmail,
            password: 'password123'
        });
        userId = userRecord.uid;
        // Give credits
        await db.collection('users').doc(userId).set({
            credits: 100,
            email: testEmail
        });
        console.log(`Created test user: ${userId} with 100 credits`);
    }

    try {
        // 1. Test Usage Start
        console.log('\n--- 1. Testing Usage Start ---');
        const estimate = 3;
        const { operationId } = await usageService.start(userId, 'image', estimate, { prompt: 'test image' });
        console.log(`Usage Started. OpId: ${operationId}`);

        const opDoc = await db.collection('usage_operations').doc(operationId).get();
        if (!opDoc.exists || opDoc.data()?.status !== 'pending') {
            throw new Error('Usage Operation creation failed');
        }
        console.log('✅ Usage Operation created (pending).');

        // 2. Test Queue Creation
        console.log('\n--- 2. Testing Queue Creation ---');
        const jobId = await queueService.createJob(userId, 'image', { prompt: 'test image' }, operationId);
        console.log(`Job Created. JobId: ${jobId}`);

        const jobDoc = await db.collection('creative_jobs').doc(jobId).get();
        if (!jobDoc.exists || jobDoc.data()?.status !== 'pending') {
            throw new Error('Job creation failed');
        }
        console.log('✅ Job created (pending).');

        // 3. Test Worker Polling (Simulated)
        console.log('\n--- 3. Testing Worker Polling ---');
        const pendingJobs = await queueService.fetchPendingJobs(10);
        const myJob = pendingJobs.find(j => j.jobId === jobId);

        if (!myJob) {
            throw new Error('Worker failed to fetch the pending job');
        }
        console.log('✅ Worker fetched pending job.');

        // 4. Test Job Processing (Simulated)
        console.log('\n--- 4. Testing Job Processing ---');
        await queueService.updateJobStatus(jobId, 'processing');
        console.log('Job marked processing.');

        // Simulate Success
        const result = { url: 'http://example.com/image.png' };
        await queueService.updateJobStatus(jobId, 'success', result);
        console.log('Job marked success.');

        // 5. Test Usage Finalize
        console.log('\n--- 5. Testing Usage Finalize ---');
        await usageService.finalize(operationId, estimate, false, result);
        console.log('Usage Finalized.');

        const finalOpDoc = await db.collection('usage_operations').doc(operationId).get();
        if (finalOpDoc.data()?.status !== 'success') {
            throw new Error('Usage Finalization failed');
        }
        console.log('✅ Usage Operation marked success.');

        console.log('\n🎉 V3 Core Verification PASSED!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
};

verifyV3Core();
