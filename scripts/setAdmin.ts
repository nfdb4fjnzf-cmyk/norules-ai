import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const setAdmin = async () => {
    const email = process.argv[2];
    if (!email) {
        console.error('Please provide an email address.');
        console.log('Usage: npx tsx scripts/setAdmin.ts <email>');
        process.exit(1);
    }

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
    const auth = admin.auth();

    try {
        console.log(`Looking up user: ${email}...`);
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;
        console.log(`Found user: ${uid}`);

        console.log('Updating role to admin...');
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log('User document not found, creating new one...');
            await userRef.set({
                uid: uid,
                email: email,
                role: 'admin',
                credits: 1000, // Give some default credits for admin
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                mode: 'internal',
                subscription: {
                    plan: 'enterprise',
                    status: 'active'
                }
            });
        } else {
            await userRef.update({
                role: 'admin',
                updatedAt: admin.firestore.Timestamp.now()
            });
        }

        console.log(`✅ Successfully set ${email} as ADMIN.`);
        process.exit(0);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error('❌ User not found. Please check the email.');
        } else {
            console.error('❌ Error:', error);
        }
        process.exit(1);
    }
};

setAdmin();
