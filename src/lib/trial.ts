'use client';

import { getDeviceFingerprint } from './fingerprint';
import {
  getTrialByDevice,
  createOrUpdateTrialRecord,
  incrementTrialUsage,
  getUserTrialCount,
  getSubscription,
} from './firestore';
import { TrialStatus, TRIAL_LIMIT, MAX_DEVICES_PER_ACCOUNT, Subscription } from '@/types/subscription';

// Helper to check if subscription is valid (active AND not expired)
function isSubscriptionValid(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;

  // Check if currentPeriodEnd exists and hasn't passed
  if (subscription.currentPeriodEnd) {
    const periodEnd = subscription.currentPeriodEnd.toDate();
    const now = new Date();

    // Add 1 day grace period for webhook delays
    const gracePeriodEnd = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000);

    if (now > gracePeriodEnd) {
      return false;
    }
  }

  return true;
}

export async function checkTrialStatus(
  userId: string,
  firmId: string | null
): Promise<TrialStatus> {
  // First check if user has an active AND non-expired subscription
  if (firmId) {
    const subscription = await getSubscription(firmId);
    if (isSubscriptionValid(subscription)) {
      // Active subscription - unlimited reports
      return { allowed: true, remaining: Infinity };
    }
  }

  const deviceId = await getDeviceFingerprint();

  // Ensure device is linked to user
  await createOrUpdateTrialRecord(deviceId, userId);

  // Check device trial limit
  const deviceTrial = await getTrialByDevice(deviceId);
  if (deviceTrial && deviceTrial.reportsGenerated >= TRIAL_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'DEVICE_LIMIT_REACHED',
    };
  }

  // Check user's trial limit
  const userTrialCount = await getUserTrialCount(userId);
  if (userTrialCount >= TRIAL_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'USER_LIMIT_REACHED',
    };
  }

  // Check for suspicious activity (device linked to too many Google accounts)
  if (deviceTrial?.linkedGoogleIds && deviceTrial.linkedGoogleIds.length >= MAX_DEVICES_PER_ACCOUNT) {
    // Only block if this user isn't already in the list
    if (!deviceTrial.linkedGoogleIds.includes(userId)) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'SUSPICIOUS_ACTIVITY',
      };
    }
  }

  const remaining = Math.min(
    TRIAL_LIMIT - (deviceTrial?.reportsGenerated || 0),
    TRIAL_LIMIT - userTrialCount
  );

  return { allowed: remaining > 0, remaining };
}

export async function recordTrialUsage(userId: string): Promise<void> {
  const deviceId = await getDeviceFingerprint();
  await incrementTrialUsage(deviceId, userId);
}

export async function initializeTrialTracking(userId: string): Promise<void> {
  const deviceId = await getDeviceFingerprint();
  await createOrUpdateTrialRecord(deviceId, userId);
}
