import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getAdminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin access
    const isAdmin = await verifyAdmin(authResult.user.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();

    // Get all users
    const usersSnapshot = await db.collection('users').get();

    const users = await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Get user's role in their firm (if they have one)
        let role = null;
        let firmName = null;
        let hasSubscription = false;

        if (userData.firmId) {
          // Get firm name
          const firmDoc = await db.collection('firms').doc(userData.firmId).get();
          if (firmDoc.exists) {
            firmName = firmDoc.data()?.name || 'Unknown';
          }

          // Get user's role
          const memberDoc = await db
            .collection('firms')
            .doc(userData.firmId)
            .collection('members')
            .doc(userId)
            .get();

          if (memberDoc.exists) {
            role = memberDoc.data()?.role || 'member';
          }

          // Check subscription
          const subscriptionDoc = await db
            .collection('subscriptions')
            .doc(userData.firmId)
            .get();

          hasSubscription =
            subscriptionDoc.exists &&
            subscriptionDoc.data()?.status === 'active';
        }

        return {
          id: userId,
          email: userData.email || 'No email',
          displayName: userData.displayName || 'Unknown',
          firmId: userData.firmId || null,
          firmName,
          role,
          hasSubscription,
          trialReportsUsed: userData.trialReportsUsed || 0,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || null,
          lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || null,
          accessRevoked: userData.accessRevoked || false,
        };
      })
    );

    // Sort by last login (most recent first)
    users.sort((a, b) => {
      if (!a.lastLoginAt) return 1;
      if (!b.lastLoginAt) return -1;
      return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
