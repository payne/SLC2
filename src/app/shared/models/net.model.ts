/**
 * Net document stored at nets/{netId}
 */
export interface Net {
  id: string;
  organization: string;
  netType: NetType;
  createdBy: string; // UID of creator
  ncs: string; // UID of Net Control Station
  backupNcs?: string; // UID of Backup Controller
  startTime: Date;
  endTime?: Date;
  band?: string;
  freq?: string;
  notes?: string;
  status: NetStatus;
  joinCode: string; // 4-8 char radio-friendly code
  comments?: string;
}

export type NetStatus = 'active' | 'closed';

export type NetType =
  | 'Emergency/ARES'
  | 'Training'
  | 'Traffic/NTS'
  | 'Weather/SKYWARN'
  | 'Social/Rag-chew'
  | 'Other';

export const NET_TYPES: NetType[] = [
  'Emergency/ARES',
  'Training',
  'Traffic/NTS',
  'Weather/SKYWARN',
  'Social/Rag-chew',
  'Other',
];

/**
 * Net member document stored at nets/{netId}/members/{uid}
 */
export interface NetMember {
  id: string; // UID
  joinedAt: Date;
}

/**
 * Net presence document stored at nets/{netId}/presence/{uid}
 * Updated via heartbeat every ~20s
 */
export interface NetPresence {
  id: string; // UID
  lastSeen: Date;
  callsign?: string;
}

/**
 * Radio-friendly alphabet excluding ambiguous characters (0/O, 1/l/I)
 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random join code
 */
export function generateJoinCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}
