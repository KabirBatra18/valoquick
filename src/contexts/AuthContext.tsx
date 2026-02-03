'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthState, signInWithGoogle, signOut, getUserDocument } from '@/lib/auth';
import { UserDocument } from '@/types/firebase';

interface AuthContextType {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUserDoc = async () => {
    if (user) {
      try {
        const doc = await getUserDocument(user.uid);
        setUserDoc(doc);
      } catch (err) {
        console.error('Error refreshing user document:', err);
        setError('Failed to refresh user data');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const doc = await getUserDocument(firebaseUser.uid);
          setUserDoc(doc);
        } catch (err) {
          console.error('Error fetching user document:', err);
          setError('Failed to load user data');
        }
      } else {
        setUserDoc(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in error:', err);

      // Parse error message for user-friendly display
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('POPUP_BLOCKED')) {
        setError('Popup was blocked. Please allow popups for this site and try again.');
      } else if (errorMessage.includes('POPUP_CLOSED')) {
        setError(null); // User cancelled, no need to show error
      } else if (errorMessage.includes('NETWORK_ERROR')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Failed to sign in. Please try again.');
      }

      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut();
      setUserDoc(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, error, signIn, logout, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
