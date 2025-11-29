import { db } from '../../config/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

export async function isIpBlocked(ip: string): Promise<boolean> {
    const ipRef = doc(db, 'blocked_ips', ip.replace(/:/g, '_'));
    const ipDoc = await getDoc(ipRef);
    return ipDoc.exists();
}
