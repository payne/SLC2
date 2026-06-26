# Project Journal

Running log of work sessions. Newest entries at the top. Each entry: what was done,
why, decisions made, and what's next — written so a future session (or future you)
can resume without re-reading the whole codebase.

---

## Template for new entries (copy this block)

### YYYY-MM-DD

**Did:**
-

**Why:**
-

**Decisions:**
-

**Next steps:**
-

---

## 2026-06-25 (Phase 2 Complete)

**Did:**
- Implemented RosterService with in-memory signal store for roster data
  - Real-time Firestore listener loads full roster into memory at startup
  - Signal-based reactivity with computed rosterArray and count
  - Search by partial callsign or name with relevance sorting
  - CRUD operations: addPerson, updatePerson, deletePerson, bulkUpsert
  - Attribute config loading and management
- Created roster feature components:
  - `roster.component`: List view with search, import/export menu
  - `person-dialog.component`: Add/edit person dialog with tabs (Basic Info, Abilities, Training)
  - `import-dialog.component`: ZIP file import with preview and validation
- Implemented CsvService for normalized ZIP CSV import/export:
  - Export generates ZIP with: people.csv, attributes.csv, trainings.csv, certifications.csv, abilities.csv
  - Import parses ZIP files, validates data, shows preview with new/update/unchanged status
  - Uses PapaParse for CSV parsing and JSZip for ZIP handling
- Added roster route protected by authGuard + inviterGuard

**Why:**
- Phase 2 requirement: Roster management with CSV import/export for bulk data handling

**Decisions:**
- Roster stored in-memory as a Map<callsign, Person> for fast lookup
- CSV import shows preview before committing to allow user verification
- ZIP format chosen for normalized export (one entity type per CSV file)
- Trainings and certifications managed via CSV import (not inline editing in dialog)

**Acceptance Criteria Met:**
- [x] RosterService with in-memory signal store
- [x] Roster CRUD UI (list, add, edit, delete)
- [x] CSV import with validation and preview
- [x] CSV export as normalized ZIP
- [x] Search/filter roster by callsign or name

**Known Issues:**
- Attribute config JSON upload not yet implemented (deferred to later)
- CommonJS warnings for papaparse, jszip, file-saver (expected, no impact)

**Next steps:**
- Phase 3: Net logging grid with AG Grid
- Implement checkin grid with callsign autocomplete
- Add NCS handoff UI
- Implement column config for custom attributes
- Add real-time sync from Firestore

---

## 2026-06-25 (Phase 1 Complete)

**Did:**
- Created data model interfaces: User, Invitation, Person, Net, CheckIn, AuditEvent, Config
- Implemented core services:
  - `AuthService`: Google sign-in (popup/redirect), Firebase Auth integration
  - `UserService`: Invite-only claim flow, tier checks (operator/inviter/root)
  - `AdminService`: Invite/promote/demote/remove/revoke with audit logging
  - `NetService`: Net creation, join codes, NCS claim/handoff, presence heartbeat
  - `SyncService`: Online/offline/pending-writes status indicator
- Created auth guards: `authGuard`, `inviterGuard`, `rootGuard`, `signInGuard`
- Created feature components:
  - Auth: SignIn, ClaimInvitation, NoAccess
  - Home: Join net with code, admin link for inviters
  - Admin: Create nets, invite users, manage users (promote/demote/remove)
  - NetLog: Placeholder for Phase 3 (shows join code, NCS info)
- Implemented complete `firestore.rules` with:
  - Invite-only user creation via pending invitation
  - Tier-based access (operator/inviter/root)
  - NCS-only check-in writes
  - Membership-gated reads
  - Append-only audit log
- Created firestore.rules test suite with Vitest + @firebase/rules-unit-testing
- Implemented seed script with Firebase Admin SDK (seed/seed-users.ts)
  - Seeds N3PAY and KF0SLC as root users (placeholder emails)
  - Seeds sample roster data for emulator
  - Supports both emulator and production modes

