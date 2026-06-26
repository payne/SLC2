# Deploy to Firebase

This guide covers deploying the Ham Net Logger application to Firebase Hosting and Firestore.

## Prerequisites

1. **Firebase CLI installed globally:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged into Firebase:**
   ```bash
   firebase login
   ```

3. **Correct project selected:**
   ```bash
   firebase use <your-project-id>
   ```
   Current configured project: `demo-ham-net-logger` (see `.firebaserc`)

## Quick Deploy (All Services)

```bash
npm run build:prod && firebase deploy
```

This deploys:
- Firestore security rules (`firestore.rules`)
- Firestore indexes (`firestore.indexes.json`)
- Hosting (Angular app from `dist/ham-net-logger/browser`)

## Deploy Individual Services

### Hosting Only (Angular App)
```bash
npm run build:prod && firebase deploy --only hosting
```

### Firestore Rules Only
```bash
firebase deploy --only firestore:rules
```

### Firestore Indexes Only
```bash
firebase deploy --only firestore:indexes
```

### Firestore (Rules + Indexes)
```bash
firebase deploy --only firestore
```

## Pre-Deployment Checklist

### 1. Test Security Rules
```bash
npm run test:rules
```
Runs Vitest against `tests/firestore.rules.test.ts` using the Firestore emulator.

### 2. Build and Verify Production Build
```bash
npm run build:prod
```
Outputs to `dist/ham-net-logger/browser`.

### 3. Run E2E Tests (Optional)
```bash
npm run e2e
```

### 4. Lint Check
```bash
npm run lint
```

## Setting Up a New Firebase Project

1. **Create project in Firebase Console:**
   https://console.firebase.google.com/

2. **Initialize Firebase in the project:**
   ```bash
   firebase init
   ```
   Select:
   - Firestore (rules and indexes)
   - Hosting (single-page app)

3. **Update `.firebaserc`:**
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```

4. **Update environment files:**
   Edit `src/environments/environment.prod.ts` with your Firebase config.

## Environment Configuration

Ensure your Firebase config is set in:
- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

Required config values:
```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  }
};
```

## Deployment Targets

| Target | Command | What It Deploys |
|--------|---------|-----------------|
| All | `firebase deploy` | Rules, indexes, hosting |
| Hosting | `firebase deploy --only hosting` | Angular app |
| Rules | `firebase deploy --only firestore:rules` | Security rules |
| Indexes | `firebase deploy --only firestore:indexes` | Composite indexes |

## Rollback

### Hosting Rollback
Use Firebase Console > Hosting > Release History to roll back to a previous version.

### Rules Rollback
Firebase automatically keeps rule version history. To roll back:
1. Go to Firebase Console > Firestore > Rules
2. Click "Revision History"
3. Select previous version and publish

## Troubleshooting

### "Permission Denied" on Deploy
```bash
firebase login --reauth
```

### Build Fails
```bash
rm -rf node_modules dist
npm install
npm run build:prod
```

### Rules Deploy Fails
Check for syntax errors:
```bash
firebase emulators:start --only firestore
```
The emulator will report rule parsing errors on startup.

### Index Deploy Fails
Indexes can take several minutes to build. Check status in Firebase Console > Firestore > Indexes.

## CI/CD Integration

For automated deployments, use a Firebase service account:

```bash
firebase login:ci
```

Store the resulting token as a CI secret, then:

```bash
firebase deploy --token "$FIREBASE_TOKEN"
```

Or use workload identity federation for keyless auth (recommended for production).
