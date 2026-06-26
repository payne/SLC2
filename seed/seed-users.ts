/**
 * Idempotent seed script for initial root users (N3PAY and KF0SLC)
 *
 * Run with: npx ts-node seed/seed-users.ts
 *
 * IMPORTANT: This script uses Firebase Admin SDK and must NOT be run
 * against production without explicit confirmation. It is intended for
 * local emulator development and initial production bootstrapping only.
 *
 * TODO (Phase 1):
 * - Implement Admin SDK initialization
 * - Create users/{uid} documents for root users
 * - Create invitations/{email} documents as 'claimed'
 */

// Placeholder Gmail addresses - replace before production deployment
const ROOT_USERS = [
  {
    callsign: 'N3PAY',
    email: '<<TODO: supply N3PAY Gmail>>',
    level: 'inviter' as const,
    root: true,
  },
  {
    callsign: 'KF0SLC',
    email: '<<TODO: supply KF0SLC Gmail>>',
    level: 'inviter' as const,
    root: true,
  },
];

console.log('Seed script placeholder - implementation in Phase 1');
console.log('Root users to be seeded:', ROOT_USERS);
