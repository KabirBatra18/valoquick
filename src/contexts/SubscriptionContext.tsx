'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useFirm } from './FirmContext';
import { Subscription, TrialStatus, SubscriptionContextType, SeatUsageInfo } from '@/types/subscription';
import { subscribeToSubscription, checkSeatAvailability } from '@/lib/firestore';
import { checkTrialStatus, initializeTrialTracking } from '@/lib/trial';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Helper to check if subscription period has expired
function isSubscriptionValid(subscription: Subscription | null): boolean {
  if (!subscription) return false;

  // Must be active status
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

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { firm, members } = useFirm();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [seatInfo, setSeatInfo] = useState<SeatUsageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to subscription changes
  useEffect(() => {
    if (!firm?.id) {
      setSubscription(null);
      setSeatInfo(null);
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToSubscription(firm.id, (sub) => {
      setSubscription(sub);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firm?.id]);

  // Fetch seat info when subscription or members change
  const refreshSeatInfo = useCallback(async () => {
    if (!firm?.id) {
      setSeatInfo(null);
      return;
    }

    try {
      const availability = await checkSeatAvailability(firm.id);
      setSeatInfo({
        used: availability.used,
        total: availability.total === Infinity ? 999 : availability.total,
        available: availability.available === Infinity ? 999 : availability.available,
        canAddMembers: availability.canAddMembers,
        pendingReduction: subscription?.seats?.pendingReduction,
      });
    } catch (error) {
      console.error('Error fetching seat info:', error);
    }
  }, [firm?.id, subscription?.seats?.pendingReduction]);

  // Refresh seat info when subscription or members change
  useEffect(() => {
    refreshSeatInfo();
  }, [refreshSeatInfo, members?.length]);

  // Initialize trial tracking when user signs in
  useEffect(() => {
    if (user?.uid) {
      initializeTrialTracking(user.uid).catch(console.error);
    }
  }, [user?.uid]);

  // Check trial status
  const checkTrial = useCallback(async (): Promise<TrialStatus> => {
    if (!user?.uid) {
      return { allowed: false, remaining: 0 };
    }

    const status = await checkTrialStatus(user.uid, firm?.id || null);
    setTrialStatus(status);
    return status;
  }, [user?.uid, firm?.id]);

  // Check trial status on mount and when dependencies change
  useEffect(() => {
    if (user?.uid) {
      checkTrial().catch(console.error);
    }
  }, [user?.uid, firm?.id, checkTrial]);

  // Re-validate subscription on page focus/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && firm?.id) {
        // Force refresh subscription and trial status when page becomes visible
        refreshSeatInfo();
        if (user?.uid) {
          checkTrial().catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [firm?.id, user?.uid, refreshSeatInfo, checkTrial]);

  const refreshSubscription = async () => {
    if (user?.uid) {
      await checkTrial();
    }
  };

  // Check both status AND expiry date
  const isSubscribed = useMemo(() => isSubscriptionValid(subscription), [subscription]);
  const canGenerateReport = isSubscribed || (trialStatus?.allowed ?? false);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        trialStatus,
        isLoading,
        isSubscribed,
        canGenerateReport,
        seatInfo,
        refreshSubscription,
        refreshSeatInfo,
        checkTrialStatus: checkTrial,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
