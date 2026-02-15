import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { notifyAbuseAlert, notifyNewFirm } from '@/lib/email';

const TRIAL_LIMIT = 5;

// Track sent abuse alerts to avoid spam (in-memory cache)
const sentAbuseAlerts = new Map<string, number>();
const ABUSE_ALERT_COOLDOWN = 3600000; // 1 hour

// Extract IP prefix (first 3 octets for IPv4)
function getIpPrefix(ip: string): string {
  // Handle IPv6 localhost
  if (ip === '::1' || ip === '127.0.0.1') {
    return 'localhost';
  }

  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
  }

  // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (ip.includes('::ffff:')) {
    const ipv4 = ip.split('::ffff:')[1];
    if (ipv4) {
      const parts = ipv4.split('.');
      if (parts.length >= 3) {
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
    }
  }

  // For IPv6, use first 48 bits (3 groups)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}`;
    }
  }

  return ip;
}

// Get client IP from request headers
function getClientIp(request: NextRequest): string {
  // Check various headers (in order of reliability)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (client's real IP)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback (may not work in all environments)
  return request.headers.get('x-client-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is authenticated
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deviceId, persistentDeviceId, firmId } = body;
    const userId = authResult.user.uid; // Use authenticated user's ID, not from body

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const ipPrefix = getIpPrefix(clientIp);

    // Check 1: Device already used for trial?
    const trialRef = adminDb.collection('trials').doc(deviceId);
    const trialSnap = await trialRef.get();

    if (trialSnap.exists) {
      const trialData = trialSnap.data();
      // Device has trial record - check if it's exhausted or linked to another user who created a firm
      if (trialData?.firmActivated && trialData.firmActivated !== firmId) {
        // This device was used to create a different firm's trial
        return NextResponse.json({
          eligible: false,
          reason: 'DEVICE_USED',
          ipPrefix,
        });
      }
    }

    // Check 2: Also check persistent device ID (in case FingerprintJS was reset)
    if (persistentDeviceId && persistentDeviceId !== deviceId) {
      const persistentTrialRef = adminDb.collection('trials').doc(persistentDeviceId);
      const persistentTrialSnap = await persistentTrialRef.get();

      if (persistentTrialSnap.exists) {
        const persistentData = persistentTrialSnap.data();
        if (persistentData?.firmActivated && persistentData.firmActivated !== firmId) {
          return NextResponse.json({
            eligible: false,
            reason: 'DEVICE_USED',
            ipPrefix,
          });
        }
      }
    }

    // Check 3: IP prefix already has a trial?
    const ipTrialRef = adminDb.collection('ipTrials').doc(ipPrefix);
    const ipTrialSnap = await ipTrialRef.get();

    if (ipTrialSnap.exists) {
      const ipData = ipTrialSnap.data();
      const linkedFirms = ipData?.linkedFirmIds || [];

      // If this IP already has firms that used trial (and not the current user's firm)
      if (linkedFirms.length > 0) {
        // If user already has a firm and it's in the list, they're fine
        if (firmId && linkedFirms.includes(firmId)) {
          // This is the same firm - allowed
        } else if (linkedFirms.length >= 1) {
          // Another firm already used trial from this IP - send abuse alert
          const now = Date.now();
          const lastAlert = sentAbuseAlerts.get(ipPrefix) || 0;
          if (now - lastAlert > ABUSE_ALERT_COOLDOWN) {
            sentAbuseAlerts.set(ipPrefix, now);
            // Send alert asynchronously (don't await)
            notifyAbuseAlert(ipPrefix, linkedFirms.length + 1, linkedFirms).catch(console.error);
          }

          return NextResponse.json({
            eligible: false,
            reason: 'NETWORK_USED',
            ipPrefix,
          });
        }
      }
    }

    // All checks passed - eligible for trial
    return NextResponse.json({
      eligible: true,
      ipPrefix,
    });
  } catch (error) {
    console.error('Trial eligibility check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Record that a trial was activated (called when firm is created)
export async function PUT(request: NextRequest) {
  try {
    // Verify the caller is authenticated
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deviceId, persistentDeviceId, firmId } = body;
    const userId = authResult.user.uid; // Use authenticated user's ID, not from body

    if (!deviceId || !firmId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const ipPrefix = getIpPrefix(clientIp);

    // Record device trial activation
    const trialRef = adminDb.collection('trials').doc(deviceId);
    await trialRef.set(
      {
        deviceFingerprint: deviceId,
        firmActivated: firmId,
        activatedBy: userId,
        ipPrefix,
        activatedAt: FieldValue.serverTimestamp(),
        persistentDeviceId: persistentDeviceId || null,
      },
      { merge: true }
    );

    // Also record for persistent device ID if different
    if (persistentDeviceId && persistentDeviceId !== deviceId) {
      const persistentTrialRef = adminDb.collection('trials').doc(persistentDeviceId);
      await persistentTrialRef.set(
        {
          deviceFingerprint: persistentDeviceId,
          firmActivated: firmId,
          activatedBy: userId,
          ipPrefix,
          activatedAt: FieldValue.serverTimestamp(),
          linkedToFingerprint: deviceId,
        },
        { merge: true }
      );
    }

    // Record IP trial
    const ipTrialRef = adminDb.collection('ipTrials').doc(ipPrefix);
    await ipTrialRef.set(
      {
        ipPrefix,
        linkedFirmIds: FieldValue.arrayUnion(firmId),
        linkedDeviceIds: FieldValue.arrayUnion(deviceId),
        linkedUserIds: FieldValue.arrayUnion(userId),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Set createdAt only if document is new
    const ipTrialSnap = await ipTrialRef.get();
    if (!ipTrialSnap.data()?.createdAt) {
      await ipTrialRef.update({
        createdAt: FieldValue.serverTimestamp(),
        trialActivatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Send new firm notification
    try {
      const firmDoc = await adminDb.collection('firms').doc(firmId).get();
      const firmData = firmDoc.data();
      if (firmData) {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        notifyNewFirm(firmData.name || 'Unknown Firm', userData?.email || 'Unknown').catch(console.error);
      }
    } catch (emailError) {
      console.error('Error sending new firm notification:', emailError);
    }

    return NextResponse.json({ success: true, ipPrefix });
  } catch (error) {
    console.error('Trial activation recording error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