**Why:**
- Phase 1 requirement: identity & access, data model, invite-only flow, security rules

**Decisions:**
- Using signals throughout services for reactive state management
- Auth uses popup on desktop, redirect on mobile for better UX
- Join codes use radio-friendly alphabet (no 0/O/1/l/I ambiguity)
- Presence heartbeat every 20s, stale threshold 60s
- Audit log is append-only, readable only by root

**Acceptance Criteria Met:**
- [x] Data model interfaces defined (shared/models/)
- [x] Google sign-in implemented
- [x] Invite-only claim flow working
- [x] Tier permissions (operator/inviter/root) enforced
- [x] Invite/promote/demote/remove with audit logging
- [x] Net access codes with uniqueness validation
- [x] NCS claim/handoff logic
- [x] Security rules comprehensive and tested
- [x] Seed script ready (placeholder emails)
- [x] Sync indicator service

**Known Issues:**
- Bundle size warning (1.25MB initial) due to Firebase + AG Grid + Material
- AngularFire v20 requires --legacy-peer-deps for Angular 22

**Next steps:**
- Phase 2: Roster + CSV import/export + attribute config
- Implement RosterService with in-memory signal store
- Create roster CRUD components
- Implement normalized ZIP CSV import/export
- Create attribute config upload

---

## 2026-06-25 (Phase 0 Complete)

**Did:**
- Created Angular 22 project with standalone components, SCSS, and zoneless change detection
- Added Angular Material (v22.0.2) with default theme
- Added Angular PWA support with service worker
- Installed AG Grid Community v36 with ag-grid-angular
- Installed CSV/PDF libraries: papaparse, jszip, file-saver, jspdf, jspdf-autotable
- Installed and configured Firebase + AngularFire with offline persistence (persistentLocalCache)
- Created environment files for dev (emulators) and production
- Set up Firebase Emulator Suite (Auth + Firestore on ports 9099, 8080)
- Created initial firestore.rules with placeholder rules for all collections
- Added ESLint with Angular-ESLint for linting
- Created GitHub Actions CI workflow (build + lint + test)
- Set up project directory structure per BUILD_SPEC

**Why:**
- Phase 0 scaffold requirement: app boots zoneless, emulators run, CI passes

**Decisions:**
- Used `--legacy-peer-deps` for npm installs due to AngularFire v20 not yet supporting Angular 22
- Using demo Firebase project ID (`demo-ham-net-logger`) for local development
- Moved journal.md to docs/journal.md per BUILD_SPEC structure

**Acceptance Criteria Met:**
- [x] App boots zoneless (`provideZonelessChangeDetection()` in app.config.ts)
- [x] Emulators run (Firebase Auth + Firestore emulators start successfully)
- [x] CI would pass (build, lint, test all pass locally)

**Next steps:**
- Phase 1: Data model, Firestore offline persistence, Google sign-in, invite-only claim flow
- Create User, Invitation, Person, Net, CheckIn models
- Implement seed script with N3PAY and KF0SLC as root users (placeholder Gmails)
- Create firestore.rules tests

---

## 2026-06-25 (Initial Setup)

**Did:**
- Set up initial project scaffold: `CLAUDE.md`, this journal, `.claude/rules/`.

**Why:**
- Establish persistent conventions (standalone components, SCSS, Angular Material,
  AG Grid) before writing app code, so Claude Code doesn't need re-briefing every
  session.

**Decisions:**
- Standalone components only, no NgModules.
- AG Grid (Community first) for any interactive/Excel-like tables; MatTable only
  for trivial static lists.
- Firestore via AngularFire (modular API) as the backend — no separate server tier.

**Next steps:**
- Run `ng new` to scaffold the actual Angular project.
- Add Angular Material via `ng add @angular/material`.
- Create a Firebase project, then `ng add @angular/fire`; add `provideFirestore()`
  to `app.config.ts`.
- Draft initial `firestore.rules` for the first collection(s).
- Install `ag-grid-angular` + `ag-grid-community`.
- Define first feature module/folder and first real component.
