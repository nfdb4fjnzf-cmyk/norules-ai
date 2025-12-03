import { db, auth, initializeFirebase } from '../_config/firebaseAdmin.js';

export async function resetStagingData(env: any) {
    console.log('Starting Staging Data Reset...');

    // 1. Initialize (if not already)
    initializeFirebase(env);

    // 2. SAFETY CHECK - CRITICAL
    // We must ensure we are definitely in staging environment
    const projectId = env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (projectId !== 'noai-staging') {
        console.error(`ABORTING RESET: Project ID is '${projectId}', expected 'noai-staging'.`);
        return;
    }

    try {
        // 3. Delete All Users (except specific whitelist if needed, but for now wipe all)
        console.log('Deleting all users...');
        await deleteAllUsers();

        // 4. Delete All Firestore Collections
        console.log('Deleting all Firestore collections...');
        await deleteCollection(db, 'users', 50);
        await deleteCollection(db, 'generations', 50);
        await deleteCollection(db, 'transactions', 50);
        // Add other collections here as needed

        console.log('Staging Data Reset Complete.');
    } catch (error) {
        console.error('Staging Reset Failed:', error);
    }
}

async function deleteAllUsers(nextPageToken?: string) {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map((user) => user.uid);

    if (uids.length > 0) {
        await auth.deleteUsers(uids);
        console.log(`Deleted ${uids.length} users.`);
    }

    if (listUsersResult.pageToken) {
        await deleteAllUsers(listUsersResult.pageToken);
    }
}

async function deleteCollection(db: any, collectionPath: string, batchSize: number) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db: any, query: any, resolve: any) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}
