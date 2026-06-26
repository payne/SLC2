/**
 * Idempotent seed script for initial root users (N3PAY and KF0SLC)
 *
 * Run with:
 *   npm run seed           # Against emulators (default)
 *   npm run seed:prod      # Against production (requires confirmation)
 *
 * IMPORTANT: This script uses Firebase Admin SDK and must NOT be run
 * against production without explicit confirmation. It is intended for
 * local emulator development and initial production bootstrapping only.
 *
 * For emulator: FIRESTORE_EMULATOR_HOST=localhost:8080 must be set
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ============================================
// Configuration
// ============================================

// Placeholder Gmail addresses - replace before production deployment
const ROOT_USERS = [
  {
    callsign: 'N3PAY',
    // For emulator testing, use a test email
    // Replace with actual Gmail for production
    email: process.env.N3PAY_EMAIL || 'n3pay@test.example.com',
    level: 'inviter' as const,
    root: true,
  },
  {
    callsign: 'KF0SLC',
    // For emulator testing, use a test email
    // Replace with actual Gmail for production
    email: process.env.KF0SLC_EMAIL || 'kf0slc@test.example.com',
    level: 'inviter' as const,
    root: true,
  },
];

// Check if running against emulators
const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

// ============================================
// Initialize Firebase Admin
// ============================================

function initializeFirebase(): void {
  if (getApps().length > 0) {
    return; // Already initialized
  }

  if (isEmulator) {
    // For emulators, use demo project (no credentials needed)
    initializeApp({
      projectId: 'demo-ham-net-logger',
    });
    console.log('🔧 Connected to Firebase Emulators');
  } else {
    // For production, use default credentials or service account
    // This will use GOOGLE_APPLICATION_CREDENTIALS env var or
    // Application Default Credentials
    initializeApp();
    console.log('🔥 Connected to Production Firebase');
  }
}

// ============================================
// Seed Functions
// ============================================

async function seedRootUsers(): Promise<void> {
  const db = getFirestore();
  const auth = getAuth();

  console.log('\n📋 Seeding root users...\n');

  for (const user of ROOT_USERS) {
    // Validate email is set (skip if still placeholder)
    if (user.email.includes('<<TODO') || user.email.includes('undefined')) {
      console.log(`⏭️  Skipping ${user.callsign}: Email placeholder not replaced`);
      continue;
    }

    const normalizedEmail = user.email.toLowerCase();
    console.log(`Processing ${user.callsign} (${normalizedEmail})...`);

    try {
      // Check if invitation already exists
      const invitationRef = db.collection('invitations').doc(normalizedEmail);
      const invitationDoc = await invitationRef.get();

      if (invitationDoc.exists) {
        console.log(`  ✓ Invitation already exists for ${normalizedEmail}`);
      } else {
        // Create invitation as 'claimed' (for bootstrap)
        await invitationRef.set({
          email: normalizedEmail,
          callsign: user.callsign,
          level: user.level,
          invitedBy: 'SYSTEM',
          createdAt: FieldValue.serverTimestamp(),
          status: 'claimed',
          claimedAt: FieldValue.serverTimestamp(),
          claimedBy: 'SYSTEM',
        });
        console.log(`  ✓ Created invitation for ${normalizedEmail}`);
      }

      // For emulators, we can create mock auth users
      if (isEmulator) {
        try {
          // Try to get existing user
          const existingUser = await auth.getUserByEmail(normalizedEmail).catch(() => null);

          if (existingUser) {
            console.log(`  ✓ Auth user already exists: ${existingUser.uid}`);

            // Check if user document exists
            const userRef = db.collection('users').doc(existingUser.uid);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
              await userRef.set({
                email: normalizedEmail,
                callsign: user.callsign,
                level: user.level,
                root: user.root,
                invitedBy: 'SYSTEM',
                joinedAt: FieldValue.serverTimestamp(),
              });
              console.log(`  ✓ Created user document for ${existingUser.uid}`);
            } else {
              // Update root status if needed
              const userData = userDoc.data();
              if (userData?.root !== user.root) {
                await userRef.update({ root: user.root });
                console.log(`  ✓ Updated root status for ${existingUser.uid}`);
              } else {
                console.log(`  ✓ User document already exists for ${existingUser.uid}`);
              }
            }
          } else {
            // Create auth user in emulator
            const newUser = await auth.createUser({
              email: normalizedEmail,
              emailVerified: true,
              displayName: user.callsign,
            });
            console.log(`  ✓ Created auth user: ${newUser.uid}`);

            // Create user document
            const userRef = db.collection('users').doc(newUser.uid);
            await userRef.set({
              email: normalizedEmail,
              callsign: user.callsign,
              level: user.level,
              root: user.root,
              invitedBy: 'SYSTEM',
              joinedAt: FieldValue.serverTimestamp(),
            });
            console.log(`  ✓ Created user document for ${newUser.uid}`);
          }
        } catch (authError) {
          console.log(`  ⚠️  Could not create auth user (this is OK for emulators): ${authError}`);
        }
      } else {
        // For production, just prepare invitations
        // User documents will be created when users actually sign in and claim
        console.log(`  ℹ️  Production mode: User will claim invitation on first sign-in`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${user.callsign}:`, error);
    }
  }

  console.log('\n✅ Seed complete!\n');
}

// ============================================
// Seed Sample Data (Emulator Only)
// ============================================

async function seedSampleData(): Promise<void> {
  if (!isEmulator) {
    console.log('⏭️  Skipping sample data in production mode');
    return;
  }

  const db = getFirestore();

  console.log('📋 Seeding sample roster data...\n');

  const samplePeople = [
    {
      callsign: 'W1AW',
      name: 'ARRL Headquarters',
      licenseClass: 'Amateur Extra',
      attributes: { ics100: true, ics200: true, ics700: true, ares: true },
      trainings: [],
      certifications: [],
      abilities: ['digital-modes', 'emergency-comms'],
    },
    {
      callsign: 'K5TEST',
      name: 'Test Operator',
      licenseClass: 'General',
      attributes: { ics100: true, ares: true },
      trainings: [],
      certifications: [],
      abilities: ['net-control'],
    },
    {
      callsign: 'N0CALL',
      name: 'New Ham',
      licenseClass: 'Technician',
      attributes: {},
      trainings: [],
      certifications: [],
      abilities: [],
    },
  ];

  for (const person of samplePeople) {
    const personRef = db.collection('people').doc(person.callsign);
    const existing = await personRef.get();

    if (existing.exists) {
      console.log(`  ✓ ${person.callsign} already exists`);
    } else {
      await personRef.set(person);
      console.log(`  ✓ Created ${person.callsign}`);
    }
  }

  // Seed default attribute configuration
  const configRef = db.collection('config').doc('attributeColumns');
  const configDoc = await configRef.get();

  if (configDoc.exists) {
    console.log('  ✓ Attribute config already exists');
  } else {
    await configRef.set({
      attributeColumns: [
        { column: 'a1', key: 'ics100', header: 'ICS-100', type: 'boolean' },
        { column: 'a2', key: 'ics200', header: 'ICS-200', type: 'boolean' },
        { column: 'a3', key: 'ics700', header: 'ICS-700', type: 'boolean' },
        { column: 'a4', key: 'ics800', header: 'ICS-800', type: 'boolean' },
        { column: 'a5', key: 'ares', header: 'ARES', type: 'boolean' },
        { column: 'a6', key: 'races', header: 'RACES', type: 'boolean' },
      ],
    });
    console.log('  ✓ Created default attribute config');
  }

  console.log('\n✅ Sample data seeded!\n');
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  console.log('\n🌱 Ham Net Logger - Seed Script\n');
  console.log('='.repeat(40));

  if (!isEmulator) {
    console.log('\n⚠️  WARNING: Running against PRODUCTION!\n');
    console.log('Set FIRESTORE_EMULATOR_HOST=localhost:8080 for emulator mode.\n');

    // In production, require explicit confirmation
    const args = process.argv.slice(2);
    if (!args.includes('--confirm-production')) {
      console.log('Add --confirm-production flag to proceed with production seeding.');
      process.exit(1);
    }
  }

  initializeFirebase();

  await seedRootUsers();
  await seedSampleData();

  console.log('Done! 🎉\n');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
