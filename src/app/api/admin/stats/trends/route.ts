import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getAdminDb } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdmin(authResult.user.uid);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const daysParam = Number(searchParams.get('days'));
    const validDays = [7, 30, 90, 365];
    const days = validDays.includes(daysParam) ? daysParam : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const startTimestamp = Timestamp.fromDate(startDate);
    const db = getAdminDb();

    const [firmsSnapshot, usersSnapshot, subscriptionsSnapshot] = await Promise.all([
      db.collection('firms').where('createdAt', '>=', startTimestamp).get(),
      db.collection('users').where('createdAt', '>=', startTimestamp).get(),
      db.collection('subscriptions').where('createdAt', '>=', startTimestamp).get(),
    ]);

    // Build daily buckets with all dates in range
    const dateMap = new Map<string, { firms: number; users: number; subscriptions: number; revenue: number }>();

    const cursor = new Date(startDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor <= today) {
      const key = cursor.toISOString().split('T')[0];
      dateMap.set(key, { firms: 0, users: 0, subscriptions: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Bucket firms
    for (const doc of firmsSnapshot.docs) {
      const data = doc.data();
      const dateKey = data.createdAt?.toDate?.()?.toISOString()?.split('T')[0];
      if (dateKey && dateMap.has(dateKey)) {
        dateMap.get(dateKey)!.firms++;
      }
    }

    // Bucket users
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const dateKey = data.createdAt?.toDate?.()?.toISOString()?.split('T')[0];
      if (dateKey && dateMap.has(dateKey)) {
        dateMap.get(dateKey)!.users++;
      }
    }

    // Bucket subscriptions + revenue (same planPrices as stats/route.ts)
    const planPrices: Record<string, number> = {
      monthly: 999,
      halfyearly: 4999,
      yearly: 7999,
    };

    for (const doc of subscriptionsSnapshot.docs) {
      const data = doc.data();
      const dateKey = data.createdAt?.toDate?.()?.toISOString()?.split('T')[0];
      if (dateKey && dateMap.has(dateKey)) {
        dateMap.get(dateKey)!.subscriptions++;

        const plan = data.plan || 'monthly';
        const basePrice = planPrices[plan] || 999;
        const extraSeats = data.seats?.purchased || 0;
        const seatPrice = plan === 'monthly' ? 299 : plan === 'halfyearly' ? 1499 : 2399;
        dateMap.get(dateKey)!.revenue += basePrice + (extraSeats * seatPrice);
      }
    }

    // Convert to sorted arrays
    const sortedDates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    return NextResponse.json({
      firms: sortedDates.map(([date, d]) => ({ date, count: d.firms })),
      users: sortedDates.map(([date, d]) => ({ date, count: d.users })),
      subscriptions: sortedDates.map(([date, d]) => ({ date, count: d.subscriptions })),
      revenue: sortedDates.map(([date, d]) => ({ date, count: d.revenue })),
    });
  } catch (error) {
    console.error('Admin trends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
