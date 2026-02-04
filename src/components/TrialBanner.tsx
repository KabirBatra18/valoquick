'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { TRIAL_LIMIT } from '@/types/subscription';

interface TrialBannerProps {
  onUpgrade?: () => void;
}

export default function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const { trialStatus, isSubscribed, isLoading } = useSubscription();

  // Don't show if subscribed or still loading
  if (isLoading || isSubscribed) {
    return null;
  }

  // Don't show if no trial status
  if (!trialStatus) {
    return null;
  }

  const remaining = trialStatus.remaining;
  const used = TRIAL_LIMIT - remaining;
  const percentage = (used / TRIAL_LIMIT) * 100;

  // Show different states
  if (!trialStatus.allowed) {
    // Trial exhausted
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">
              Free Trial Ended
            </h3>
            <p className="text-text-secondary">
              {trialStatus.reason === 'SUSPICIOUS_ACTIVITY'
                ? 'Your trial access has been restricted. Please contact support.'
                : `You've used all ${TRIAL_LIMIT} free reports. Upgrade to continue creating reports.`}
            </p>
          </div>
          {trialStatus.reason !== 'SUSPICIOUS_ACTIVITY' && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="btn btn-primary whitespace-nowrap"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show remaining reports
  if (remaining <= 2) {
    // Low on reports - warning state
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-amber-400">
                {remaining} Free Report{remaining !== 1 ? 's' : ''} Left
              </h3>
            </div>
            <div className="w-full bg-surface-200 rounded-full h-2 mb-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-sm text-text-tertiary">
              {used} of {TRIAL_LIMIT} free reports used
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="btn btn-primary whitespace-nowrap"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // Normal trial state
  return (
    <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-brand">
              Free Trial
            </h3>
            <span className="text-sm bg-brand/20 text-brand px-2 py-0.5 rounded-full">
              {remaining} reports remaining
            </span>
          </div>
          <div className="w-full bg-surface-200 rounded-full h-2 mb-2">
            <div
              className="bg-brand h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-sm text-text-tertiary">
            {used} of {TRIAL_LIMIT} free reports used
          </p>
        </div>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="btn btn-secondary whitespace-nowrap"
          >
            View Pricing
          </button>
        )}
      </div>
    </div>
  );
}
