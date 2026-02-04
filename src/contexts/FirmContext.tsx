'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Firm, FirmMember, FirmInvite } from '@/types/firebase';
import {
  getFirm,
  getFirmMembers,
  getFirmInvites,
  getPendingInvitesForUser,
  createFirm,
  acceptInvite,
  createInvite,
  deleteInvite,
  removeMember,
  updateMemberRole,
} from '@/lib/firestore';

interface FirmContextType {
  firm: Firm | null;
  members: FirmMember[];
  firmInvites: FirmInvite[]; // Invites sent by this firm
  pendingInvites: FirmInvite[]; // Invites received by current user
  loading: boolean;
  error: string | null;
  createNewFirm: (name: string) => Promise<void>;
  acceptFirmInvite: (inviteId: string, firmId: string) => Promise<void>;
  inviteMember: (email: string, role: 'admin' | 'member') => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  removeFirmMember: (userId: string) => Promise<void>;
  updateFirmMemberRole: (userId: string, role: 'admin' | 'member') => Promise<void>;
  refreshFirm: () => Promise<void>;
  refreshInvites: () => Promise<void>;
  isOwner: boolean;
}

const FirmContext = createContext<FirmContextType | undefined>(undefined);

export function FirmProvider({ children }: { children: ReactNode }) {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [firmInvites, setFirmInvites] = useState<FirmInvite[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FirmInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is the owner
  const isOwner = members.some(m => m.userId === user?.uid && m.role === 'owner');

  const refreshFirm = async () => {
    if (userDoc?.firmId) {
      try {
        const firmData = await getFirm(userDoc.firmId);
        setFirm(firmData);
        if (firmData) {
          const membersData = await getFirmMembers(userDoc.firmId);
          setMembers(membersData);
          const firmInvitesData = await getFirmInvites(userDoc.firmId);
          setFirmInvites(firmInvitesData);
        }
      } catch (err) {
        console.error('Error fetching firm:', err);
        setError('Failed to load firm data');
      }
    } else {
      setFirm(null);
      setMembers([]);
      setFirmInvites([]);
    }
  };

  const refreshInvites = async () => {
    if (user?.email) {
      try {
        const invites = await getPendingInvitesForUser(user.email);
        setPendingInvites(invites);
      } catch (err) {
        console.error('Error fetching invites:', err);
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await refreshFirm();
      await refreshInvites();
      setLoading(false);
    };

    if (user) {
      loadData();
    } else {
      setFirm(null);
      setMembers([]);
      setFirmInvites([]);
      setPendingInvites([]);
      setLoading(false);
    }
  }, [user, userDoc?.firmId]);

  const createNewFirm = async (name: string) => {
    if (!user) throw new Error('Must be signed in to create a firm');

    setError(null);
    try {
      await createFirm(name, user.uid, user.email || '', user.displayName || '');
      await refreshUserDoc();
      await refreshFirm();
    } catch (err) {
      console.error('Error creating firm:', err);
      setError('Failed to create firm. Please try again.');
      throw err;
    }
  };

  const acceptFirmInvite = async (inviteId: string, firmId: string) => {
    if (!user) throw new Error('Must be signed in to accept invite');

    setError(null);
    try {
      await acceptInvite(inviteId, firmId, user.uid, user.email || '', user.displayName || '');
      await refreshUserDoc();
      await refreshFirm();
      await refreshInvites();
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError('Failed to accept invite. Please try again.');
      throw err;
    }
  };

  const inviteMember = async (email: string, role: 'admin' | 'member') => {
    if (!user || !firm) throw new Error('Must be signed in with a firm to invite');

    setError(null);
    try {
      await createInvite(firm.id, firm.name, email, role, user.uid);
      await refreshFirm();
    } catch (err: unknown) {
      console.error('Error inviting member:', err);
      if (err instanceof Error && 'code' in err && err.code === 'SEAT_LIMIT_REACHED') {
        setError('Seat limit reached. Please purchase more seats to invite new members.');
      } else {
        setError('Failed to send invite. Please try again.');
      }
      throw err;
    }
  };

  const cancelInvite = async (inviteId: string) => {
    if (!firm) throw new Error('No firm found');

    setError(null);
    try {
      await deleteInvite(firm.id, inviteId);
      await refreshFirm();
    } catch (err) {
      console.error('Error canceling invite:', err);
      setError('Failed to cancel invite. Please try again.');
      throw err;
    }
  };

  const removeFirmMember = async (userId: string) => {
    if (!firm) throw new Error('No firm found');

    setError(null);
    try {
      await removeMember(firm.id, userId);
      await refreshFirm();
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member. Please try again.');
      throw err;
    }
  };

  const updateFirmMemberRole = async (userId: string, role: 'admin' | 'member') => {
    if (!firm) throw new Error('No firm found');

    setError(null);
    try {
      await updateMemberRole(firm.id, userId, role);
      await refreshFirm();
    } catch (err) {
      console.error('Error updating member role:', err);
      setError('Failed to update member role. Please try again.');
      throw err;
    }
  };

  return (
    <FirmContext.Provider
      value={{
        firm,
        members,
        firmInvites,
        pendingInvites,
        loading,
        error,
        createNewFirm,
        acceptFirmInvite,
        inviteMember,
        cancelInvite,
        removeFirmMember,
        updateFirmMemberRole,
        refreshFirm,
        refreshInvites,
        isOwner,
      }}
    >
      {children}
    </FirmContext.Provider>
  );
}

export function useFirm() {
  const context = useContext(FirmContext);
  if (context === undefined) {
    throw new Error('useFirm must be used within a FirmProvider');
  }
  return context;
}
