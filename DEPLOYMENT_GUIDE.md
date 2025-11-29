# 🚀 AdGuardian LLM - Ultimate Production Deployment Guide

This guide covers everything needed to deploy AdGuardian LLM to production using **Vercel** (Frontend + Serverless Functions) and **Firebase** (Database).

---

## 📋 Production Checklist

Follow these steps in order to ensure a successful deployment.

1.  [ ] **Firebase Setup**: Create project, database, and get credentials.
2.  [ ] **RSA Key Generation**: Generate your unique production key pair.
3.  [ ] **Environment Variables**: Prepare all secrets.
4.  [ ] **Vercel Deployment**: Connect GitHub and deploy.
5.  [ ] **Verification**: Test Internal Mode, External Mode, and Private Mode.

---

## 1. Firebase Setup

### A. Create Project
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Click **Add project** and name it (e.g., `adguardian-prod`).
3.  Disable Google Analytics (optional, for simplicity).

### B. Setup Firestore
1.  Go to **Build > Firestore Database**.
2.  Click **Create database**.
3.  Select **Production mode**.
4.  Choose a location close to your users (e.g., `nam5` for US).
5.  **Data Model**: The application will automatically create these collections when used:
    -   `users`: User profiles and points.
    -   `subscriptions`: User plan details.
    -   `usage`: Daily usage tracking.
    -   `rate_limits`: (Optional) Rate limiting counters.
    -   `blocked_ips`: IP blocklist.

### C. Get Service Account
1.  Go to **Project settings** (gear icon) > **Service accounts**.
2.  Click **Generate new private key**.
3.  Save the JSON file. You will need the *content* of this file for the `FIREBASE_SERVICE_ACCOUNT` variable.

---

## 2. RSA Key Generation

You need a secure Key Pair. The **Public Key** is baked into the frontend to encrypt user API keys. The **Private Key** stays on the server to decrypt them.

Run this command in your terminal to generate new keys:

```bash
node -e "
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
console.log('---COPY PUBLIC KEY BELOW---');
console.log(publicKey);
console.log('---COPY PRIVATE KEY BELOW---');
console.log(privateKey.replace(/\n/g, '\\n')); // Escaped for .env
"
```

1.  **Public Key**: Copy it and update `src/config/keys.ts`.
    ```typescript
    export const PUBLIC_KEY = \`-----BEGIN PUBLIC KEY-----
    ...
    -----END PUBLIC KEY-----\`;
    ```
    *Commit and push this change to GitHub.*

2.  **Private Key**: Keep it safe. You will paste this into Vercel Environment Variables.

---

## 3. Vercel Deployment

### A. Import Project
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **Add New... > Project**.
3.  Import your `adguardian-llm` repository.

### B. Configure Build
-   **Framework Preset**: Vite
-   **Root Directory**: `./` (default)
-   **Build Command**: `npm run build`
-   **Output Directory**: `dist`

### C. Environment Variables
Copy-paste these into the **Environment Variables** section:

| Name | Value |
| :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio Key |
| `LLM_MODEL_NAME` | `gemini-1.5-flash` |
| `JWT_SECRET` | A long random string |
| `FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `FIREBASE_SERVICE_ACCOUNT` | Paste the *entire content* of your service-account.json |
| `PROD_RSA_PRIVATE_KEY` | Paste your **Private Key** (from Step 2) |

### D. Deploy
Click **Deploy**. Vercel will build the frontend and set up the API routes as Serverless Functions.

---

## 4. Verification & Troubleshooting

### Test 1: Internal Mode (Free/Pro Plan)
-   Go to the deployed URL.
-   Login (or use the playground if auth is optional for testing).
-   Send a message.
-   **Expected**: Response from Gemini. Firestore `usage` collection should increment.

### Test 2: External Mode (BYOK)
-   Go to Settings.
-   Enter a valid Google Gemini API Key.
-   Go to Playground.
-   Send a message.
-   **Expected**: Response from Gemini. Firestore `usage` should NOT increment points (only daily count).
-   **Security Check**: The request payload in Network tab should contain `X-Encrypted-Key`.

### Test 3: Private Mode
-   Toggle "Private Mode" ON.
-   Send a message.
-   **Expected**: Response received. In Firestore `users/{uid}/logs`, the `prompt` field should be `[REDACTED - PRIVATE MODE]`.

### Common Issues
-   **500 Internal Server Error**: Check Vercel Logs. Usually missing/invalid `FIREBASE_SERVICE_ACCOUNT` or `PROD_RSA_PRIVATE_KEY`.
-   **401 Unauthorized**: Check `JWT_SECRET` match or Replay Attack (clock drift).
-   **Replay Attack Alert**: Ensure your client and server clocks are synced (usually automatic on Vercel).

---

**Congratulations! Your AdGuardian LLM is now live and secure.** 🛡️
