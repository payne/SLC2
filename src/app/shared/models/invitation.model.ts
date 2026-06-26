/**
 * Invitation document stored at invitations/{email}
 * Email is normalized to lowercase
 */
export interface Invitation {
  id: string; // Email address (lowercase)
  email: string;
  callsign: string;
  level: InvitationLevel;
  invitedBy: string; // UID of the inviter
  createdAt: Date;
  status: InvitationStatus;
  claimedAt?: Date;
  claimedBy?: string; // UID of user who claimed it
  revokedAt?: Date;
  revokedBy?: string; // UID of user who revoked it
}

export type InvitationLevel = 'operator' | 'inviter';
export type InvitationStatus = 'pending' | 'claimed' | 'revoked';
