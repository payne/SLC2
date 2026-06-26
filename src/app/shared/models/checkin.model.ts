/**
 * Check-in document stored at nets/{netId}/checkins/{checkinId}
 */
export interface CheckIn {
  id: string;
  callsign: string;
  firstName: string;
  assignment?: string;
  location?: string;
  notes?: string;
  mileage?: number;
  attributeSnapshot: AttributeSnapshot; // Frozen from roster at check-in time
  signInTime: Date;
  signOutTime?: Date;
  createdBy: string; // UID of NCS/backup who logged it
  lastEditedBy?: string; // UID of last editor
  lastEditedAt?: Date;
}

/**
 * Attribute columns snapshot (a1-a8) frozen at check-in time
 */
export interface AttributeSnapshot {
  a1?: string | boolean | number;
  a2?: string | boolean | number;
  a3?: string | boolean | number;
  a4?: string | boolean | number;
  a5?: string | boolean | number;
  a6?: string | boolean | number;
  a7?: string | boolean | number;
  a8?: string | boolean | number;
}
