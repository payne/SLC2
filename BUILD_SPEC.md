# Ham Radio Net Logging PWA — Build Specification

**For:** an implementing coding agent (Claude Code) and human contributors.
**Project owner:** KF0SLC. **License:** MIT (open source).

This is the authoritative build spec. Requirements are normative — where it says **must**, treat it as
a hard requirement. A handful of items are marked **[DEFAULT]**; those were chosen sensibly and may be
changed by the project owner, but should otherwise be implemented as written.

---

## 0. Instructions for the implementing agent

- Build in the **phases** defined in §11, in order. Each phase has acceptance criteria; do not advance until they pass.
- Work incrementally and commit per logical unit. Run unit tests and lint before each commit.
- Use the **Firebase Emulator Suite** for all local development and tests. Never point dev/test at a production project.
- **Never commit secrets or real operator PII.** Only synthetic seed/sample data belongs in the repo. Firebase config that must ship client-side is fine; service-account keys are not.
- Follow the conventions in §3 strictly — they are not optional style preferences.
- Ask the owner before any irreversible action (deleting data, deploying to production, rotating credentials).
- Two values must be supplied before the seed script can run: the **Gmail addresses for N3PAY and KF0SLC** (see §11 Phase 1 / §6.6). Use clearly-marked placeholders until provided.

---

## 1. Product overview

A Progressive Web App for logging amateur-radio **nets** (scheduled on-air check-in sessions, commonly
used for emergency-comms and training). It must keep working through intermittent connectivity and low
bandwidth. The primary surface is an Excel-like grid (AG Grid) showing the live check-in log for a net.

Core flow:
1. An operator signs in (Google) and joins an active net with a short access code.
2. One operator acts as **NCS** (net control station) and logs each check-in; everyone else watches live, read-only.
3. While logging, typing part of a call sign surfaces matching operators from a roster, with their name and selected trainings/certifications/abilities; the selected attributes are snapshotted onto the check-in.
4. Log data exports to CSV; the roster imports and exports via CSV.

---

## 2. Technology stack (pinned)

| Concern | Choice |
|---|---|
| Framework | **Angular 22** — standalone components, **zoneless** change detection, signal-first, built-in control flow (`@if`/`@for`/`@switch`), OnPush. |
| Styling | **SCSS** (required). |
| UI components | **Angular Material** (required). |
| Data grid | **AG Grid Community v36** (`ag-grid-community`, `ag-grid-angular`) — MIT. **Do not** use AG Grid Enterprise features (Excel export, Master/Detail). |
| Backend / sync | **Firebase**: Firestore (offline cache), Auth (Google provider), Hosting. **No Cloud Functions** required. |
| Angular ↔ Firebase | **AngularFire** (latest) — call within injection context. |
| CSV & docs | **PapaParse** + **JSZip** + file-saver (CSV/zip exports); **jsPDF + jspdf-autotable** for the Print PDF menu action. |
| Unit tests | **Vitest** (Angular 22 default). |
| E2E tests | **Playwright**, run against the Firebase Emulator Suite. |
| CI/CD | **GitHub Actions** → Firebase Hosting. |

---

## 3. Conventions (required)

- **Standalone components only.** No NgModules. Bootstrap via `bootstrapApplication` + `app.config.ts` providers.
- **Zoneless**: provide `provideZonelessChangeDetection()`. Verify AngularFire, Material, and AG Grid behave (they do); never reintroduce zone.js.
- **Signals** for state. Services expose `signal`/`computed`; bridge Firestore observables with `toSignal`.
- **Built-in control flow** (`@if`, `@for`, `@switch`) — not `*ngIf`/`*ngFor`.
- **SCSS** per component; shared design tokens in a central SCSS file. Bridge Material theme and AG Grid theme via shared CSS custom properties so they stay visually consistent.
- **Reactive Forms** for forms. **[DEFAULT]** (Signal Forms are stable but Reactive Forms are chosen for maturity.)
- Feature-based folders. Lazy-load feature routes.
- Strict TypeScript. No `any` without justification.

