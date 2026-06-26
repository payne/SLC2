# Project: [Your App Name]

One-line description of what this app does and who it's for.

## Stack

- Angular (latest stable) — **standalone components only, no NgModules**
- Styling: **SCSS** (one `.scss` file per component, no inline styles unless trivial)
- UI library: **Angular Material**
- Tables/grids: **AG Grid** (ag-grid-angular + ag-grid-community)
- Backend/data: **Firebase Firestore** via **AngularFire** (modular API, `@angular/fire/firestore`)
- Auth: [Firebase Authentication if used — specify providers, e.g. Google/email]
- Package manager: [npm/pnpm]

## Commands

- Dev server: `ng serve`
- Build: `ng build`
- Unit tests: `ng test`
- Lint: `ng lint`
- (Fill in any custom scripts, e.g. `npm run build:prod`)

## Angular Conventions

- **Standalone components everywhere.** Every component, directive, and pipe sets
  `standalone: true` and declares its own `imports: []`. No `NgModule` files except
  where a third-party library still requires one (document the exception inline).
- **SCSS only.** Component files are `*.component.ts` / `*.component.html` /
  `*.component.scss`. Use Angular Material's SCSS theming APIs (`@use` Material's
  Sass mixins) rather than hardcoded colors — pull from the defined Material theme.
- **File naming:** kebab-case for files, `PascalCase` for classes,
  `camelCase` for properties/methods.
- **Folder structure:** feature-folder pattern —
  ```
  src/app/
    features/
      <feature-name>/
        <feature-name>.component.ts/.html/.scss
        <feature-name>.service.ts
    shared/
      components/
      models/
      utils/
  ```
- **State management:** [signals / RxJS services / NgRx — specify what this project uses]
- **Routing:** standalone routing via `provideRouter()` in `app.config.ts`, lazy-load
  feature routes with `loadComponent()`.
- Prefer Angular signals for local component state where it fits; use RxJS for
  async streams (HTTP, WebSocket, etc.).

## Angular Material

- Import only the specific Material modules each component needs (e.g.
  `MatButtonModule`, `MatTableModule`) into that component's `imports: []` array —
  don't create a shared "MaterialModule" grab-bag.
- Theme is defined centrally in `src/styles.scss` (or `src/theme.scss`) — components
  should reference theme tokens/mixins, not hardcode hex colors.
- Use Material form field + reactive forms (`ReactiveFormsModule`) for all inputs,
  not template-driven forms, unless there's a specific reason noted in the component.

## Firestore / AngularFire

- Use the **modular AngularFire API** (`@angular/fire/...`), never the legacy
  `AngularFirestoreModule`/`AngularFirestore` compat API.
- Bootstrap in `app.config.ts` via providers, not an `NgModule`:
  ```ts
  import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
  import { provideFirestore, getFirestore } from '@angular/fire/firestore';

  export const appConfig: ApplicationConfig = {
    providers: [
      provideFirebaseApp(() => initializeApp(environment.firebase)),
      provideFirestore(() => getFirestore()),
      // provideAuth(() => getAuth()) if using Firebase Auth
    ],
  };
  ```
- **Data access lives in injectable services**, not directly in components. Each
  feature gets a `*.service.ts` that wraps `collection()`/`doc()`/`collectionData()`/
  `docData()` and returns typed observables — components just subscribe/`async` pipe
  or use `toSignal()`.
  ```ts
  @Injectable({ providedIn: 'root' })
  export class WidgetsService {
    private firestore = inject(Firestore);
    private widgetsRef = collection(this.firestore, 'widgets');

    getWidgets(): Observable<Widget[]> {
      return collectionData(this.widgetsRef, { idField: 'id' });
    }
  }
  ```
- Always pass `{ idField: 'id' }` to `collectionData()` so the Firestore document ID
  rides along with the data — needed for updates/deletes and as the AG Grid row key.
- Define a TypeScript `interface` for every Firestore collection's document shape in
  `shared/models/`. Don't pass raw `any`/untyped objects around.
- `collectionData`/`docData` observables are **hot** (live real-time listeners) — be
  deliberate about when to keep them live (e.g. a dashboard) vs. take a one-time
  snapshot with `getDocs`/`getDoc` (e.g. a form pre-fill). Don't leave unnecessary
  live listeners open.
