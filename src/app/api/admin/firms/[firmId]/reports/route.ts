import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getAdminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(authResult.user.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { firmId } = await params;
    const db = getAdminDb();

    const firmDoc = await db.collection('firms').doc(firmId).get();
    if (!firmDoc.exists) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
    }
    const firmData = firmDoc.data();

    // Get members (for owner email + count)
    const membersSnapshot = await db
      .collection('firms')
      .doc(firmId)
      .collection('members')
      .get();

    let ownerEmail = 'Unknown';
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      if (memberData.role === 'owner') {
        ownerEmail = memberData.email;
        break;
      }
    }

    // Get subscription
    const subscriptionDoc = await db.collection('subscriptions').doc(firmId).get();
    const subscriptionData = subscriptionDoc.exists ? subscriptionDoc.data() : null;

    // Get all reports — metadata only
    const reportsSnapshot = await db
      .collection('firms')
      .doc(firmId)
      .collection('reports')
      .get();

    const reports = reportsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const metadata = data.metadata || {};
      return {
        id: doc.id,
        title: metadata.title || 'Untitled',
        propertyAddress: metadata.propertyAddress || '',
        status: metadata.status || 'active',
        createdAt: metadata.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: metadata.updatedAt?.toDate?.()?.toISOString() || null,
        completionPercentage: metadata.completionPercentage || 0,
        createdBy: metadata.createdBy || '',
      };
    });

    // Sort by updatedAt desc
    reports.sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return NextResponse.json({
      firm: {
        id: firmId,
        name: firmData?.name || 'Unnamed Firm',
        createdAt: firmData?.createdAt?.toDate?.()?.toISOString() || null,
        ownerEmail,
        membersCount: membersSnapshot.size,
        reportsCount: reportsSnapshot.size,
        trialReportsUsed: firmData?.trialReportsUsed || 0,
        subscription: subscriptionData
          ? {
              plan: subscriptionData.plan,
              status: subscriptionData.status,
              currentPeriodEnd: subscriptionData.currentPeriodEnd?.toDate?.()?.toISOString(),
              seats: subscriptionData.seats,
            }
          : null,
      },
      reports,
    });
  } catch (error) {
    console.error('Admin firm reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
