import { db } from '../_config/firebaseAdmin.js';
import { AppError, ErrorCodes } from '../_utils/errorHandler.js';

export interface LandingPageConfig {
    industry: string;
    targetAudience: string;
    marketingGoal: string;
    productName: string;
    tone: string;
    language: string;
}

export interface LandingPageContent {
    html?: string;
    headline?: string;
    bodyCopy?: string;
    ctaText?: string;
    images?: string[];
}

export interface LandingPageDeployment {
    status: 'draft' | 'generating' | 'deploying' | 'live' | 'failed';
    url?: string;
    subdomain?: string;
    lastDeployedAt?: string;
    error?: string;
}

export interface LandingPage {
    id: string;
    userId: string;
    name: string; // Project name
    config: LandingPageConfig;
    content: LandingPageContent;
    deployment: LandingPageDeployment;
    stats: {
        views: number;
        clicks: number;
    };
    createdAt: string;
    updatedAt: string;
}

const COLLECTION = 'landing_pages';

export const landingPageService = {
    /**
     * Create a new landing page project
     */
    create: async (userId: string, name: string, config: LandingPageConfig): Promise<LandingPage> => {
        const docRef = db.collection(COLLECTION).doc();
        const now = new Date().toISOString();

        const newPage: LandingPage = {
            id: docRef.id,
            userId,
            name,
            config,
            content: {},
            deployment: {
                status: 'draft'
            },
            stats: {
                views: 0,
                clicks: 0
            },
            createdAt: now,
            updatedAt: now
        };

        await docRef.set(newPage);
        return newPage;
    },

    /**
     * Get a landing page by ID
     */
    get: async (id: string): Promise<LandingPage | null> => {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return doc.data() as LandingPage;
    },

    /**
     * List landing pages for a user
     */
    listByUser: async (userId: string): Promise<LandingPage[]> => {
        const snapshot = await db.collection(COLLECTION)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => doc.data() as LandingPage);
    },

    /**
     * Update landing page content or config
     */
    update: async (id: string, userId: string, updates: Partial<LandingPage>): Promise<void> => {
        const ref = db.collection(COLLECTION).doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Landing page not found', 404);
        }

        const data = doc.data() as LandingPage;
        if (data.userId !== userId) {
            throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
        }

        await ref.update({
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },

    /**
     * Delete a landing page
     */
    delete: async (id: string, userId: string): Promise<void> => {
        const ref = db.collection(COLLECTION).doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Landing page not found', 404);
        }

        const data = doc.data() as LandingPage;
        if (data.userId !== userId) {
            throw new AppError(ErrorCodes.FORBIDDEN, 'Access denied', 403);
        }

        await ref.delete();
    }
};
