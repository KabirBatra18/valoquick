'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Firm, FirmMember, FirmInvite } from '@/types/firebase';
import {
  getFirm,
  getFirmMembers,
  getPendingInvitesForUser,
  createFirm,
  acceptInvite,
} from '@/lib/firestore';

interface FirmContextType {
  firm: Firm | null;
  members: FirmMember[];
  pendingInvites: FirmInvite[];
  loading: boolean;
  error: string | null;
  createNewFirm: (name: string) => Promise<void>;
  acceptFirmInvite: (inviteId: string, firmId: string) => Promise<void>;
  refreshFirm: () => Promise<void>;
  refreshInvites: () => Promise<void>;
}

const FirmContext = createContext<FirmContextType | undefined>(undefined);

export function FirmProvider({ children }: { children: ReactNode }) {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FirmInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFirm = async () => {
    if (userDoc?.firmId) {
      try {
        const firmData = await getFirm(userDoc.firmId);
        setFirm(firmData);
        if (firmData) {
          const membersData = await getFirmMembers(userDoc.firmId);
          setMembers(membersData);
        }
      } catch (err) {
        console.error('Error fetching firm:', err);
        setError('Failed to load firm data');
      }
    } else {
      setFirm(null);
      setMembers([]);
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

  return (
    <FirmContext.Provider
      value={{
        firm,
        members,
        pendingInvites,
        loading,
        error,
        createNewFirm,
        acceptFirmInvite,
        refreshFirm,
        refreshInvites,
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
