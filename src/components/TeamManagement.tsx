'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirm } from '@/contexts/FirmContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import AddSeatsModal from './AddSeatsModal';

interface TeamManagementProps {
  onClose: () => void;
}

export default function TeamManagement({ onClose }: TeamManagementProps) {
  const { user } = useAuth();
  const {
    firm,
    members,
    firmInvites,
    isOwner,
    inviteMember,
    cancelInvite,
    removeFirmMember,
    updateFirmMemberRole,
    error: firmError,
  } = useFirm();
  const { subscription, seatInfo, isSubscribed } = useSubscription();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [showAddSeats, setShowAddSeats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const totalSeats = seatInfo?.total || 1;
  const usedSeats = seatInfo?.used || members.length;
  const availableSeats = seatInfo?.available || 0;
  const usagePercent = totalSeats > 0 ? Math.min(100, (usedSeats / totalSeats) * 100) : 0;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    // Check seat availability
    if (availableSeats <= 0) {
      setError('No seats available. Please purchase more seats to invite new members.');
      return;
    }

    setIsInviting(true);
    setError(null);
    setSuccess(null);

    try {
      await inviteMember(inviteEmail.trim().toLowerCase(), inviteRole);
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'SEAT_LIMIT_REACHED') {
        setError('Seat limit reached. Please purchase more seats.');
      } else {
        setError('Failed to send invitation. Please try again.');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingId(userId);
    setError(null);
    try {
      await removeFirmMember(userId);
      setSuccess('Member removed successfully');
    } catch {
      setError('Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setCancelingId(inviteId);
    setError(null);
    try {
      await cancelInvite(inviteId);
      setSuccess('Invitation cancelled');
    } catch {
      setError('Failed to cancel invitation');
    } finally {
      setCancelingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    setError(null);
    try {
      await updateFirmMemberRole(userId, newRole);
      setSuccess('Role updated successfully');
    } catch {
      setError('Failed to update role');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-surface-100 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Team Management</h2>
            <p className="text-sm text-text-tertiary mt-1">{firm?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error/Success Messages */}
          {(error || firmError) && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error || firmError}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Seat Usage */}
          <div className="p-4 bg-surface-200/50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary">Team Seats</span>
              {isSubscribed ? (
                <span className="text-sm text-text-tertiary">
                  {usedSeats} / {totalSeats} seats used
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-full font-medium">
                  Trial
                </span>
              )}
            </div>
            {isSubscribed ? (
              <>
                <div className="h-2 bg-surface-300 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowAddSeats(true)}
                    className="text-sm text-brand hover:text-brand-light transition-colors"
                  >
                    + Add more seats
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-text-tertiary">
                Subscribe to add team members. Each plan includes 1 seat, with option to add more.
              </p>
            )}
          </div>

          {/* Role Info (13.2) */}
          <div className="p-3 bg-surface-200/30 rounded-xl text-xs text-text-tertiary flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong className="text-text-secondary">Members</strong> can create and edit reports.{' '}
              <strong className="text-text-secondary">Admins</strong> can also manage team and branding settings.
            </span>
          </div>

          {/* Invite Form - For owners */}
          {isOwner && (
            <div className="p-4 bg-surface-200/50 rounded-xl">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Invite Team Member</h3>
              {isSubscribed ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-surface-100 border border-surface-300 rounded-xl text-text-primary text-sm outline-none focus:border-brand"
                      required
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                      className="px-4 py-2.5 bg-surface-100 border border-surface-300 rounded-xl text-text-primary text-sm outline-none focus:border-brand"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-tertiary">
                      {availableSeats > 0
                        ? `${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available`
                        : 'No seats available - purchase more to invite'
                      }
                    </p>
                    <div className="flex items-center gap-2">
                      {firm?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/join?firm=${firm.id}`;
                            navigator.clipboard.writeText(link);
                            setSuccess('Invite link copied!');
                            setTimeout(() => setSuccess(null), 2000);
                          }}
                          className="text-xs text-brand hover:text-brand-light transition-colors"
                        >
                          Copy invite link
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isInviting || availableSeats <= 0}
                        className="btn btn-primary text-sm disabled:opacity-50"
                      >
                        {isInviting ? 'Sending...' : 'Send Invite'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-text-secondary mb-3">
                    Subscribe to a plan to invite team members
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Each plan includes 1 seat. You can purchase additional seats after subscribing.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Current Members */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Team Members ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-4 bg-surface-200/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center">
                      <span className="text-sm font-semibold text-brand">
                        {member.displayName?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {member.displayName || member.email}
                        {member.userId === user?.uid && (
                          <span className="ml-2 text-xs text-text-tertiary">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-text-tertiary">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.role === 'owner' ? (
                      <span className="px-3 py-1 bg-brand/20 text-brand text-xs font-medium rounded-full">
                        Owner
                      </span>
                    ) : isOwner ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value as 'admin' | 'member')}
                          className="px-3 py-1.5 bg-surface-100 border border-surface-300 rounded-lg text-text-primary text-xs outline-none"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removingId === member.userId}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingId === member.userId ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-surface-300 text-text-secondary text-xs font-medium rounded-full capitalize">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invites */}
          {firmInvites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                Pending Invites ({firmInvites.length})
              </h3>
              <div className="space-y-2">
                {firmInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 bg-surface-200/30 rounded-xl border border-dashed border-surface-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-300 flex items-center justify-center">
                        <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary">{invite.email}</p>
                        <p className="text-xs text-text-tertiary">
                          Invited as {invite.role} - Pending
                        </p>
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        disabled={cancelingId === invite.id}
                        className="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {cancelingId === invite.id ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                Pending invites count toward your seat limit
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-200">
          <button
            onClick={onClose}
            className="w-full btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>

      {/* Add Seats Modal */}
      {showAddSeats && <AddSeatsModal onClose={() => setShowAddSeats(false)} />}
    </div>
  );
}