### Repository layout
```
src/app/
  core/        # firebase providers, auth, guards, sync + presence services, audit service
  shared/      # callsign utils, pipes, shared UI, models
  features/
    auth/      # sign-in, invitation claim
    admin/     # invite, promote, demote, remove (gated by level/root)
    roster/    # people / trainings / certs / abilities + CSV import/export
    net-log/   # AG Grid log view, check-in entry, NCS controls, CSV export
  models/      # Person, Training, Certification, Ability, Net, CheckIn, User, Invitation, AuditEvent
firestore.rules
firestore.indexes.json
seed/          # idempotent seed scripts (Admin SDK) + emulator seed data
e2e/           # Playwright specs, page objects, fixtures
```

---

## 4. Architecture

### 4.1 Offline (three cooperating layers)
1. **App shell** — Angular service worker (`@angular/pwa`, `provideServiceWorker`, `ngsw-config.json`). App must load and run with no network; must be installable.
2. **Data** — Firestore persistent cache. Initialize with:
   ```ts
   provideFirestore(() =>
     initializeFirestore(getApp(), {
       localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
     })
   )
   ```
   Do **not** use the legacy `enableIndexedDbPersistence()`.
3. **Sync status** — derive an always-visible indicator from snapshot metadata (`fromCache`, `hasPendingWrites`): online / offline / N writes pending.

### 4.2 Real-time & concurrency
- **Writers are the NCS and an optional Backup Controller** (a second operator, typically online at another location). Everyone else is a live read-only viewer.
- Each viewer opens one realtime listener (`collectionData` / `onSnapshot`) scoped to the **active net's** `checkins` subcollection — never all history. This keeps bandwidth low.
- Apply incoming remote changes to the grid via `applyTransactionAsync()` keyed by a stable `getRowId` (the check-in doc id) — **never** by resetting `rowData` — so a remote update never disturbs scroll, selection, or an in-progress edit.
- With up to two writers, concurrent edits are possible; **last-write-wins** is acceptable, and the per-document + transaction approach above merges them live.

### 4.3 Roster in memory
Load the full roster once at startup into a signal store (it is small — hundreds of people — and is
cached in IndexedDB for offline). Call-sign autocomplete filters this in-memory list client-side. **Do
not** query Firestore per keystroke.

---

## 5. Data model (Firestore)

```
people/{CALLSIGN}                      // doc id = normalized UPPERCASE call sign
  callsign, name, licenseClass?, contact?
  attributes:      { <key>: <value> }   // tracked per call sign; keys match config/attributeColumns (§7.7)
  trainings:       [{ name, org, dateEarned, expires?, status }]
  certifications:  [{ name, org, dateEarned, expires?, status }]
  abilities:       [ "shelter-mgmt", "digital-modes", ... ]

nets/{netId}
  organization, netType, createdBy(uid), ncs(uid), backupNcs(uid)?, startTime, band/freq?, notes?
  // createdBy = inviter; ncs + backupNcs = the writers; netType from a fixed dropdown list
  status: 'active' | 'closed', joinCode, comments?   // joinCode = Share Code
  nets/{netId}/members/{uid}             // who has joined (written on valid code entry)
  nets/{netId}/presence/{uid}            // live viewers: { lastSeen }  (heartbeat)
  nets/{netId}/checkins/{checkinId}      // one row per check-in; newest sorts to the top
    callsign, firstName,                 // callsign + firstName populate from roster on valid entry
    assignment?, location?, notes?, mileage?,        // entered/edited by NCS or backup
    attributeSnapshot: { a1..a8 },       // the attribute-column values, frozen from roster at check-in time (§7.7)
    signInTime, signOutTime?,            // stamped from the device clock; signInTime hidden by default
    createdBy, lastEditedBy?             // attribution

config/attributeColumns                 // uploaded JSON: maps up to 8 grid columns → attribute keys + headers (§7.7)

users/{uid}          { email, callsign, level: 'operator'|'inviter', root?: true, invitedBy, joinedAt, promotedBy?, promotedAt? }
invitations/{email}  { email, callsign, level, invitedBy, createdAt, status: 'pending'|'claimed'|'revoked' }
auditLog/{eventId}   { type: 'invite'|'promote'|'demote'|'remove'|'revoke'|'createNet', actorUid, targetUid|targetEmail|netId, timestamp }
```

