---
paths:
  - "src/app/**/*grid*.ts"
  - "src/app/**/*grid*.html"
  - "src/app/**/*table*.ts"
---

# AG Grid Rules (path-scoped)

This file only loads when Claude reads/edits files matching the paths above —
keeps grid-specific detail out of context when working elsewhere.

- Default `defaultColDef` for every grid: `{ flex: 1, sortable: true, filter: true, resizable: true }`
  unless a specific column needs an override.
- Always type `colDefs` as `ColDef[]` imported from `ag-grid-community`.
- Register only the AG Grid modules actually used in `ModuleRegistry.registerModules([...])`
  — don't use `AllCommunityModule` in production code (fine for quick prototyping only).
- Grid container must have an explicit height set in the component's `.scss` —
  AG Grid will silently render at 0px without it.
- New cell renderers/editors go in `shared/components/grid-cells/` and are registered
  by direct component reference, not by string name.
- Before adding any `ag-grid-enterprise` feature (row grouping, pivoting, Excel export
  with formulas, master/detail), stop and confirm with the user — it changes the
  license/cost profile of the app.
