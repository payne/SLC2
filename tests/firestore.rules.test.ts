import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'demo-ham-net-logger';

// Helper to create authenticated context
function getAuthenticatedContext(uid: string, email?: string) {
  return testEnv.authenticatedContext(uid, { email: email ?? `${uid}@example.com` });
}

// Helper to create unauthenticated context
function getUnauthenticatedContext() {
  return testEnv.unauthenticatedContext();
}

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // ============================================
  // Users Collection Tests
  // ============================================
  describe('Users Collection', () => {
    it('denies read access to unauthenticated users', async () => {
      const db = getUnauthenticatedContext().firestore();
      const userRef = doc(db, 'users', 'user1');
      await assertFails(getDoc(userRef));
    });

    it('allows users to read their own document', async () => {
      // Seed the user document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'user1'), {
          email: 'user1@example.com',
          callsign: 'TEST1',
          level: 'operator',
        });
      });

      const db = getAuthenticatedContext('user1').firestore();
      const userRef = doc(db, 'users', 'user1');
      await assertSucceeds(getDoc(userRef));
    });

    it('denies users from reading other users documents (without inviter role)', async () => {
      // Seed user documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'user1'), {
          email: 'user1@example.com',
          callsign: 'TEST1',
          level: 'operator',
        });
        await setDoc(doc(db, 'users', 'user2'), {
          email: 'user2@example.com',
          callsign: 'TEST2',
          level: 'operator',
        });
      });

      const db = getAuthenticatedContext('user1').firestore();
      const otherUserRef = doc(db, 'users', 'user2');
      await assertFails(getDoc(otherUserRef));
    });

    it('allows inviters to read all user documents', async () => {
      // Seed user documents
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'inviter1'), {
          email: 'inviter1@example.com',
          callsign: 'INV1',
          level: 'inviter',
        });
        await setDoc(doc(db, 'users', 'user2'), {
          email: 'user2@example.com',
          callsign: 'TEST2',
          level: 'operator',
        });
      });

      const db = getAuthenticatedContext('inviter1').firestore();
      const otherUserRef = doc(db, 'users', 'user2');
      await assertSucceeds(getDoc(otherUserRef));
    });
  });

  // ============================================
  // Invitations Collection Tests
  // ============================================
  describe('Invitations Collection', () => {
    it('allows users to read their own pending invitation', async () => {
      const userEmail = 'newuser@example.com';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'invitations', userEmail), {
          email: userEmail,
          callsign: 'NEW1',
          level: 'operator',
          status: 'pending',
          invitedBy: 'inviter1',
        });
      });

      const db = getAuthenticatedContext('newuser', userEmail).firestore();
      const inviteRef = doc(db, 'invitations', userEmail);
      await assertSucceeds(getDoc(inviteRef));
    });

    it('allows inviters to create invitations', async () => {
      // Seed inviter
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'inviter1'), {
          email: 'inviter1@example.com',
          callsign: 'INV1',
          level: 'inviter',
        });
      });

      const db = getAuthenticatedContext('inviter1').firestore();
      const inviteRef = doc(db, 'invitations', 'newuser@example.com');
      await assertSucceeds(
        setDoc(inviteRef, {
          email: 'newuser@example.com',
          callsign: 'NEW1',
          level: 'operator',
          status: 'pending',
          invitedBy: 'inviter1',
          createdAt: serverTimestamp(),
        })
      );
    });

    it('denies operators from creating invitations', async () => {
      // Seed operator
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'operator1'), {
          email: 'operator1@example.com',
          callsign: 'OP1',
          level: 'operator',
        });
      });

      const db = getAuthenticatedContext('operator1').firestore();
      const inviteRef = doc(db, 'invitations', 'newuser@example.com');
      await assertFails(
        setDoc(inviteRef, {
          email: 'newuser@example.com',
          callsign: 'NEW1',
          level: 'operator',
          status: 'pending',
          invitedBy: 'operator1',
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  // ============================================
  // Nets Collection Tests
  // ============================================
  describe('Nets Collection', () => {
    it('allows inviters to create nets', async () => {
      // Seed inviter
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'inviter1'), {
          email: 'inviter1@example.com',
          callsign: 'INV1',
          level: 'inviter',
        });
      });

      const db = getAuthenticatedContext('inviter1').firestore();
      const netsRef = collection(db, 'nets');
      await assertSucceeds(
        addDoc(netsRef, {
          organization: 'Test Org',
          netType: 'Training',
          createdBy: 'inviter1',
          ncs: 'inviter1',
          startTime: serverTimestamp(),
          status: 'active',
          joinCode: 'ABC123',
        })
      );
    });

    it('denies operators from creating nets', async () => {
      // Seed operator
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'operator1'), {
          email: 'operator1@example.com',
          callsign: 'OP1',
          level: 'operator',
        });
      });

      const db = getAuthenticatedContext('operator1').firestore();
      const netsRef = collection(db, 'nets');
      await assertFails(
        addDoc(netsRef, {
          organization: 'Test Org',
          netType: 'Training',
          createdBy: 'operator1',
          ncs: 'operator1',
          startTime: serverTimestamp(),
          status: 'active',
          joinCode: 'ABC123',
        })
      );
    });

    it('allows authorized users to read nets', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'operator1'), {
          email: 'operator1@example.com',
          callsign: 'OP1',
          level: 'operator',
        });
        await setDoc(doc(db, 'nets', 'net1'), {
          organization: 'Test Org',
          netType: 'Training',
          status: 'active',
        });
      });

      const db = getAuthenticatedContext('operator1').firestore();
      const netRef = doc(db, 'nets', 'net1');
      await assertSucceeds(getDoc(netRef));
    });
  });

  // ============================================
  // Check-ins Tests
  // ============================================
  describe('Check-ins Collection', () => {
    it('allows NCS to create check-ins', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'ncs1'), {
          email: 'ncs1@example.com',
          callsign: 'NCS1',
          level: 'inviter',
        });
        await setDoc(doc(db, 'nets', 'net1'), {
          organization: 'Test Org',
          ncs: 'ncs1',
          status: 'active',
        });
        await setDoc(doc(db, 'nets', 'net1', 'members', 'ncs1'), {
          joinedAt: serverTimestamp(),
        });
      });

      const db = getAuthenticatedContext('ncs1').firestore();
      const checkinRef = collection(db, 'nets', 'net1', 'checkins');
      await assertSucceeds(
        addDoc(checkinRef, {
          callsign: 'TEST1',
          firstName: 'Test',
          signInTime: serverTimestamp(),
          createdBy: 'ncs1',
        })
      );
    });

    it('denies non-NCS from creating check-ins', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'ncs1'), {
          email: 'ncs1@example.com',
          callsign: 'NCS1',
          level: 'inviter',
        });
        await setDoc(doc(db, 'users', 'operator1'), {
          email: 'operator1@example.com',
          callsign: 'OP1',
          level: 'operator',
        });
        await setDoc(doc(db, 'nets', 'net1'), {
          organization: 'Test Org',
          ncs: 'ncs1',
          status: 'active',
        });
        await setDoc(doc(db, 'nets', 'net1', 'members', 'operator1'), {
          joinedAt: serverTimestamp(),
        });
      });

      const db = getAuthenticatedContext('operator1').firestore();
      const checkinRef = collection(db, 'nets', 'net1', 'checkins');
      await assertFails(
        addDoc(checkinRef, {
          callsign: 'TEST1',
          firstName: 'Test',
          signInTime: serverTimestamp(),
          createdBy: 'operator1',
        })
      );
    });

    it('allows net members to read check-ins', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'operator1'), {
          email: 'operator1@example.com',
          callsign: 'OP1',
          level: 'operator',
        });
        await setDoc(doc(db, 'nets', 'net1'), {
          organization: 'Test Org',
          ncs: 'ncs1',
          status: 'active',
        });
        await setDoc(doc(db, 'nets', 'net1', 'members', 'operator1'), {
          joinedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'nets', 'net1', 'checkins', 'checkin1'), {
          callsign: 'TEST1',
          firstName: 'Test',
        });
      });

      const db = getAuthenticatedContext('operator1').firestore();
      const checkinRef = doc(db, 'nets', 'net1', 'checkins', 'checkin1');
      await assertSucceeds(getDoc(checkinRef));
    });
  });

  // ============================================
  // Audit Log Tests
  // ============================================
  describe('Audit Log Collection', () => {
    it('allows authorized users to create audit events', async () => {
      // Seed user
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'user1'), {
          email: 'user1@example.com',
          callsign: 'TEST1',
          level: 'operator',
        });
      });

      const db = getAuthenticatedContext('user1').firestore();
      const auditRef = collection(db, 'auditLog');
      await assertSucceeds(
        addDoc(auditRef, {
          type: 'createNet',
          actorUid: 'user1',
          timestamp: serverTimestamp(),
        })
      );
    });

    it('denies users from reading audit log (non-root)', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'operator1'), {
          email: 'operator1@example.com',
          callsign: 'OP1',
          level: 'operator',
        });
        await setDoc(doc(db, 'auditLog', 'event1'), {
          type: 'createNet',
          actorUid: 'someone',
        });
      });

      const db = getAuthenticatedContext('operator1').firestore();
      const eventRef = doc(db, 'auditLog', 'event1');
      await assertFails(getDoc(eventRef));
    });

    it('allows root users to read audit log', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'root1'), {
          email: 'root1@example.com',
          callsign: 'ROOT1',
          level: 'inviter',
          root: true,
        });
        await setDoc(doc(db, 'auditLog', 'event1'), {
          type: 'createNet',
          actorUid: 'someone',
        });
      });

      const db = getAuthenticatedContext('root1').firestore();
      const eventRef = doc(db, 'auditLog', 'event1');
      await assertSucceeds(getDoc(eventRef));
    });

    it('denies updates to audit events (append-only)', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'root1'), {
          email: 'root1@example.com',
          callsign: 'ROOT1',
          level: 'inviter',
          root: true,
        });
        await setDoc(doc(db, 'auditLog', 'event1'), {
          type: 'createNet',
          actorUid: 'someone',
        });
      });

      const db = getAuthenticatedContext('root1').firestore();
      const eventRef = doc(db, 'auditLog', 'event1');
      await assertFails(
        updateDoc(eventRef, {
          type: 'modified',
        })
      );
    });
  });

  // ============================================
  // Promotion/Demotion Tests
  // ============================================
  describe('User Promotion/Demotion', () => {
    it('allows inviters to promote operators', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'inviter1'), {
          email: 'inviter1@example.com',
          callsign: 'INV1',
          level: 'inviter',
        });
        await setDoc(doc(db, 'users', 'operator1'), {
          email: 'operator1@example.com',
          callsign: 'OP1',
          level: 'operator',
        });
      });

      const db = getAuthenticatedContext('inviter1').firestore();
      const userRef = doc(db, 'users', 'operator1');
      await assertSucceeds(
        updateDoc(userRef, {
          level: 'inviter',
          promotedBy: 'inviter1',
          promotedAt: serverTimestamp(),
        })
      );
    });

    it('allows root to demote inviters', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'root1'), {
          email: 'root1@example.com',
          callsign: 'ROOT1',
          level: 'inviter',
          root: true,
        });
        await setDoc(doc(db, 'users', 'inviter1'), {
          email: 'inviter1@example.com',
          callsign: 'INV1',
          level: 'inviter',
        });
      });

      const db = getAuthenticatedContext('root1').firestore();
      const userRef = doc(db, 'users', 'inviter1');
      await assertSucceeds(
        updateDoc(userRef, {
          level: 'operator',
          promotedBy: null,
          promotedAt: null,
        })
      );
    });

    it('denies non-root from demoting users', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'inviter1'), {
          email: 'inviter1@example.com',
          callsign: 'INV1',
          level: 'inviter',
        });
        await setDoc(doc(db, 'users', 'inviter2'), {
          email: 'inviter2@example.com',
          callsign: 'INV2',
          level: 'inviter',
        });
      });

      const db = getAuthenticatedContext('inviter1').firestore();
      const userRef = doc(db, 'users', 'inviter2');
      await assertFails(
        updateDoc(userRef, {
          level: 'operator',
          promotedBy: null,
          promotedAt: null,
        })
      );
    });

    it('denies demotion of root users', async () => {
      // Seed data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'root1'), {
          email: 'root1@example.com',
          callsign: 'ROOT1',
          level: 'inviter',
          root: true,
        });
        await setDoc(doc(db, 'users', 'root2'), {
          email: 'root2@example.com',
          callsign: 'ROOT2',
          level: 'inviter',
          root: true,
        });
      });

      const db = getAuthenticatedContext('root1').firestore();
      const userRef = doc(db, 'users', 'root2');
      await assertFails(
        updateDoc(userRef, {
          level: 'operator',
        })
      );
    });
  });
});
