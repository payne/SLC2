# Contributing to Ham Radio Net Logger

Thank you for your interest in contributing! This document provides guidelines for development.

## Development Setup

### Prerequisites

- Node.js 22.22.3+
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Getting Started

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Start the development environment:
   ```bash
   npm run dev
   ```

4. Seed test data:
   ```bash
   npm run seed
   ```

## Project Conventions

### Angular

- **Standalone components only** - No NgModules
- **Zoneless** - Uses `provideZonelessChangeDetection()`
- **Signals** - Use signals for state management
- **Built-in control flow** - Use `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`)
- **SCSS** - One `.scss` file per component

### File Naming

- **Files**: kebab-case (e.g., `net-log.component.ts`)
- **Classes**: PascalCase (e.g., `NetLogComponent`)
- **Properties/Methods**: camelCase (e.g., `activeNet()`)

### Code Style

- TypeScript strict mode enabled
- No `any` without justification
- Prefer signals over RxJS observables for local state
- Use RxJS for async streams (HTTP, WebSocket, Firestore)

## Testing

### Unit Tests

```bash
npm test
```

Tests use Vitest. Write tests for:
- Call-sign normalization/matching
- Signal stores
- CSV parse/serialize round-trip
- Code generation logic

### Firestore Rules Tests

```bash
npm run test:rules
```

Located in `tests/firestore.rules.test.ts`. Cover:
- Invite-only gating
- Tier/root checks
- NCS-only writes
- Membership-gated reads

### E2E Tests

```bash
npm run e2e
```

Uses Playwright with Page Object Model pattern. Key test:
- Offline test proving check-ins survive disconnect and sync on reconnect

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the conventions above
3. Ensure all tests pass
4. Update `docs/journal.md` if making significant changes
5. Submit a PR with a clear description

## Firestore Rules

When adding new collections or modifying access patterns:

1. Update `firestore.rules`
2. Add corresponding tests in `tests/firestore.rules.test.ts`
3. Document the rule intent in comments

## Security

- Never commit secrets or real PII
- Use synthetic/seed data only
- Validate all user input on both client and server (rules)

## Questions?

Open an issue for questions or discussion.
