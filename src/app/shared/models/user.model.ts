/**
 * User document stored at users/{uid}
 * Created when a user claims their invitation
 */
export interface User {
  id: string; // Firebase Auth UID
  email: string;
  callsign: string;
  level: UserLevel;
  root?: boolean; // Only set via seed script, never grantable in-app
  invitedBy: string; // UID of the user who invited them
  joinedAt: Date;
  promotedBy?: string; // UID of user who promoted them
  promotedAt?: Date;
}

export type UserLevel = 'operator' | 'inviter';

/**
 * Check if user has at least inviter level
 */
export function isInviter(user: User | null): boolean {
  return user?.level === 'inviter';
}

/**
 * Check if user is a root admin
 */
export function isRoot(user: User | null): boolean {
  return user?.root === true;
}
