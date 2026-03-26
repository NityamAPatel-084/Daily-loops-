# Daily Loop - Production Release Checklist

Use this checklist before every production deploy.

## 1. Code & Build
- [ ] Latest code is pushed to `main` branch.
- [ ] Local install works: `npm install`.
- [ ] Production build passes: `npm run build`.

## 2. Vercel Project Settings
- [ ] Repository is connected in Vercel.
- [ ] Framework preset is `Vite`.
- [ ] Build command is `npm run build`.
- [ ] Output directory is `dist`.

## 3. Environment Variables (Vercel)
Set these in Vercel for **Production**, **Preview**, and **Development**:
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`

After any env update:
- [ ] Trigger a fresh deploy/redeploy.

## 4. Firebase Authentication Setup
- [ ] Add Vercel domain (`*.vercel.app`) to Firebase Auth authorized domains.
- [ ] Add custom production domain (if used) to Firebase Auth authorized domains.
- [ ] Keep `localhost` in authorized domains for local development.

## 5. Firestore Security Rules
- [ ] Rules are strict and UID-scoped (no public write rules).
- [ ] Users can only access their own path.
- [ ] Production does not use permissive rules like `allow read, write: if true;`.

Recommended baseline:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/dashboard/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 6. Production Smoke Test
- [ ] Register and login work.
- [ ] Dashboard create/update operations work.
- [ ] Refresh keeps data (persistence check).
- [ ] Real-time sync works across two tabs.
- [ ] Another user account cannot access first user's data.
- [ ] Browser console has no auth/firestore permission errors.

## 7. Release Hygiene (Optional but Recommended)
- [ ] Keep separate Firebase project/config for Preview vs Production.
- [ ] Keep one stable rollback deployment in Vercel.
- [ ] Tag production release commit in GitHub.
- [ ] Re-run smoke test after each production deploy.
