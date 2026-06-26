/**
 * Test data fixtures for E2E tests
 * These should match seed data in the Firebase emulator
 */

export const testUsers = {
  root: {
    email: 'root@example.com',
    callsign: 'N3PAY',
    level: 'inviter' as const,
    root: true,
  },
  inviter: {
    email: 'inviter@example.com',
    callsign: 'KF0SLC',
    level: 'inviter' as const,
  },
  operator: {
    email: 'operator@example.com',
    callsign: 'W5TEST',
    level: 'operator' as const,
  },
};

export const testRoster = [
  {
    callsign: 'KD0ABC',
    name: 'Test User One',
    licenseClass: 'General',
    attributes: {
      ics100: true,
      ares: true,
    },
  },
  {
    callsign: 'N0DEF',
    name: 'Test User Two',
    licenseClass: 'Extra',
    attributes: {
      ics100: true,
      ares: false,
      shelter: 'Certified',
    },
  },
  {
    callsign: 'KB3GHI',
    name: 'Test User Three',
    licenseClass: 'Technician',
    attributes: {
      ics100: false,
      ares: true,
    },
  },
];

export const testNet = {
  organization: 'Test ARES',
  netType: 'Training',
  joinCode: 'TEST42',
};

export const sampleCheckins = [
  {
    callsign: 'KD0ABC',
    firstName: 'Test User One',
    assignment: 'Net Control',
    location: 'City Hall',
    notes: 'Testing check-in',
    mileage: 10,
  },
  {
    callsign: 'N0DEF',
    firstName: 'Test User Two',
    assignment: 'Shadow',
    location: 'Remote',
    notes: '',
    mileage: 0,
  },
];