**Denormalization rule:** check-ins copy the operator's name and selected attributes at log time, so the
log stays historically accurate even if the roster later changes. The grid never does a live join.

---

## 6. Authentication, membership & authorization (required)

### 6.1 Invite-only
No open sign-up. All access is gated on an existing `users/{uid}` record. A signed-in Google account
with no matching invitation gets no access.

### 6.2 Tiers (cumulative)
- **Operator** — view any net they have the code for; act as NCS for any net they have the code for.
- **Inviter** — operator powers **plus** create nets, invite users, and promote operators → inviters.
- **Seed admin (root)** — inviter powers **plus** demote users (inviter → operator) and remove users. **Root is conferred only by seed-list membership; it is never grantable in-app.** The seed list changes only out-of-band (Admin SDK / console).

### 6.3 Sign-in & invitation claim
- Firebase Auth, **Google provider** (`signInWithPopup` desktop; `signInWithRedirect` mobile/PWA fallback).
- On first sign-in, match `request.auth.token.email` to a `pending` invitation and **claim** it: create `users/{uid}` from the invitation, set invitation `status: 'claimed'`. Gated by a rule requiring a matching pending invitation.
- Session persists offline once established; surface UI guidance to sign in before entering poor signal.

### 6.4 Inviting / promoting / demoting / removing
- **Invite** (inviter+): supply required inputs **Gmail, call sign, isInviter** → write `invitations/{email}`.
- **Promote** (inviter+): operator → inviter; stamp `promotedBy`/`promotedAt`.
- **Demote** (root only): inviter → operator.
- **Remove** (root only): delete the user's `users/{uid}` access record and set their invitation `status: 'revoked'`; if they were a net's NCS, free that seat. 
- **Revoke pending invitation** **[DEFAULT]**: an inviter may revoke a `pending` invitation they created; root may revoke any. Sets `status: 'revoked'`.
- Every one of the above writes an `auditLog` event.

### 6.5 Net access code
- On net creation (inviter+), the app **generates a random 4–8 char code** from a radio-friendly alphabet that **excludes ambiguous characters** (`0/O`, `1/l/I`) because it is read aloud over the air. NCS can regenerate it.
- Codes must be **unique among currently-active nets**.
- Joining: client creates `nets/{netId}/members/{uid}` while submitting the code; a security rule validates the submitted code against the net's stored `joinCode` via `get()` (server-side compare; code never returned). Net doc is otherwise locked so the code can't be read out.

### 6.6 Bootstrap seed
An idempotent, version-controlled seed script (Firebase Admin SDK) creates the initial root users:
- **N3PAY** — root, inviter. Gmail: `<<TODO: supply>>`
- **KF0SLC** — root, inviter. Gmail: `<<TODO: supply>>`

### 6.7 NCS, Backup Controller & claiming
- A net has a **Net Controller (NCS)** and an optional **Backup Controller**, both shown in the header by call sign. **Both can write** (log and edit check-ins); the backup is typically online at another location for redundancy.
- The NCS may **assign or change the Backup Controller** to any operator who is a member of the net (sets `nets/{netId}.backupNcs`).
- **Claiming NCS [DEFAULT]:** any operator with the code may claim NCS at any time (sets `nets/{netId}.ncs`). If the current NCS's presence is fresh (heartbeat within timeout), show a confirm dialog ("X is currently NCS — take over?"); if stale, claim without prompting.

### 6.8 Security rules (`firestore.rules`)
Encode: invite-only gating; tier checks (`get(users/$(uid)).data.level == 'inviter'` for create-net /
invite / promote; `get(users/$(uid)).data.root == true` for demote / remove / revoke-any); per-net
membership for `checkins` reads; **NCS-or-backup** `checkins` writes (`request.auth.uid in [net.ncs, net.backupNcs]`);
append-only `auditLog`; roster-write restrictions. Ship a matching `firestore.rules` test suite.

---

## 7. Feature requirements

### 7.1 Roster + CSV (feature: roster)
- CRUD for people, their configurable attributes (§7.7), and their trainings/certifications/abilities (Material forms).
- **CSV import/export as a normalized, zipped set** of linked files keyed by call sign:
  `people.csv`, `attributes.csv`, `trainings.csv`, `certifications.csv`, `abilities.csv`.
