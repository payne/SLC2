---
paths:
  - "src/app/**/*.service.ts"
  - "src/app/shared/models/**/*.ts"
  - "firestore.rules"
---

# Firestore Rules (path-scoped)

Loads only when Claude reads/edits services, shared models, or security rules.

- Every Firestore-backed service method returns a typed `Observable<T>` or `Promise<T>`
  — never `any`.
- `collectionData()` / `docData()` calls always pass `{ idField: 'id' }`.
- New collection → corresponding interface in `shared/models/` AND a matching block
  in `firestore.rules`, added in the same change, not deferred to "later."
- Writes (`addDoc`/`setDoc`/`updateDoc`/`deleteDoc`) belong in the service layer only.
  Components call service methods; components never import Firestore functions
  directly.
- Be explicit in code comments about which observables are live listeners (kept open
  for real-time UI) vs. one-time reads — this matters for both cost and correctness.
