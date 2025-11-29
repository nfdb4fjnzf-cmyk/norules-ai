# 🚀 Production Deployment Checklist

## 1. Environment Variables
- [ ] Set `GEMINI_API_KEY` (Server-side fallback)
- [ ] Set `JWT_SECRET` (Critical for Auth)
- [ ] Set `FIREBASE_CREDENTIALS` (JSON or individual vars)
- [ ] **Ensure `VITE_TRANSPORT_SECRET` is NOT set** (Deprecated)

## 2. RSA Keys
- [ ] Generate a new RSA Key Pair for Production.
- [ ] Update `api/config/keys.ts` with the **Private Key**.
- [ ] Update `src/config/keys.ts` with the **Public Key**.
- [ ] **NEVER** commit `api/config/keys.ts` to public repositories.

## 3. Build & Optimization
- [ ] Run `npm run build` to generate the production bundle.
- [ ] Verify `dist/` folder is created.
- [ ] Ensure `api/` folder is compiled (if using TS for backend) or run with `ts-node` in production (not recommended for high load).

## 4. Security Verification
- [ ] **External Mode**: Test with a real Google API Key.
- [ ] **Replay Attack**: Verify that replaying a captured `X-Encrypted-Key` payload fails after 60 seconds.
- [ ] **Private Mode**: Verify that `X-Private-Mode: true` requests do NOT log prompts in Firestore.
- [ ] **Auth**: Verify that accessing API endpoints without `Authorization` header returns 401.

## 5. Database
- [ ] Ensure Firestore indexes are created (if any complex queries are used).
- [ ] Configure Firestore Security Rules to restrict access to `users/{uid}`.

## 6. Monitoring
- [ ] Set up logging for `REPLAY_ATTACK_DETECTED` errors (potential attack).
- [ ] Monitor Quota usage to prevent abuse.
