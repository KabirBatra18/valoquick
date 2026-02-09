import { getAdminDb } from './firebase-admin';
import { ADMIN_EMAIL } from './admin-client';

export { isAdminEmail, ADMIN_EMAIL } from './admin-client';

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
