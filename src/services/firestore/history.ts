import { db } from '../../config/firebaseClient';
import { collection, doc, addDoc, getDocs, getDoc, query, orderBy, limit as limitQuery, startAfter } from 'firebase/firestore';

export interface HistoryLog {
    id: string;
    userId: string;
    timestamp: number; // Unix timestamp
    mode: 'INTERNAL' | 'EXTERNAL';
    apiPath: string;
    prompt: string;
    resultSummary: string;
    pointsDeducted?: number;
    quotaRemaining?: number;
    tokensUsed?: number;
    errorCode?: number;
    status: 'SUCCESS' | 'FAILURE';
}

export async function addHistoryLog(log: Omit<HistoryLog, 'id' | 'timestamp'>): Promise<string> {
    const timestamp = Date.now();
    const newLog = {
        ...log,
        timestamp
    };

    // Add to users/{userId}/logs
    const logsRef = collection(db, 'users', log.userId, 'logs');
    const docRef = await addDoc(logsRef, newLog);
    return docRef.id;
}

export async function getHistoryLogs(userId: string, limit: number = 20, cursor?: string): Promise<{ logs: HistoryLog[], nextCursor: string | null }> {
    const logsRef = collection(db, 'users', userId, 'logs');
    let q = query(logsRef, orderBy('timestamp', 'desc'), limitQuery(limit));

    if (cursor) {
        const cursorDocRef = doc(db, 'users', userId, 'logs', cursor);
        const cursorDoc = await getDoc(cursorDocRef);
        if (cursorDoc.exists()) {
            q = query(logsRef, orderBy('timestamp', 'desc'), startAfter(cursorDoc), limitQuery(limit));
        }
    }

    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as HistoryLog[];

    const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

    return { logs, nextCursor };
}

export async function getHistoryLogDetail(userId: string, logId: string): Promise<HistoryLog | null> {
    const logRef = doc(db, 'users', userId, 'logs', logId);
    const logDoc = await getDoc(logRef);
    if (!logDoc.exists()) return null;
    return { id: logDoc.id, ...logDoc.data() } as HistoryLog;
}
