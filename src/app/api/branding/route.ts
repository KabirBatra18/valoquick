import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyFirmAdmin, verifySession, getAdminDb } from '@/lib/firebase-admin';
import { FirmBranding } from '@/types/branding';
import { FieldValue } from 'firebase-admin/firestore';

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.user.uid;

    // Session check
    const sessionId = request.headers.get('x-session-id');
    const sessionResult = await verifySession(userId, sessionId);
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error || 'Session expired' },
        { status: 401 }
      );
    }

    const { firmId, branding } = (await request.json()) as {
      firmId: string;
      branding: Partial<FirmBranding>;
    };

    if (!firmId || !branding) {
      return NextResponse.json(
        { error: 'Missing firmId or branding data' },
        { status: 400 }
      );
    }

    // Verify user is owner or admin
    const isAdmin = await verifyFirmAdmin(userId, firmId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only owners and admins can update branding' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const firmRef = db.collection('firms').doc(firmId);

    // Get existing branding to merge
    const firmDoc = await firmRef.get();
    if (!firmDoc.exists) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
    }

    const existingBranding = firmDoc.data()?.branding || {};

    // Deep merge header and footer configs
    const mergedBranding = {
      ...existingBranding,
      ...branding,
      header: {
        ...(existingBranding.header || {}),
        ...(branding.header || {}),
      },
      footer: {
        ...(existingBranding.footer || {}),
        ...(branding.footer || {}),
      },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: userId,
    };

    await firmRef.update({ branding: mergedBranding });

    return NextResponse.json({ success: true, branding: mergedBranding });
  } catch (error) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update branding' },
      { status: 500 }
    );
  }
}