- Import flow: parse → **validate → dry-run preview** of adds/changes in a dialog → commit on confirm. Normalize call signs to uppercase.
- Export produces the same zip, round-trippable with import.

### 7.2 Net logging screen (feature: net-log)

The primary screen. Layout top-to-bottom: **header bar**, **AG Grid log**, **footer** (End NET + comments + menu). Register AG Grid modules via `ModuleRegistry.registerModules([...])`.

**Header bar** — labels and values:
- **Net Controller:** NCS call sign.
- **Backup Controller:** backup call sign (blank if none; NCS can assign — §6.7).
- **Name of organization:** editable text (net `organization`).
- **Share Code:** the net `joinCode`, displayed for reading over the air, with a regenerate control (§6.5).
- **Net Start Time:** net `startTime`.
- **Type of Net:** a **dropdown** bound to a fixed list (net `netType`). **[DEFAULT list]:** Emergency/ARES, Training, Traffic/NTS, Weather/SKYWARN, Social/Rag-chew, Other — owner may edit.
- **A large adjustable clock** (see *Adjustable clock* below).

**Entry & ordering:**
- A writer (NCS or backup) logs a check-in by typing a call sign into a **dedicated entry row pinned at the top of the grid** (AG Grid `pinnedTopRowData` — Community).
- A **partial call sign opens an autocomplete popup that narrows** as more characters are typed, matching the in-memory roster (call sign + name).
- On a **valid** call sign, the rest of the entry row **auto-populates** — first name and the attribute columns (per the attribute-config JSON, §7.7) from the roster snapshot; assignment/location/notes/mileage remain editable.
- Pressing **Enter** commits the row, stamps `signInTime` from the current time, and **inserts it at the top** of the log (newest-first); the entry row clears for the next call sign.
- Unknown call signs are allowed (visitor); optionally offer to add to the roster.

**Columns (in display order):** call sign, first name, assignment, location, notes, **attribute columns** (up to 8, defined by the uploaded attribute-config JSON — §7.7), mileage, **sign-out (time)**. **Sign-in time** is always stored but is a **hidden-by-default** column the user can reveal.
- Sign-out: a per-row action stamps `signOutTime` from the current time; editable.

**Column chooser:** a **custom Material widget** (button → menu of checkboxes) toggles column visibility via the grid column-state API (`applyColumnState` / `setColumnsVisible`). **Do not** use AG Grid's Enterprise columns tool panel/sidebar.

**Editing & writers:** any row may be edited after check-in (inline). Both the **NCS and the Backup Controller** may edit — including a backup at another location online (§4.2, §6.7). Edits stamp `lastEditedBy`. Viewers see edits live, read-only.

**Footer:**
- An **`End NET`** button — closes the net (status → `closed`); confirm before ending.
- A **comments text area** — net-level free text (net `comments`), editable by NCS/backup.
- A **menu** with:
  - **About** — app/version info.
  - **Export** — CSV exports (§7.3).
  - **Send data [DEFAULT]** — share/email the exported log via the Web Share API where available, else a download + `mailto` fallback. *(Clarify the intended destination if a specific endpoint/agency is required.)*
  - **Print PDF** — client-side PDF of the current net log (jsPDF + jspdf-autotable, or a print stylesheet).
  - **Remove all data (blank database) [DEFAULT: root only]** — destructive reset to an empty logging database; requires **typed confirmation**; **[DEFAULT scope]** clears nets + check-ins, leaves roster and users intact (confirm scope with owner).

**Adjustable clock:** a large, readable header clock showing the current time. "Adjustable" refers to its **display**, not the time: the operator can change **font size**, **color**, and **12- vs 24-hour** format. These are client-side display preferences persisted locally per device. Sign-in/sign-out stamps come from the actual device clock.

Live remote updates apply via `applyTransactionAsync()` + `getRowId` (§4.2).

### 7.3 CSV log export (feature: net-log)
- Per-net export straight from the grid (`api.exportDataAsCsv()`).
- Full export: a **collection of CSV files** — `nets.csv` + `checkins.csv` (or one CSV per net) — bundled as a ZIP.

