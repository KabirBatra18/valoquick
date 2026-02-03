'use client';

import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFirm } from '@/contexts/FirmContext';
import { SEAT_PRICING } from '@/types/subscription';
import AddSeatsModal from './AddSeatsModal';
import ReduceSeatsModal from './ReduceSeatsModal';

export default function SeatManagement() {
  const { subscription, seatInfo, isSubscribed } = useSubscription();
  const { firm, members, pendingInvites } = useFirm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReduceModal, setShowReduceModal] = useState(false);

  // Don't show if no firm or not subscribed
  if (!firm || !isSubscribed || !subscription) {
    return null;
  }

  const totalSeats = seatInfo?.total || 1;
  const usedSeats = seatInfo?.used || members.length;
  const availableSeats = seatInfo?.available || 0;
  const pendingReduction = seatInfo?.pendingReduction;
  const purchasedSeats = subscription.seats?.purchased || 0;

  const plan = subscription.plan;
  const seatPrice = SEAT_PRICING[plan];

  // Calculate usage percentage for progress bar
  const usagePercent = totalSeats > 0 ? Math.min(100, (usedSeats / totalSeats) * 100) : 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Team Seats</h3>
        {purchasedSeats > 0 && availableSeats > 0 && (
          <button
            onClick={() => setShowReduceModal(true)}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Reduce seats
          </button>
        )}
      </div>

      {/* Usage Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-text-secondary">
            {usedSeats} of {totalSeats} seats used
          </span>
          <span className="text-text-tertiary">
            {availableSeats} available
          </span>
        </div>
        <div className="h-3 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Pending Reduction Warning */}
      {pendingReduction !== undefined && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-500">
            Seats will be reduced to {1 + pendingReduction} at next renewal.
            <button
              onClick={() => setShowReduceModal(true)}
              className="ml-2 underline hover:no-underline"
            >
              Cancel
            </button>
          </p>
        </div>
      )}

      {/* Billing Info */}
      <div className="mb-4 p-3 bg-surface-secondary rounded-lg">
        <div className="text-sm text-text-secondary">
          <div className="flex justify-between mb-1">
            <span>Base plan (1 seat included)</span>
            <span className="text-text-primary">{subscription.plan}</span>
          </div>
          {purchasedSeats > 0 && (
            <div className="flex justify-between">
              <span>Additional seats ({purchasedSeats})</span>
              <span className="text-text-primary">
                {purchasedSeats} x {seatPrice.displayAmount} =
                ₹{((purchasedSeats * seatPrice.amount) / 100).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Add Seats Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full btn btn-secondary py-3 rounded-lg font-medium"
      >
        + Add More Seats
      </button>

      {/* Team Members List */}
      {members.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            Team Members ({members.length})
          </h4>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between p-2 bg-surface-secondary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-accent-primary">
                      {member.displayName?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-text-primary">{member.displayName || member.email}</p>
                    <p className="text-xs text-text-tertiary">{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            Pending Invites ({pendingInvites.length})
          </h4>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-2 bg-surface-secondary rounded-lg opacity-70"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface-tertiary rounded-full flex items-center justify-center">
                    <span className="text-sm text-text-tertiary">?</span>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">{invite.email}</p>
                    <p className="text-xs text-text-tertiary">Pending - {invite.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Pending invites count toward your seat limit
          </p>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSeatsModal onClose={() => setShowAddModal(false)} />
      )}
      {showReduceModal && (
        <ReduceSeatsModal onClose={() => setShowReduceModal(false)} />
      )}
    </div>
  );
}
