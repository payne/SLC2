/**
 * Audit log event stored at auditLog/{eventId}
 * Append-only collection for tracking administrative actions
 */
export interface AuditEvent {
  id: string;
  type: AuditEventType;
  actorUid: string; // UID of user who performed the action
  actorCallsign?: string;
  timestamp: Date;

  // Target varies by event type
  targetUid?: string; // For user-related events
  targetEmail?: string; // For invitation events
  targetCallsign?: string;
  netId?: string; // For net-related events

  // Additional context
  details?: Record<string, unknown>;
}

export type AuditEventType =
  | 'invite'
  | 'promote'
  | 'demote'
  | 'remove'
  | 'revoke'
  | 'createNet'
  | 'closeNet'
  | 'claimNcs'
  | 'assignBackup';
