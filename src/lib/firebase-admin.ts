import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';
import { NextRequest } from 'next/server';

let app: App | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

function getFirebaseAdmin(): { app: App | null; db: Firestore | null; auth: Auth | null } {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // If no credentials, return null (build-time safety)
  if (!serviceAccountKey) {
    return { app: null, db: null, auth: null };
  }

  if (!getApps().length) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);

      // Fix private key newlines - Railway may escape them as literal \n
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      return { app: null, db: null, auth: null };
    }
  } else {
    app = getApps()[0];
  }

  if (app && !db) {
    db = getFirestore(app);
  }

  if (app && !auth) {
    auth = getAuth(app);
  }

  return { app, db, auth };
}

// Lazy initialization - don't initialize at module load time
export function getAdminDb(): Firestore {
  const { db } = getFirebaseAdmin();
  if (!db) {
    throw new Error('Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  }
  return db;
}

// For backwards compatibility, but only use in API routes, not at module level
export const adminDb = {
  collection: (...args: Parameters<Firestore['collection']>) => getAdminDb().collection(...args),
  doc: (...args: Parameters<Firestore['doc']>) => getAdminDb().doc(...args),
};

// Get Admin Auth instance
export function getAdminAuth(): Auth {
  const { auth } = getFirebaseAdmin();
  if (!auth) {
    throw new Error('Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  }
  return auth;
}

// Authentication result type
export interface AuthResult {
  authenticated: boolean;
  user?: DecodedIdToken;
  error?: string;
}

// Verify Firebase ID token from request
export async function verifyAuth(req: NextRequest): Promise<AuthResult> {
  try {
    // Check if Firebase Admin is configured
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
      return { authenticated: false, error: 'Server authentication not configured' };
    }

    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Missing or invalid authorization header' };
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return { authenticated: false, error: 'No token provided' };
    }

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    return { authenticated: true, user: decodedToken };
  } catch (error: unknown) {
    console.error('Auth verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Firebase ID token has expired')) {
      return { authenticated: false, error: 'Token expired. Please refresh the page.' };
    }
    return { authenticated: false, error: 'Invalid or expired token' };
  }
}

// Verify user is a member of the specified firm
export async function verifyFirmMembership(userId: string, firmId: string): Promise<boolean> {
  try {
    const db = getAdminDb();

    // Check if user's firmId matches
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data();
    if (userData?.firmId !== firmId) {
      return false;
    }

    // Also verify membership record exists
    const memberDoc = await db.collection('firms').doc(firmId).collection('members').doc(userId).get();
    return memberDoc.exists;
  } catch (error) {
    console.error('Firm membership verification error:', error);
    return false;
  }
}

// Verify user is the owner of the firm
export async function verifyFirmOwner(userId: string, firmId: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    const firmDoc = await db.collection('firms').doc(firmId).get();

    if (!firmDoc.exists) {
      return false;
    }

    const firmData = firmDoc.data();
    return firmData?.ownerId === userId;
  } catch (error) {
    console.error('Firm owner verification error:', error);
    return false;
  }
}
