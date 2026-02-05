import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserDocument } from '@/types/firebase';

const googleProvider = new GoogleAuthProvider();

// Session management for single-device restriction
const SESSION_KEY = 'valuquick_session_id';

function generateSessionId(): string {
  // Use cryptographically secure random ID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function getLocalSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

function setLocalSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearLocalSessionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Generate a new session ID for single-device restriction
    const sessionId = generateSessionId();
    setLocalSessionId(sessionId);

    // Create or update user document
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // New user - create document with no firm
      await setDoc(userRef, {
        email: user.email || '', // Handle null email edge case
        displayName: user.displayName || 'User',
        firmId: null,
        currentSessionId: sessionId,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      // Existing user - update last login and session ID
      // This will invalidate any other active sessions
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        currentSessionId: sessionId,
      }, { merge: true });
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
  clearLocalSessionId();
  await firebaseSignOut(auth);
}

// Check if current session is valid (matches the one in Firestore)
export async function isSessionValid(userId: string): Promise<boolean> {
  const localSessionId = getLocalSessionId();
  if (!localSessionId) return false;

  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return false;

  const userData = userSnap.data();
  return userData.currentSessionId === localSessionId;
}

// Subscribe to session changes to detect when logged out from another device
export function subscribeToSessionChanges(
  userId: string,
  onSessionInvalid: () => void
): () => void {
  const userRef = doc(db, 'users', userId);

  return onSnapshot(userRef, (snapshot) => {
    if (!snapshot.exists()) {
      onSessionInvalid();
      return;
    }

    const userData = snapshot.data();
    const localSessionId = getLocalSessionId();

    // If session IDs don't match, this device has been logged out
    if (localSessionId && userData.currentSessionId !== localSessionId) {
      onSessionInvalid();
    }
  });
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

export async function clearUserFirmId(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    firmId: null,
    accessRevoked: true,
    accessRevokedAt: serverTimestamp(),
  }, { merge: true });
}

export async function clearAccessRevokedFlag(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { accessRevoked: false }, { merge: true });
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
