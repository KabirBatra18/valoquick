import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyAuth, verifyFirmMembership } from '@/lib/firebase-admin';
import { SEAT_PRICING, PlanType } from '@/types/subscription';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimited = rateLimit(req, 'seats-calculate', RATE_LIMITS.standard);
    if (rateLimited) return rateLimited;

    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { firmId, additionalSeats } = await req.json();

    if (!firmId || typeof additionalSeats !== 'number' || additionalSeats < 1) {
      return NextResponse.json(
        { error: 'Invalid request: firmId and additionalSeats (>= 1) required' },
        { status: 400 }
      );
    }

    // Verify user belongs to this firm
    const isMember = await verifyFirmMembership(authResult.user.uid, firmId);
    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this firm' },
        { status: 403 }
      );
    }

    // Get current subscription
    const subscriptionDoc = await adminDb.collection('subscriptions').doc(firmId).get();

    if (!subscriptionDoc.exists) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const subscription = subscriptionDoc.data();

    if (subscription?.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      );
    }

    const plan = subscription.plan as PlanType;
    const currentPeriodEnd = subscription.currentPeriodEnd?.toDate();

    if (!currentPeriodEnd) {
      return NextResponse.json(
        { error: 'Unable to determine billing cycle' },
        { status: 500 }
      );
    }

    // Calculate days remaining in current cycle
    const now = new Date();
    const msRemaining = currentPeriodEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // Get seat pricing for this plan
    const seatPricing = SEAT_PRICING[plan];
    const { amount: seatPrice, periodDays } = seatPricing;

    // Calculate pro-rated charge
    const dailyRate = seatPrice / periodDays;
    const proRatedPerSeat = Math.ceil(dailyRate * daysRemaining);
    const totalProRatedAmount = proRatedPerSeat * additionalSeats;

    // Calculate recurring amount (for future cycles)
    const recurringAmount = seatPrice * additionalSeats;

    // Current seat info
    const currentSeats = subscription.seats?.total || 1;
    const currentPurchased = subscription.seats?.purchased || 0;

    return NextResponse.json({
      currentSeats,
      currentPurchased,
      additionalSeats,
      newTotalSeats: currentSeats + additionalSeats,
      newPurchasedSeats: currentPurchased + additionalSeats,
      plan,
      daysRemaining,
      periodEnd: currentPeriodEnd.toISOString(),
      proRatedAmount: totalProRatedAmount,
      recurringAmount,
      breakdown: {
        seatPrice,
        dailyRate: Math.round(dailyRate),
        daysCharged: daysRemaining,
        perSeatProRated: proRatedPerSeat,
        totalProRated: totalProRatedAmount,
      },
      display: {
        proRated: `₹${(totalProRatedAmount / 100).toLocaleString('en-IN')}`,
        recurring: `₹${(recurringAmount / 100).toLocaleString('en-IN')}`,
        perSeat: seatPricing.displayAmount,
      },
    });
  } catch (error) {
    console.error('Error calculating seat cost:', error);
    return NextResponse.json(
      { error: 'Failed to calculate seat cost' },
      { status: 500 }
    );
  }
}
