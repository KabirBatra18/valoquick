'use client';

import { useState, useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFirm } from '@/contexts/FirmContext';
import { SEAT_PRICING } from '@/types/subscription';
import { authenticatedFetch } from '@/lib/api-client';

interface ReduceSeatsModalProps {
  onClose: () => void;
}

export default function ReduceSeatsModal({ onClose }: ReduceSeatsModalProps) {
  const { subscription, seatInfo, refreshSubscription, refreshSeatInfo } = useSubscription();
  const { firm, members } = useFirm();
  const [newPurchasedSeats, setNewPurchasedSeats] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const plan = subscription?.plan || 'monthly';
  const seatPrice = SEAT_PRICING[plan];
  const currentPurchased = subscription?.seats?.purchased || 0;
  const pendingReduction = seatInfo?.pendingReduction;
  const memberCount = members.length;

  // Minimum seats = members - 1 (since 1 is included in base)
  const minPurchasedSeats = Math.max(0, memberCount - 1);

  useEffect(() => {
    // Initialize with pending reduction or current purchased
    setNewPurchasedSeats(pendingReduction ?? currentPurchased);
  }, [pendingReduction, currentPurchased]);

  const handleSubmit = async () => {
    if (!firm?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/seats/reduce', {
        method: 'POST',
        body: JSON.stringify({
          firmId: firm.id,
          newSeatCount: newPurchasedSeats,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to schedule seat reduction');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      await refreshSubscription();
      await refreshSeatInfo();

      // Close after showing success briefly
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCancelReduction = async () => {
    if (!firm?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Setting to current purchased cancels the pending reduction
      const response = await authenticatedFetch('/api/seats/reduce', {
        method: 'POST',
        body: JSON.stringify({
          firmId: firm.id,
          newSeatCount: currentPurchased,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to cancel reduction');
        setIsSubmitting(false);
        return;
      }

      await refreshSubscription();
      await refreshSeatInfo();
      onClose();
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const newTotalSeats = 1 + newPurchasedSeats;
  const currentTotalSeats = 1 + currentPurchased;
  const savingsPerPeriod = (currentPurchased - newPurchasedSeats) * seatPrice.amount;
  const periodLabel = plan === 'yearly' ? 'year' : plan === 'halfyearly' ? '6 months' : 'month';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-primary rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">
            {pendingReduction !== undefined ? 'Manage Seat Reduction' : 'Reduce Seats'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-text-primary font-medium">Seat reduction scheduled!</p>
            <p className="text-sm text-text-secondary mt-1">
              Changes will take effect at your next renewal.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Current Status */}
            <div className="mb-6 p-4 bg-surface-secondary rounded-xl">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Current seats</span>
                <span className="text-text-primary font-medium">{currentTotalSeats} seats</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Team members</span>
                <span className="text-text-primary font-medium">{memberCount} members</span>
              </div>
            </div>

            {/* Pending Reduction Warning */}
            {pendingReduction !== undefined && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-500">
                  You have a pending reduction to {1 + pendingReduction} seats.
                </p>
                <button
                  onClick={handleCancelReduction}
                  disabled={isSubmitting}
                  className="mt-2 text-sm text-yellow-500 underline hover:no-underline"
                >
                  Cancel pending reduction
                </button>
              </div>
            )}

            {/* Seat Selector */}
            <div className="mb-6">
              <label className="block text-sm text-text-secondary mb-2">
                Reduce to how many additional seats?
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setNewPurchasedSeats(Math.max(minPurchasedSeats, newPurchasedSeats - 1))}
                  disabled={newPurchasedSeats <= minPurchasedSeats}
                  className="w-12 h-12 rounded-lg bg-surface-secondary text-text-primary text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-tertiary transition-colors"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-bold text-text-primary">{newTotalSeats}</span>
                  <p className="text-sm text-text-tertiary">total seats</p>
                  <p className="text-xs text-text-tertiary">(1 included + {newPurchasedSeats} additional)</p>
                </div>
                <button
                  onClick={() => setNewPurchasedSeats(Math.min(currentPurchased - 1, newPurchasedSeats + 1))}
                  disabled={newPurchasedSeats >= currentPurchased - 1}
                  className="w-12 h-12 rounded-lg bg-surface-secondary text-text-primary text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-tertiary transition-colors"
                >
                  +
                </button>
              </div>
              {minPurchasedSeats > 0 && newPurchasedSeats === minPurchasedSeats && (
                <p className="text-xs text-text-tertiary mt-2 text-center">
                  Minimum {newTotalSeats} seats required for {memberCount} members
                </p>
              )}
            </div>

            {/* Savings */}
            {savingsPerPeriod > 0 && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-sm text-green-500 text-center">
                  You&apos;ll save{' '}
                  <span className="font-bold">
                    ₹{(savingsPerPeriod / 100).toLocaleString('en-IN')}/{periodLabel}
                  </span>
                </p>
              </div>
            )}

            {/* Info */}
            <p className="text-xs text-text-tertiary mb-6 text-center">
              Seat reduction will take effect at your next renewal date.
              You&apos;ll keep your current seats until then.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 btn btn-secondary py-3 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || newPurchasedSeats >= currentPurchased}
                className="flex-1 btn btn-primary py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Schedule Reduction'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
