import { getAdminDb } from './firebase-admin';

const ADMIN_EMAIL = 'kabirbatra220@gmail.com';

/**
 * Verify if a user is an admin by checking their email
 */
export async function verifyAdmin(userId: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    return userData?.email === ADMIN_EMAIL;
  } catch (error) {
    console.error('Error verifying admin:', error);
    return false;
  }
}

/**
 * Check if an email is the admin email (client-side check)
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

export { ADMIN_EMAIL };