### 7.7 Attribute configuration (uploaded JSON)
The grid's attribute columns are **not hardcoded** — they are defined by a JSON config that an
**inviter/root uploads**, stored in Firestore at `config/attributeColumns` so all clients share one
definition. The JSON **connects each attribute column to an attribute tracked per call sign** and
supplies its header.

Shape (up to 8 columns):
```json
{
  "attributeColumns": [
    { "column": "a1", "key": "ics100",  "header": "ICS-100", "type": "boolean" },
    { "column": "a2", "key": "ares",     "header": "ARES",    "type": "boolean" },
    { "column": "a3", "key": "shelter",  "header": "Shelter Mgmt", "type": "text" }
  ]
}
```
- `key` references an attribute stored on each person (`people/{CALLSIGN}.attributes[key]`); `header` is the column title; `type` is optional (boolean / text / number) for rendering.
- On a valid check-in, each attribute column is populated from `person.attributes[key]` and frozen into the check-in's `attributeSnapshot` (`a1..a8`).
- Uploading a new config rebuilds the grid's attribute columns for everyone. Validate the JSON on upload (≤ 8 columns, unique `column` and `key`, required fields) and preview before committing.
- The roster CSV set (§7.1) carries these values in `attributes.csv` keyed by call sign + attribute key.

### 7.4 Presence & attribution **[DEFAULT: Firestore heartbeat]**
- **Attribution**: every check-in stores `createdBy`; surface "logged by" in the UI.
- **Presence**: each viewer writes `nets/{netId}/presence/{uid}` with `lastSeen`, refreshed every ~20s; a user counts as present if `lastSeen` is within ~60s. Show a live viewer roster. Presence also drives the NCS-takeover prompt (§6.7). (No Realtime Database; single stack.)

### 7.5 Sync indicator (core)
Always-visible online / offline / pending-writes indicator from Firestore metadata (§4.1).

### 7.6 Responsive
- Desktop/tablet: full AG Grid.
- Phone: most users are read-only, so provide a **compact mobile viewer** (Material list/cards) rather than the full editing grid. NCS editing is expected primarily on larger screens.

---

## 8. Non-functional requirements
- **Offline:** all core read/log flows work with no network; writes queue and sync on reconnect.
- **Low bandwidth:** one-time roster load; listeners scoped to the active net; no per-keystroke queries; no heavy media.
- **Responsive:** usable from large monitor down to phone.
- **Accessibility:** Material a11y; keyboard-navigable grid entry.
- **Privacy/security:** roster + user records are real PII — repo ships only synthetic data; rules restrict access; no secrets committed.

---

## 9. Testing requirements
- **Unit (Vitest):** call-sign normalization/matching, signal stores, CSV parse/serialize round-trip, code generation (no ambiguous chars; uniqueness), sync/presence logic.
- **Security rules tests:** invite-only gating, tier/root checks, NCS-only writes, membership-gated reads, append-only audit log.
- **E2E (Playwright) on the Emulator Suite**, Page Object Model, seeded fixtures. Must include an **offline test** using `context.setOffline(true)` proving check-ins survive a disconnect and sync on reconnect.
- **Two Playwright projects:**
  - `e2e` — fast; `video: 'retain-on-failure'`.
  - `training-videos` — `video: 'on'`, `slowMo`, larger viewport, deterministic seeded narration → produces demo/training recordings.

---

## 10. Setup / scaffolding commands
(Indicative; the agent should verify current flags for Angular 22 and AG Grid v36.)
```bash
# Angular app (standalone, zoneless, SCSS)
npx @angular/cli@latest new ham-net-logger --style=scss --ssr=false
cd ham-net-logger
ng add @angular/material
ng add @angular/pwa

# Data grid + CSV + zip
npm i ag-grid-community ag-grid-angular papaparse jszip file-saver
npm i -D @types/papaparse @types/file-saver

# Firebase
npm i firebase @angular/fire
npm i -D firebase-tools
firebase init    # Firestore, Hosting, Emulators (Auth + Firestore)

# Testing
npm i -D @playwright/test && npx playwright install
# Vitest comes with the Angular 22 toolchain; configure if needed.
```

---

## 11. Build plan (phased — implement in order)

