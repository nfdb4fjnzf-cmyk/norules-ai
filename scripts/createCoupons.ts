import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Timestamp } from 'firebase-admin/firestore';

dotenv.config();

const createCoupons = async () => {
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

    const db = admin.firestore();
    const couponsCollection = db.collection('coupons');

    const coupons = [
        {
            code: 'WELCOME20',
            discountType: 'percent',
            discountValue: 20,
            validFrom: Timestamp.now(),
            validUntil: Timestamp.fromDate(new Date('2030-12-31')),
            maxUses: 1000,
            currentUses: 0,
            isActive: true,
            applicablePlans: [] // All plans
        },
        {
            code: 'SAVE10',
            discountType: 'fixed',
            discountValue: 10,
            validFrom: Timestamp.now(),
            validUntil: Timestamp.fromDate(new Date('2030-12-31')),
            maxUses: 1000,
            currentUses: 0,
            isActive: true,
            applicablePlans: [] // All plans
        },
        {
            code: 'YEARLY50',
            discountType: 'percent',
            discountValue: 50,
            validFrom: Timestamp.now(),
            validUntil: Timestamp.fromDate(new Date('2030-12-31')),
            maxUses: 100,
            currentUses: 0,
            isActive: true,
            applicablePlans: [] // Should check billing cycle in code, but schema only has plans. 
            // We can enforce billing cycle in description or code logic if needed. 
            // For now, let's just make it available for all plans.
        }
    ];

    console.log('Creating coupons...');

    for (const coupon of coupons) {
        await couponsCollection.doc(coupon.code).set(coupon);
        console.log(`Created coupon: ${coupon.code}`);
    }

    console.log('✅ Coupons created successfully.');
    process.exit(0);
};

createCoupons();
