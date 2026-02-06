import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { getAdminDb } from '@/lib/firebase-admin';
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

    // Get all counts in parallel
    const [
      firmsSnapshot,
      usersSnapshot,
      subscriptionsSnapshot,
      ipTrialsSnapshot,
    ] = await Promise.all([
      db.collection('firms').get(),
      db.collection('users').get(),
      db.collection('subscriptions').where('status', '==', 'active').get(),
      db.collection('ipTrials').get(),
    ]);

    // Calculate total trial reports used across all firms
    let totalTrialReports = 0;
    for (const firmDoc of firmsSnapshot.docs) {
      const firmData = firmDoc.data();
      totalTrialReports += firmData.trialReportsUsed || 0;
    }

    // Calculate monthly revenue (approximate from active subscriptions)
    let monthlyRevenue = 0;
    const planPrices: Record<string, number> = {
      monthly: 999,
      halfyearly: 4999,
      yearly: 7999,
    };

    for (const subDoc of subscriptionsSnapshot.docs) {
      const subData = subDoc.data();
      const plan = subData.plan || 'monthly';
      const basePrice = planPrices[plan] || 999;
      const extraSeats = (subData.seats?.purchased || 0);
      const seatPrice = plan === 'monthly' ? 299 : plan === 'halfyearly' ? 1499 : 2399;
      monthlyRevenue += basePrice + (extraSeats * seatPrice);
    }

    // Count blocked attempts (IPs with multiple firms)
    let blockedAttempts = 0;
    for (const ipDoc of ipTrialsSnapshot.docs) {
      const ipData = ipDoc.data();
      if ((ipData.linkedFirmIds?.length || 0) > 1) {
        blockedAttempts++;
      }
    }

    return NextResponse.json({
      firms: firmsSnapshot.size,
      users: usersSnapshot.size,
      activeSubscriptions: subscriptionsSnapshot.size,
      monthlyRevenue,
      trialReportsUsed: totalTrialReports,
      blockedAttempts,
      ipTrialsCount: ipTrialsSnapshot.size,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