- Firestore security rules live in `firestore.rules` at the repo root — any feature
  that reads/writes a new collection must get matching rules added in the same change,
  not deferred.
- Avoid client-side joins across collections where avoidable; prefer denormalizing
  data needed together into the same document, per standard Firestore data modeling
  guidance. Flag in `docs/journal.md` if a feature genuinely needs a join, so the
  tradeoff is recorded.

## AG Grid (tables with Excel-like functionality)

Use AG Grid (not Material's `MatTable`) for any data grid that needs sorting,
filtering, column resize/reorder, pagination, row grouping, CSV/Excel export, or
inline cell editing. Use `MatTable` only for very simple, fully static lists with no
interactive grid features.

- Packages: `ag-grid-angular` + `ag-grid-community` (Community edition covers
  sorting/filtering/pagination/CSV export/editing — only add `ag-grid-enterprise`
  if a feature genuinely requires it, e.g. Excel export with formulas, pivoting,
  master/detail. Flag before adding the Enterprise package since it's a paid license.)
- **Register modules explicitly** rather than the "register everything" shortcut, to
  keep bundle size down:
  ```ts
  import { ModuleRegistry, ClientSideRowModelModule, CsvExportModule } from 'ag-grid-community';
  ModuleRegistry.registerModules([ClientSideRowModelModule, CsvExportModule]);
  ```
- **Standalone usage pattern:**
  ```ts
  import { Component } from '@angular/core';
  import { AgGridAngular } from 'ag-grid-angular';
  import type { ColDef } from 'ag-grid-community';

  @Component({
    selector: 'app-some-grid',
    standalone: true,
    imports: [AgGridAngular],
    templateUrl: './some-grid.component.html',
    styleUrls: ['./some-grid.component.scss'],
  })
  export class SomeGridComponent {
    rowData = [...];
    colDefs: ColDef[] = [...];
    defaultColDef: ColDef = { flex: 1, sortable: true, filter: true, resizable: true };
  }
  ```
- Style each grid container with an explicit height in its `.scss` file (AG Grid
  needs a sized container) and apply the chosen AG Grid theme class
  (e.g. `ag-theme-quartz`) rather than inline styles.
- For "Excel-like" behavior specifically:
  - Sorting/filtering/resizing/column reorder: on by default via `defaultColDef`.
  - Cell editing: set `editable: true` on relevant `colDef`s; handle
    `(cellValueChanged)` to persist changes.
  - CSV export: `CsvExportModule` (Community). Real `.xlsx` export with formulas/
    multiple sheets needs `ExcelExportModule` (Enterprise) — confirm before adding.
  - Row grouping / pivoting: Enterprise-only — confirm before adding.
- Put grid column definitions and value formatters in the component class, not the
  template, so they're typed and testable.
- For custom cell renderers/editors, prefer Angular components registered by direct
  reference (`cellRenderer: MyCellComponent`) over registering by string name.
- **Wiring Firestore data into a grid:** pull `rowData` from the relevant
  `*.service.ts` (via `toSignal()` or `async` pipe → assign on subscribe), don't call
  Firestore functions directly from the grid component. For inline-edited cells,
  `(cellValueChanged)` should call the service's update method, which writes to
  Firestore (e.g. `updateDoc`) — don't mutate `rowData` only on the client.

## Session Continuity (read before starting work, update before stopping)

- Maintain a running journal at `docs/journal.md`. After each work session, append a
  dated entry: what was done, why, what's still open, and any decisions made.
- **Always write real output to files on disk** (components, services, configs) —
  don't just describe code in chat. The journal + the actual files on disk are the
  source of truth for resuming work, not chat history.
- Before ending a session, leave a short "Next steps" note at the bottom of the
  current journal entry so the next session can pick up immediately.
- If a non-trivial architectural decision is made (e.g. choosing AG Grid Enterprise,
  picking a state management approach), record it in `docs/journal.md` with a
  one-line rationale — don't make Claude re-derive it next time.

## Reference docs

See these files for deeper context when relevant — read before starting related work:
- `docs/journal.md` — running session log / where we left off
- `docs/architecture.md` — (optional) higher-level architecture notes, if the project grows
- `firestore.rules` — security rules; check/update alongside any new collection

## Gotchas

- (Fill in as you hit them — project-specific quirks, workarounds, things Claude
  got wrong once that are worth a permanent note.)
