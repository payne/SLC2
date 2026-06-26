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

## 2026-06-25 (Phase 7 Complete)

**Did:**
- Updated PWA manifest with proper metadata:
  - App name: "Ham Radio Net Logger"
  - Short name: "Net Logger"
  - Theme color: #1a237e (indigo)
  - Background color: #fafafa
  - Added description, orientation, categories
- Created comprehensive README.md:
  - Feature overview and tech stack
  - Development setup with emulators
  - Testing instructions (unit, rules, e2e)
  - Project structure documentation
  - User tier explanation
  - Seeding and deployment instructions
- Created CONTRIBUTING.md:
  - Development setup guide
  - Project conventions (Angular, naming, style)
  - Testing requirements
  - PR process
  - Security guidelines
- Updated GitHub Actions CI workflow:
  - Added deployment job that runs after successful build
  - Deploys to Firebase Hosting on push to main
  - Uses FirebaseExtended/action-hosting-deploy action

**Why:**
- Phase 7 requirement: PWA polish, documentation, deployment automation

**Decisions:**
- Used indigo (#1a237e) as theme color to match app header
- Firebase Hosting deployment requires FIREBASE_SERVICE_ACCOUNT secret
- Kept deployment conditional on main branch push only

**Acceptance Criteria Met:**
- [x] PWA manifest with proper metadata and icons
- [x] README explains seeding and emulator development
- [x] CONTRIBUTING explains conventions and PR process
- [x] GitHub Actions deploys to Firebase Hosting on main push

**All Phases Complete:**
- Phase 0: Scaffold (Angular 22, zoneless, Material, AG Grid, Firebase)
- Phase 1: Identity & access (invite-only, tiers, audit log, NCS claim)
- Phase 2: Roster + CSV (CRUD, import/export, attribute config)
- Phase 3: Net logging (AG Grid, real-time sync, column chooser)
- Phase 4: Export, send & print (CSV, ZIP, PDF, Web Share)
- Phase 5: Responsive + presence (mobile viewer, presence list)
- Phase 6: E2E + training videos (Playwright, offline test)
- Phase 7: Polish & deploy (PWA, docs, GitHub Actions)

---

## 2026-06-25 (Phase 6 Complete)

**Did:**
- Installed and configured Playwright for E2E testing
- Created playwright.config.ts with two projects:
  - `e2e`: Fast tests with `video: 'retain-on-failure'`
  - `training-videos`: Slow-motion (500ms) with `video: 'on'` and 1920x1080 viewport
- Created Page Object Model structure in e2e/pages/:
  - HomePage: Join net, navigation
  - NetLogPage: Check-in entry, grid operations, menu actions
  - SignInPage: Auth flows
- Created e2e/fixtures/test-data.ts with sample users, roster, and checkins
- Created smoke.spec.ts: Basic app loading and navigation tests
- Created offline.spec.ts: Critical offline functionality tests
  - Test that check-ins persist through offline period
  - Test that app remains functional while offline
  - Test pending writes indicator during offline edits
- Created training.spec.ts: Demo/training video recordings
  - Logging check-ins demo
  - Column chooser demo
  - Mobile responsive view demo
  - Adjustable clock demo
  - Export functionality demo
- Added npm scripts: `e2e`, `e2e:training`, `e2e:ui`

**Why:**
- Phase 6 requirement: E2E tests on emulators, offline test, training-videos project

**Decisions:**
- Used Page Object Model for maintainable tests
- Offline test uses `context.setOffline(true/false)` for network simulation
- Training tests include `waitForTimeout` pauses for narration/visibility
- Smoke tests verify basic app loading without requiring auth

**Acceptance Criteria Met:**
- [x] Playwright configured with two projects (e2e and training-videos)
- [x] Offline test verifies check-ins survive disconnect and sync on reconnect
- [x] Training-videos project produces recordings with slowMo and video enabled
- [x] Page Object Model structure for test maintainability

**Next steps:**
- Phase 7: Polish & deploy
- Add PWA manifest with icons
- Create README and CONTRIBUTING docs
- Set up GitHub Actions deploy to Firebase Hosting

---

## 2026-06-25 (Phase 5 Complete)

**Did:**
- Created MobileViewerComponent for read-only phone viewport experience
  - Card-based Material layout showing check-ins with callsign, name, time, and attributes
  - Responsive styling with scrollable list
- Created PresenceListComponent for live presence roster
  - Shows active viewers with NCS/Backup role badges
  - 60-second staleness threshold for viewer activity
  - NCS can assign/remove backup controller from presence menu
- Created NcsTakeoverDialogComponent for presence-driven NCS takeover
  - Different messaging for stale vs active NCS
  - Warning UI for active NCS takeover attempts
- Updated NetLogComponent with responsive breakpoints:
  - isMobile signal for viewport detection (< 768px)
  - Shows MobileViewerComponent on mobile, AG Grid on desktop
  - Added resize listener for dynamic viewport changes
- Updated SCSS with responsive media queries:
  - Header wraps on mobile with reordered elements
  - Entry row fields stack on mobile
  - Footer elements center on mobile
- Added getPresenceObservable() to NetService for real-time presence subscription

**Why:**
- Phase 5 requirement: Responsive mobile view and live presence tracking

**Decisions:**
- Card-based mobile view instead of simplified table for better touch UX
- 60-second staleness threshold matches presence heartbeat timing
- Backup controller assignment only available to current NCS
- Mobile breakpoint at 768px matches common tablet/phone boundary

**Acceptance Criteria Met:**
- [x] Mobile read-only viewer shows data in card format
- [x] Presence list shows active viewers with role indicators
- [x] NCS can assign backup controller from presence menu
- [x] Takeover dialog handles both stale and active NCS scenarios
- [x] Responsive styles work at mobile breakpoints

**Next steps:**
- Phase 6: E2E + training videos
- Set up Playwright with emulators
- Create offline mode test
- Create training-videos project structure

---

## 2026-06-25 (Phase 4 Complete)

**Did:**
- Implemented ExportService with all export capabilities:
  - Per-net CSV export via AG Grid
  - Full multi-net ZIP export (nets.csv + checkins.csv)
  - Print PDF using jsPDF + jspdf-autotable with proper formatting
  - Send data via Web Share API with mailto fallback
- Created About dialog with app info
- Created Remove All Data dialog (root only):
  - Typed confirmation required ("DELETE ALL DATA")
  - Batch deletes all nets, check-ins, members, and presence docs
  - Preserves roster and user data
- Updated net-log footer menu with all actions

**Why:**
- Phase 4 requirement: Export, send & print capabilities plus data management

**Decisions:**
- PDF uses jsPDF with autotable for clean table rendering
- Web Share API with graceful fallback to download + mailto for unsupported browsers
- Remove all data requires typed confirmation for safety

**Acceptance Criteria Met:**
- [x] CSVs export cleanly (per-net and full ZIP)
- [x] Full export contains all nets + check-ins
- [x] Print PDF renders the log with attribute columns
- [x] Send shares/emails the export via Web Share API or fallback
- [x] Remove all data works (root only with typed confirm)

**Next steps:**
- Phase 5: Responsive + presence
- Add mobile read-only viewer (Material list/cards)
- Implement Material ↔ AG Grid theming bridge
- Add live presence roster display
- Implement presence-driven NCS takeover prompt

---

## 2026-06-25 (Phase 3 Complete)

**Did:**
- Implemented CheckInService for managing check-ins with real-time Firestore sync
  - Real-time listener for check-ins ordered newest-first
  - CRUD operations: addCheckIn, updateCheckIn, signOut
  - Attribute snapshot capture from roster at check-in time
- Implemented full net-log screen with AG Grid:
  - Header bar with NCS/backup callsigns, organization, share code, net type, start time
  - Adjustable clock component (font size, color, 12/24hr format) with local storage persistence
  - Entry row for writers with callsign autocomplete from roster
  - AG Grid with all columns: callsign, firstName, assignment, location, notes, 8 attribute columns, mileage, signOut, signIn
  - Column chooser widget for toggling column visibility
  - Inline editing for writers (NCS and backup)
  - Sign-out button per row
  - Live updates via Firestore real-time listener
  - Footer with End NET button, comments editing, and menu (Export CSV)
- Added UserService.getCallsignForUid() for displaying callsigns by UID with async caching

**Why:**
- Phase 3 requirement: Net logging grid with AG Grid, real-time sync, and NCS controls

**Decisions:**
- Used AG Grid Community with ClientSideRowModel and CsvExport modules
- Column visibility state managed via signals with grid API sync
- Entry row implemented as separate form above grid (not AG Grid pinnedTopRowData) for better UX
- Clock settings persisted to localStorage per device

**Acceptance Criteria Met:**
- [x] Check-in lands at top with firstName + attributes populated
- [x] Backup controller can edit rows (isWriter check includes backup)
- [x] Non-writers are read-only (no entry row, no editable cells)
- [x] Column chooser shows/hides columns
- [x] End NET closes the net and redirects home
- [x] Real-time updates from Firestore

**Known Issues:**
- Print PDF and Send Data menu items are disabled (Phase 4)
- Remove all data not implemented (Phase 4)
- Mobile responsive view not implemented (Phase 5)

**Next steps:**
- Phase 4: Export, send & print
- Implement full ZIP export of all nets/checkins
- Implement Print PDF with jsPDF
- Implement Send data via Web Share API
- Implement Remove all data (root only)

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
