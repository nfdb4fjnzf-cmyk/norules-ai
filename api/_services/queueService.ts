import { db } from '../_config/firebaseAdmin.js';
import admin from 'firebase-admin';

export interface CreativeJob {
    jobId: string;
    userId: string;
    type: 'image' | 'video' | 'lp';
    status: 'pending' | 'processing' | 'success' | 'failed' | 'error';
    attempts: number;
    maxAttempts: number;
    input: any;
    output?: any;
    operationId: string; // Linked usage_operation
    errorMessage?: string;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

export const queueService = {
    /**
     * Create a new Job in Queue
     */
    createJob: async (
        userId: string,
        type: CreativeJob['type'],
        input: any,
        operationId: string
    ): Promise<string> => {
        const jobRef = db.collection('creative_jobs').doc();
        const jobId = jobRef.id;

        await jobRef.set({
            jobId,
            userId,
            type,
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
            input,
            operationId,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        });

        return jobId;
    },

    /**
     * Fetch Pending Jobs (for Worker)
     * Fetches 'pending' jobs or 'error' jobs that haven't exceeded maxAttempts.
     */
    fetchPendingJobs: async (limit: number = 10): Promise<CreativeJob[]> => {
        // 1. Fetch 'pending'
        // TODO: Restore .orderBy('createdAt', 'asc') after deploying firestore.indexes.json
        const pendingSnapshot = await db.collection('creative_jobs')
            .where('status', '==', 'pending')
            // .orderBy('createdAt', 'asc') // Requires composite index
            .limit(limit)
            .get();

        const jobs = pendingSnapshot.docs.map(doc => doc.data() as CreativeJob);

        // 2. If we have space, fetch 'error' (retryable)
        if (jobs.length < limit) {
            const errorSnapshot = await db.collection('creative_jobs')
                .where('status', '==', 'error')
                // .orderBy('createdAt', 'asc') // Requires composite index
                .limit(limit - jobs.length)
                .get();

            const errorJobs = errorSnapshot.docs.map(doc => doc.data() as CreativeJob);
            // Filter locally for attempts < maxAttempts (Firestore query limitation on mixed fields)
            const retryableJobs = errorJobs.filter(job => job.attempts < job.maxAttempts);

            jobs.push(...retryableJobs);
        }

        return jobs;
    },

    /**
     * Update Job Status
     */
    updateJobStatus: async (
        jobId: string,
        status: CreativeJob['status'],
        result: any = null,
        errorMessage: string | null = null
    ): Promise<void> => {
        const jobRef = db.collection('creative_jobs').doc(jobId);

        const updateData: any = {
            status,
            updatedAt: admin.firestore.Timestamp.now()
        };

        if (result) updateData.output = result;
        if (errorMessage) updateData.errorMessage = errorMessage;

        if (status === 'processing' || status === 'error') {
            updateData.attempts = admin.firestore.FieldValue.increment(1);
        }

        await jobRef.update(updateData);
    },

    /**
     * Get Job by ID
     */
    getJob: async (jobId: string): Promise<CreativeJob | null> => {
        const doc = await db.collection('creative_jobs').doc(jobId).get();
        if (!doc.exists) return null;
        return doc.data() as CreativeJob;
    }
};