**Phase 0 — Scaffold.** App created with standalone + zoneless + SCSS; Material, AG Grid, AngularFire, PWA, and the Emulator Suite wired; CI skeleton (build + lint + unit) green.
*Acceptance:* app boots zoneless; emulators run; CI passes on an empty test.

**Phase 1 — Identity & access.** Data model; Firestore offline persistence; Google sign-in; invite-only claim flow; tiers (operator/inviter/root); invite/promote/demote/remove/revoke with audit log; net access codes; NCS claim/handoff; `firestore.rules` + rules tests; seed script with **N3PAY** and **KF0SLC** as root (Gmail placeholders until supplied); sync indicator.
*Acceptance:* a seeded root user signs in; invites an operator; the operator claims their invite and signs in; tier permissions enforced by rules tests; audit events recorded.

**Phase 2 — Roster + CSV + attribute config.** Roster store (in-memory signal store); people/attributes/trainings/certs/abilities CRUD; normalized zipped CSV import (validate + dry-run preview) and export, round-trippable; **attribute-configuration JSON upload** (§7.7) that defines the grid's attribute columns and the per-call-sign attributes they map to.
*Acceptance:* import a sample zip, edit, export, re-import with no diff; uploading an attribute-config JSON changes which attribute columns the grid will show.

**Phase 3 — Net logging screen.** Full screen per §7.2: header bar (controller/backup/org/share-code/start-time/net-type dropdown/adjustable clock); pinned entry row with narrowing autocomplete; all columns incl. 8 attributes, mileage, sign-out, hidden-by-default sign-in; custom Material column chooser; newest-first insert on Enter; inline editing by NCS **and Backup Controller**; live updates via grid transactions; footer with End NET, comments, and menu (About / Export / Send data / Print PDF / Remove-all-data).
*Acceptance:* a check-in lands at the top with first name + attributes populated; a backup at a second client edits a row and the NCS sees it live; non-writers are read-only; the column chooser shows/hides columns; End NET closes the net.

**Phase 4 — Export, send & print.** Per-net grid CSV export; full multi-file ZIP export; Print PDF; Send data; Remove-all-data (root, typed confirm).
*Acceptance:* CSVs open cleanly in a spreadsheet; full export contains all nets + check-ins; Print PDF renders the log; Send shares/emails the export.

**Phase 5 — Responsive + presence.** Mobile read-only viewer; Material↔AG Grid theming bridge; live presence roster; presence-driven takeover prompt.
*Acceptance:* usable on a phone viewport; presence list updates as clients join/leave.

**Phase 6 — E2E + training videos.** Playwright on emulators; offline test; `e2e` and `training-videos` projects.
*Acceptance:* offline test passes; training-videos project emits recordings.

**Phase 7 — Polish & deploy.** PWA install/manifest/icons; docs (README, CONTRIBUTING, firestore.rules); GitHub Actions deploy to Firebase Hosting on `main`.
*Acceptance:* installable PWA; CI deploys; docs explain seeding and emulator dev.

---

## 12. Defaulted decisions (owner may override before handoff)
1. **NCS takeover** — claim anytime; confirm dialog only if current NCS presence is fresh (§6.7).
2. **Presence** — Firestore heartbeat, not Realtime Database (§7.4).
3. **Pending-invitation revocation** — allowed (inviter for own; root for any) (§6.4).
4. **Forms** — Reactive Forms over Signal Forms (§3).
5. **Bootstrap Gmails** — placeholders until N3PAY and KF0SLC addresses are supplied (§6.6).
6. **Two writers** — the NCS and an assignable Backup Controller can both write/edit (§4.2, §6.7).
7. **Net-type list** — Emergency/ARES, Training, Traffic/NTS, Weather/SKYWARN, Social/Rag-chew, Other (§7.2).
8. **"Send data"** — Web Share / email of the export; confirm if a specific destination is intended (§7.2).
9. **"Remove all data"** — root-only; clears nets + check-ins, keeps roster/users; typed confirmation (§7.2).

---

## 13. Out of scope (for now)
Granting root in-app; demotion/removal of root users; multi-net simultaneous *writing* by one operator;
ADIF or third-party logbook import/export; spotting/cluster integrations. Revisit after Phase 7.
