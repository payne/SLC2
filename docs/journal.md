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
