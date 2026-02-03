import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserDocument } from '@/types/firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create or update user document
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // New user - create document with no firm
      await setDoc(userRef, {
        email: user.email || '', // Handle null email edge case
        displayName: user.displayName || 'User',
        firmId: null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      // Existing user - update last login
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }

    return user;
  } catch (error: unknown) {
    // Handle specific error types
    const firebaseError = error as { code?: string; message?: string };

    if (firebaseError.code === 'auth/popup-blocked') {
      throw new Error('POPUP_BLOCKED: Please allow popups for this site and try again.');
    }
    if (firebaseError.code === 'auth/popup-closed-by-user') {
      throw new Error('POPUP_CLOSED: Sign-in was cancelled.');
    }
    if (firebaseError.code === 'auth/network-request-failed') {
      throw new Error('NETWORK_ERROR: Please check your internet connection.');
    }

    // Re-throw with more context
    throw new Error(`SIGN_IN_FAILED: ${firebaseError.message || 'Unknown error occurred'}`);
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getUserDocument(userId: string): Promise<UserDocument | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserDocument;
  }
  return null;
}

export async function updateUserFirmId(userId: string, firmId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { firmId }, { merge: true });
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
