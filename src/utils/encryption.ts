import { PUBLIC_KEY } from '../config/keys';

// AES-256-GCM Encryption Utility (For Local Storage)

const STORAGE_KEY_NAME = 'adguardian_session_key';

// 1. Generate or Retrieve Session Key (for LocalStorage)
export const getSessionKey = async (): Promise<CryptoKey> => {
    // Try to get from sessionStorage
    const storedJson = sessionStorage.getItem(STORAGE_KEY_NAME);
    if (storedJson) {
        const jwk = JSON.parse(storedJson);
        return window.crypto.subtle.importKey(
            "jwk",
            jwk,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    // Generate new key
    const key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // Export and save to sessionStorage
    const jwk = await window.crypto.subtle.exportKey("jwk", key);
    sessionStorage.setItem(STORAGE_KEY_NAME, JSON.stringify(jwk));

    return key;
};

// 2. Encrypt for LocalStorage
export const encryptLocal = async (text: string): Promise<string> => {
    const key = await getSessionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoded
    );

    // Combine IV and Data
    const buffer = new Uint8Array(iv.byteLength + encrypted.byteLength);
    buffer.set(iv);
    buffer.set(new Uint8Array(encrypted), iv.byteLength);

    // Convert to Base64
    return btoa(String.fromCharCode(...buffer));
};

// 3. Decrypt from LocalStorage
export const decryptLocal = async (cipherText: string): Promise<string> => {
    try {
        const key = await getSessionKey();
        const buffer = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));

        const iv = buffer.slice(0, 12);
        const data = buffer.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("Decryption failed", e);
        throw new Error("Failed to decrypt key. Session may have expired.");
    }
};

// 4. Encrypt for Transport (RSA-OAEP with Timestamp)
export const encryptForTransport = async (plainKey: string): Promise<string> => {
    const enc = new TextEncoder();

    // Import Public Key
    // Remove header/footer and newlines for import
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = PUBLIC_KEY.substring(
        pemHeader.length,
        PUBLIC_KEY.length - pemFooter.length
    ).replace(/\s/g, ''); // Remove all whitespace

    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const key = await window.crypto.subtle.importKey(
        "spki",
        binaryDer.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        false,
        ["encrypt"]
    );

    // Create Payload with Timestamp
    const payload = JSON.stringify({
        key: plainKey,
        timestamp: Date.now()
    });

    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        key,
        enc.encode(payload)
    );

    // Convert to Base64
    const buffer = new Uint8Array(encrypted);
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
};
