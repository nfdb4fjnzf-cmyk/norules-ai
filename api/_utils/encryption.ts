import { privateDecrypt, constants } from 'crypto';
import { PRIVATE_KEY } from '../_config/keys.js';

export function decryptTransportKey(cipherText: string): string {
    if (!PRIVATE_KEY) {
        console.error("Decryption failed: Server Private Key is missing");
        throw new Error("Server Configuration Error");
    }

    try {
        const buffer = Buffer.from(cipherText, 'base64');

        const decryptedBuffer = privateDecrypt(
            {
                key: PRIVATE_KEY,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            buffer
        );

        const payloadString = decryptedBuffer.toString('utf8');
        const payload = JSON.parse(payloadString);

        // Verify Timestamp (Replay Attack Protection)
        const now = Date.now();
        const drift = Math.abs(now - payload.timestamp);

        // Allow 60 seconds drift
        if (drift > 60000) {
            throw new Error("Encrypted payload expired (Replay Attack detected)");
        }

        return payload.key;

    } catch (e: any) {
        console.error("Backend Decryption Failed:", e.message);
        throw new Error("Invalid Encrypted Key");
    }
}
