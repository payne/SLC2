# Ham Radio Net Logger

A Progressive Web App for logging amateur radio **nets** (scheduled on-air check-in sessions, commonly used for emergency communications and training). It works offline and syncs when connectivity returns.

## Features

- **Offline-first**: Works through intermittent connectivity using Firebase Firestore's persistent cache
- **Real-time sync**: All viewers see check-ins and edits live
- **Excel-like grid**: AG Grid with sorting, filtering, column resize, and inline editing
- **Roster management**: Import/export via CSV, autocomplete when logging check-ins
- **Configurable attributes**: Up to 8 custom columns mapped to roster attributes
- **Invite-only access**: Tier-based permissions (operator/inviter/root)
- **PWA installable**: Works as a native app on desktop and mobile

## Technology Stack

- **Angular 22** (standalone components, zoneless, signals)
- **Angular Material** (UI components)
- **AG Grid Community** (data grid)
- **Firebase** (Firestore, Auth, Hosting)
- **AngularFire** (Angular-Firebase integration)

## Quick Start

### Prerequisites

- Node.js 22.22.3+ (or use nvm)
- Firebase CLI: `npm install -g firebase-tools`

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd ham-net-logger
   npm install --legacy-peer-deps
   ```

2. Start the Firebase emulators and dev server:
   ```bash
   npm run dev
   ```
   This runs emulators on ports 8080 (Firestore) and 9099 (Auth), and the Angular dev server on port 4200.

3. Seed initial data (in a new terminal):
   ```bash
   npm run seed
   ```
   This creates root users (N3PAY, KF0SLC) and sample roster data.

4. Open http://localhost:4200

### Running Tests

```bash
# Unit tests (Vitest)
npm test

# Firestore rules tests
npm run test:rules

# E2E tests (Playwright)
npm run e2e

# E2E with UI
npm run e2e:ui

# Training video recordings
npm run e2e:training
```

## Project Structure

```
src/app/
  core/           # Firebase providers, auth, guards, services
  shared/         # Utilities, pipes, shared components, models
  features/
    auth/         # Sign-in, invitation claim
    admin/        # Invite, promote, demote, manage users
    roster/       # People management, CSV import/export
    net-log/      # AG Grid log view, check-in entry, NCS controls
```

## User Tiers

| Tier | Capabilities |
|------|--------------|
| **Operator** | View any net with the code; act as NCS |
| **Inviter** | + Create nets, invite users, promote operators |
| **Root** | + Demote users, remove users (seed-list only) |

## Seeding Root Users

Root users must be seeded via the Admin SDK script. Edit `seed/seed-users.ts` with the Gmail addresses for your root users:

```typescript
const ROOT_USERS = [
  { email: 'n3pay@example.com', callsign: 'N3PAY' },
  { email: 'kf0slc@example.com', callsign: 'KF0SLC' },
];
```

Then run:
```bash
# Emulator mode
npm run seed

# Production (requires confirmation)
npm run seed:prod
```

## Firestore Security Rules

Security rules are in `firestore.rules`. Key rules:
- Invite-only: Users must have a pending invitation to create their account
- Tier checks: Inviter+ required for net creation, root required for demotions
- NCS-only writes: Only the NCS or backup controller can edit check-ins
- Membership-gated reads: Must be a net member to view check-ins

Test the rules:
```bash
npm run test:rules
```

## Deployment

The app deploys to Firebase Hosting via GitHub Actions on push to `main`.

Manual deploy:
```bash
npm run build:prod
firebase deploy --only hosting
```

## Environment Configuration

- `src/environments/environment.ts` - Development (emulators)
- `src/environments/environment.prod.ts` - Production

## License

MIT
