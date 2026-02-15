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
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
    return { app: null, db: null, auth: null };
  }

  if (!getApps().length) {
    try {
      console.log('Parsing service account key, length:', serviceAccountKey.length);
      const serviceAccount = JSON.parse(serviceAccountKey);
      console.log('Service account parsed, project_id:', serviceAccount.project_id);

      // Fix private key newlines - Railway may escape them as literal \n
      if (serviceAccount.private_key) {
        const originalLength = serviceAccount.private_key.length;
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        console.log('Private key processed, original length:', originalLength, 'new length:', serviceAccount.private_key.length);
      }

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
      console.log('Firebase Admin initialized successfully for project:', projectId);
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
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid auth header. Header:', authHeader?.substring(0, 20));
      return { authenticated: false, error: 'Missing or invalid authorization header' };
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      console.error('No token after Bearer split');
      return { authenticated: false, error: 'No token provided' };
    }

    console.log('Token length:', idToken.length, 'Token preview:', idToken.substring(0, 50) + '...');

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log('Token verified successfully for user:', decodedToken.uid);

    return { authenticated: true, user: decodedToken };
  } catch (error: unknown) {
    console.error('Auth verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Full error message:', errorMessage);

    if (errorMessage.includes('Firebase ID token has expired')) {
      return { authenticated: false, error: 'Token expired. Please refresh the page.' };
    }
    if (errorMessage.includes('Decoding Firebase ID token failed')) {
      return { authenticated: false, error: 'Invalid token format. Please sign out and sign in again.' };
    }
    if (errorMessage.includes('Firebase ID token has incorrect')) {
      return { authenticated: false, error: 'Token verification failed. Please sign out and sign in again.' };
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

    // Check member record for owner role (more reliable than firm doc)
    const memberDoc = await db.collection('firms').doc(firmId)
      .collection('members').doc(userId).get();

    if (!memberDoc.exists) {
      console.log('verifyFirmOwner: Member doc not found for user', userId, 'in firm', firmId);
      return false;
    }

    const memberData = memberDoc.data();
    const isOwner = memberData?.role === 'owner';
    console.log('verifyFirmOwner: User', userId, 'role is', memberData?.role, '- isOwner:', isOwner);
    return isOwner;
  } catch (error) {
    console.error('Firm owner verification error:', error);
    return false;
  }
}

// Verify user is an owner or admin of the firm
export async function verifyFirmAdmin(userId: string, firmId: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    const memberDoc = await db.collection('firms').doc(firmId)
      .collection('members').doc(userId).get();

    if (!memberDoc.exists) return false;
    const role = memberDoc.data()?.role;
    return role === 'owner' || role === 'admin';
  } catch (error) {
    console.error('Firm admin verification error:', error);
    return false;
  }
}

// Session validation result type
export interface SessionResult {
  valid: boolean;
  error?: string;
}

// Verify user's session is still valid (single-device enforcement)
// This checks if the session ID in the request matches the one stored in Firestore
export async function verifySession(userId: string, sessionId: string | null): Promise<SessionResult> {
  if (!sessionId) {
    return { valid: false, error: 'No session ID provided' };
  }

  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return { valid: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const storedSessionId = userData?.currentSessionId;

    if (!storedSessionId) {
      // No session stored — force re-login to establish a session
      return { valid: false, error: 'No active session. Please sign in again.' };
    }

    if (storedSessionId !== sessionId) {
      return { valid: false, error: 'Session expired - logged in on another device' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Session verification error:', error);
    // Fail closed — deny access when we can't verify
    return { valid: false, error: 'Session verification unavailable. Please try again.' };
  }
}
