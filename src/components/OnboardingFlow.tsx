'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirm } from '@/contexts/FirmContext';

export default function OnboardingFlow() {
  const { user, logout } = useAuth();
  const { pendingInvites, createNewFirm, acceptFirmInvite, loading, error } = useFirm();
  const [step, setStep] = useState<'choice' | 'create' | 'invites'>('choice');
  const [firmName, setFirmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmName.trim()) {
      setLocalError('Please enter a firm name');
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    try {
      await createNewFirm(firmName.trim());
    } catch (err) {
      setLocalError('Failed to create firm. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string, firmId: string) => {
    setIsSubmitting(true);
    setLocalError(null);

    try {
      await acceptFirmInvite(inviteId, firmId);
    } catch (err) {
      setLocalError('Failed to accept invite. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to ValuQuick</h1>
          <p className="text-gray-400">
            Hi {user?.displayName || 'there'}! Let&apos;s get you set up.
          </p>
        </div>

        {/* Error Display */}
        {(error || localError) && (
          <div className="mb-6 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error || localError}
          </div>
        )}

        {/* Choice Step */}
        {step === 'choice' && (
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">
              How would you like to get started?
            </h2>

            <div className="space-y-4">
              <button
                onClick={() => setStep('create')}
                className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Create a new firm</h3>
                    <p className="text-gray-400 text-sm">Start fresh with your own organization</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStep('invites')}
                disabled={pendingInvites.length === 0}
                className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center relative">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {pendingInvites.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                        {pendingInvites.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Join an existing firm</h3>
                    <p className="text-gray-400 text-sm">
                      {pendingInvites.length > 0
                        ? `You have ${pendingInvites.length} pending invite${pendingInvites.length > 1 ? 's' : ''}`
                        : 'No pending invites found'}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700 text-center">
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Sign out and use a different account
              </button>
            </div>
          </div>
        )}

        {/* Create Firm Step */}
        {step === 'create' && (
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <button
              onClick={() => setStep('choice')}
              className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-xl font-semibold text-white mb-2">Create your firm</h2>
            <p className="text-gray-400 text-sm mb-6">
              This will be the name of your organization. You can invite team members after setup.
            </p>

            <form onSubmit={handleCreateFirm}>
              <div className="mb-6">
                <label htmlFor="firmName" className="block text-sm font-medium text-gray-300 mb-2">
                  Firm Name
                </label>
                <input
                  type="text"
                  id="firmName"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="e.g., ABC Valuers & Associates"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !firmName.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Firm'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Invites Step */}
        {step === 'invites' && (
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <button
              onClick={() => setStep('choice')}
              className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-xl font-semibold text-white mb-2">Pending Invitations</h2>
            <p className="text-gray-400 text-sm mb-6">
              Accept an invitation to join an existing firm.
            </p>

            <div className="space-y-4">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 bg-gray-700 rounded-xl border border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{invite.firmName}</h3>
                      <p className="text-gray-400 text-sm">
                        Role: <span className="capitalize">{invite.role}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptInvite(invite.id, invite.firmId)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Joining...' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}

              {pendingInvites.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No pending invitations found.</p>
                  <p className="text-sm mt-2">
                    Ask your firm administrator to send you an invite.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
