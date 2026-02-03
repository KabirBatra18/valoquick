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
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Create or update user document
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user - create document with no firm
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      firmId: null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    // Existing user - update last login
    await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
  }

  return user;
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
