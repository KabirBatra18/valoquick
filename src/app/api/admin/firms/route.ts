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

    // Get all firms
    const firmsSnapshot = await db.collection('firms').get();

    const firms = await Promise.all(
      firmsSnapshot.docs.map(async (firmDoc) => {
        const firmData = firmDoc.data();
        const firmId = firmDoc.id;

        // Get members count
        const membersSnapshot = await db
          .collection('firms')
          .doc(firmId)
          .collection('members')
          .get();

        // Get reports count
        const reportsSnapshot = await db
          .collection('firms')
          .doc(firmId)
          .collection('reports')
          .get();

        // Get subscription status
        const subscriptionDoc = await db
          .collection('subscriptions')
          .doc(firmId)
          .get();

        const subscriptionData = subscriptionDoc.exists
          ? subscriptionDoc.data()
          : null;

        // Find owner
        let ownerEmail = 'Unknown';
        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          if (memberData.role === 'owner') {
            ownerEmail = memberData.email;
            break;
          }
        }

        return {
          id: firmId,
          name: firmData.name || 'Unnamed Firm',
          createdAt: firmData.createdAt?.toDate?.()?.toISOString() || null,
          ownerEmail,
          membersCount: membersSnapshot.size,
          reportsCount: reportsSnapshot.size,
          trialReportsUsed: firmData.trialReportsUsed || 0,
          subscription: subscriptionData
            ? {
                plan: subscriptionData.plan,
                status: subscriptionData.status,
                currentPeriodEnd: subscriptionData.currentPeriodEnd?.toDate?.()?.toISOString(),
                seats: subscriptionData.seats,
              }
            : null,
        };
      })
    );

    // Sort by created date (newest first)
    firms.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ firms });
  } catch (error) {
    console.error('Admin firms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { firmId } = await request.json();
    if (!firmId) {
      return NextResponse.json({ error: 'Firm ID required' }, { status: 400 });
    }

    const db = getAdminDb();

    // Delete all subcollections first
    const subcollections = ['members', 'reports', 'invites'];
    for (const subcollection of subcollections) {
      const snapshot = await db
        .collection('firms')
        .doc(firmId)
        .collection(subcollection)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Delete subscription if exists
    const subscriptionRef = db.collection('subscriptions').doc(firmId);
    await subscriptionRef.delete();

    // Delete the firm document
    await db.collection('firms').doc(firmId).delete();

    // Update users who were in this firm
    const usersSnapshot = await db
      .collection('users')
      .where('firmId', '==', firmId)
      .get();

    const userBatch = db.batch();
    usersSnapshot.docs.forEach((userDoc) => {
      userBatch.update(userDoc.ref, {
        firmId: null,
        accessRevoked: true,
        accessRevokedAt: new Date(),
      });
    });
    await userBatch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete firm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
