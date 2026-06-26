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

## 2026-06-25

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
