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

    // Get all IP trials
    const ipTrialsSnapshot = await db.collection('ipTrials').get();

    const ipTrials = ipTrialsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ipPrefix: data.ipPrefix || doc.id,
        linkedFirmIds: data.linkedFirmIds || [],
        linkedDeviceIds: data.linkedDeviceIds || [],
        linkedUserIds: data.linkedUserIds || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        isWhitelisted: data.isWhitelisted || false,
      };
    });

    // Get all device trials
    const trialsSnapshot = await db.collection('trials').get();

    const deviceTrials = trialsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        deviceFingerprint: data.deviceFingerprint || doc.id,
        reportsGenerated: data.reportsGenerated || 0,
        linkedGoogleIds: data.linkedGoogleIds || [],
        firmActivated: data.firmActivated || null,
        ipPrefix: data.ipPrefix || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() || null,
        isWhitelisted: data.isWhitelisted || false,
      };
    });

    // Sort by most linked items (potential abuse)
    ipTrials.sort((a, b) => b.linkedFirmIds.length - a.linkedFirmIds.length);
    deviceTrials.sort((a, b) => b.linkedGoogleIds.length - a.linkedGoogleIds.length);

    return NextResponse.json({
      ipTrials,
      deviceTrials,
    });
  } catch (error) {
    console.error('Admin abuse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Whitelist an IP or device
export async function POST(request: NextRequest) {
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

    const { type, id, action } = await request.json();

    if (!type || !id || !action) {
      return NextResponse.json(
        { error: 'Type, ID, and action required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    if (type === 'ip') {
      const ipRef = db.collection('ipTrials').doc(id);
      if (action === 'whitelist') {
        await ipRef.update({ isWhitelisted: true });
      } else if (action === 'remove') {
        await ipRef.delete();
      } else if (action === 'reset') {
        // Reset the IP trial - remove all linked firms except the first one
        const ipDoc = await ipRef.get();
        const ipData = ipDoc.data();
        if (ipData && ipData.linkedFirmIds && ipData.linkedFirmIds.length > 1) {
          await ipRef.update({
            linkedFirmIds: [ipData.linkedFirmIds[0]],
          });
        }
      }
    } else if (type === 'device') {
      const deviceRef = db.collection('trials').doc(id);
      if (action === 'whitelist') {
        await deviceRef.update({ isWhitelisted: true });
      } else if (action === 'remove') {
        await deviceRef.delete();
      } else if (action === 'reset') {
        // Reset trial count
        await deviceRef.update({
          reportsGenerated: 0,
          linkedGoogleIds: [],
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin whitelist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
