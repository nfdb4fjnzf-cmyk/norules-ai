import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const initV3Schema = async () => {
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
    const collections = [
        'orgs',
        'projects',
        'creative_jobs',
        'compliance_fixes',
        'ad_campaigns',
        'ad_performance'
    ];

    console.log('🚀 Initializing NoAI V3 Database Schema...');

    for (const colName of collections) {
        try {
            const colRef = db.collection(colName);
            const schemaDocRef = colRef.doc('_schema_v3_init');

            // Check if already initialized
            const doc = await schemaDocRef.get();
            if (doc.exists) {
                console.log(`✅ Collection [${colName}] already initialized.`);
                continue;
            }

            // Create a placeholder document to "initialize" the collection
            // In Firestore, collections come into existence when a document is created.
            await schemaDocRef.set({
                _initializedAt: admin.firestore.Timestamp.now(),
                _version: 'v3.0.0',
                _description: `NoAI V3 Collection: ${colName}`,
                _schema_locked: true
            });

            console.log(`✨ Created collection [${colName}] with init doc.`);

        } catch (error) {
            console.error(`❌ Failed to initialize collection [${colName}]:`, error);
        }
    }

    console.log('🎉 V3 Schema Initialization Complete.');
    process.exit(0);
};

initV3Schema();
