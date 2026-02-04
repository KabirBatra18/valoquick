import { Timestamp } from 'firebase/firestore';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type SubscriptionStatusType = 'trial' | 'active' | 'expired';

export interface UserDocument {
  email: string;
  displayName: string;
  firmId: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  // Trial tracking
  trialReportsUsed?: number;
  linkedDevices?: string[];
  subscriptionStatus?: SubscriptionStatusType;
  // Access revocation tracking
  accessRevoked?: boolean;
  accessRevokedAt?: Timestamp;
}

export interface Firm {
  id: string;
  name: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface FirmMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Timestamp;
  invitedBy?: string;
}

export interface FirmInvite {
  id: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  invitedAt: Timestamp;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Timestamp;
  firmId: string;
  firmName: string;
}

export interface FirestoreReportMetadata {
  id: string;
  title: string;
  propertyAddress: string;
  status: 'active' | 'concluded';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completionPercentage: number;
  createdBy: string;
  lastModifiedBy: string;
}
