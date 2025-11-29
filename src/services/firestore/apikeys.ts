import { db } from '../../config/firebaseClient';
import { collection, doc, addDoc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

export interface ApiKey {
    id: string;
    uid: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsed: string;
}

export async function generateApiKey(uid: string, name: string): Promise<ApiKey> {
    const key = 'sk-' + crypto.randomUUID().replace(/-/g, '');
    const now = new Date().toISOString();

    const newKey: ApiKey = {
        id: '', // Will be set after creation
        uid,
        name,
        key,
        createdAt: now,
        lastUsed: now
    };

    // Add to users/{uid}/apikeys
    const userKeysRef = collection(db, 'users', uid, 'apikeys');
    const docRef = await addDoc(userKeysRef, newKey);

    // Global lookup
    const globalKeyRef = doc(db, 'apikeys', key);
    await setDoc(globalKeyRef, { uid, keyId: docRef.id });

    return { ...newKey, id: docRef.id };
}

export async function listApiKeys(uid: string): Promise<ApiKey[]> {
    const userKeysRef = collection(db, 'users', uid, 'apikeys');
    const snapshot = await getDocs(userKeysRef);
    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ApiKey[];
}

export async function deleteApiKey(uid: string, keyId: string): Promise<void> {
    const keyRef = doc(db, 'users', uid, 'apikeys', keyId);
    const keyDoc = await getDoc(keyRef);
    if (!keyDoc.exists()) return;

    const keyData = keyDoc.data();

    if (keyData && keyData.key) {
        const globalKeyRef = doc(db, 'apikeys', keyData.key);
        await deleteDoc(globalKeyRef);
    }

    await deleteDoc(keyRef);
}

export async function validateApiKey(key: string): Promise<string | null> {
    const globalKeyRef = doc(db, 'apikeys', key);
    const keyDoc = await getDoc(globalKeyRef);
    if (!keyDoc.exists()) return null;
    return keyDoc.data()?.uid || null;
}
