import { Timestamp } from 'firebase/firestore';

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'past_due' | 'expired';
export type PlanType = 'monthly' | 'halfyearly' | 'yearly';

export interface TrialRecord {
  deviceFingerprint: string;
  reportsGenerated: number;
  linkedGoogleIds: string[];
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
}

export interface SeatInfo {
  included: number;                              // Always 1 (included in base)
  purchased: number;                             // Additional seats paid for
  total: number;                                 // included + purchased
  razorpaySeatsSubscriptionId?: string;          // Seats subscription ID
  seatsCurrentPeriodEnd?: Timestamp;
  seatsStatus?: 'active' | 'past_due' | 'cancelled';
  pendingReduction?: number;                     // Reduce to this many at next renewal
}

export interface Subscription {
  firmId: string;
  plan: PlanType;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  razorpaySubscriptionId: string;
  razorpayPaymentId: string;
  currentPeriodEnd: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  seats?: SeatInfo;
}

export interface PricingPlan {
  id: PlanType;
  name: string;
  amount: number; // in paise
  displayAmount: string; // formatted for display
  currency: string;
  period: 'month' | 'year';
  savings?: string;
  popular?: boolean;
}

// Auto-recurring subscription pricing
// Plan IDs are configured in environment variables (created in Razorpay Dashboard)
export const PRICING: Record<PlanType, PricingPlan> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    amount: 100000, // ₹1,000 in paise
    displayAmount: '₹1,000',
    currency: 'INR',
    period: 'month',
  },
  halfyearly: {
    id: 'halfyearly',
    name: '6 Months',
    amount: 500000, // ₹5,000 in paise
    displayAmount: '₹5,000',
    currency: 'INR',
    period: 'month', // 6-month period
    savings: '₹1,000',
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    amount: 900000, // ₹9,000 in paise
    displayAmount: '₹9,000',
    currency: 'INR',
    period: 'year',
    savings: '₹3,000',
    popular: true,
  },
};

// Per-seat pricing for additional team members
// Plan IDs are configured in environment variables (created in Razorpay Dashboard)
export const SEAT_PRICING: Record<PlanType, { amount: number; displayAmount: string; periodDays: number }> = {
  monthly: {
    amount: 40000,        // ₹400 in paise
    displayAmount: '₹400',
    periodDays: 30,
  },
  halfyearly: {
    amount: 200000,       // ₹2,000 in paise
    displayAmount: '₹2,000',
    periodDays: 180,
  },
  yearly: {
    amount: 360000,       // ₹3,600 in paise
    displayAmount: '₹3,600',
    periodDays: 365,
  },
};

export const TRIAL_LIMIT = 5;
export const MAX_DEVICES_PER_ACCOUNT = 3;

export interface TrialStatus {
  allowed: boolean;
  remaining: number;
  reason?: 'DEVICE_LIMIT_REACHED' | 'USER_LIMIT_REACHED' | 'SUSPICIOUS_ACTIVITY';
}

export interface SeatUsageInfo {
  used: number;           // Current members + pending invites
  total: number;          // Total seats (included + purchased)
  available: number;      // total - used
  canAddMembers: boolean; // available > 0
  pendingReduction?: number;
}

export interface SubscriptionContextType {
  subscription: Subscription | null;
  trialStatus: TrialStatus | null;
  isLoading: boolean;
  isSubscribed: boolean;
  isPastDue: boolean;
  canGenerateReport: boolean;
  seatInfo: SeatUsageInfo | null;
  refreshSubscription: () => Promise<void>;
  refreshSeatInfo: () => Promise<void>;
  checkTrialStatus: () => Promise<TrialStatus>;
}
