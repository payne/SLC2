/**
 * Person document stored at people/{CALLSIGN}
 * Doc ID is normalized uppercase call sign
 */
export interface Person {
  id: string; // Call sign (uppercase)
  callsign: string;
  name: string;
  licenseClass?: LicenseClass;
  contact?: ContactInfo;
  attributes: Record<string, string | boolean | number>; // Keyed by attribute config keys
  trainings: Training[];
  certifications: Certification[];
  abilities: string[]; // e.g., "shelter-mgmt", "digital-modes"
}

export type LicenseClass = 'Technician' | 'General' | 'Amateur Extra';

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

export interface Training {
  name: string;
  org: string;
  dateEarned: Date;
  expires?: Date;
  status: CredentialStatus;
}

export interface Certification {
  name: string;
  org: string;
  dateEarned: Date;
  expires?: Date;
  status: CredentialStatus;
}

export type CredentialStatus = 'active' | 'expired' | 'pending';

/**
 * Normalize call sign to uppercase
 */
export function normalizeCallsign(callsign: string): string {
  return callsign.toUpperCase().trim();
}
