import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb, verifyAuth, verifyFirmOwner, verifySession } from '@/lib/firebase-admin';
import { SEAT_PRICING, PlanType } from '@/types/subscription';

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return null;
  }

  return new Razorpay({ key_id, key_secret });
}

function getSeatPlanId(plan: PlanType): string | null {
  switch (plan) {
    case 'monthly':
      return process.env.RAZORPAY_SEAT_PLAN_MONTHLY || null;
    case 'halfyearly':
      return process.env.RAZORPAY_SEAT_PLAN_HALFYEARLY || null;
    case 'yearly':
      return process.env.RAZORPAY_SEAT_PLAN_YEARLY || null;
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.user.uid;

    // Verify session is valid (single-device enforcement)
    const sessionId = req.headers.get('x-session-id');
    const sessionResult = await verifySession(userId, sessionId);
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error || 'Session expired' },
        { status: 401 }
      );
    }

    const razorpay = getRazorpayInstance();

    if (!razorpay) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      );
    }

    const { firmId, additionalSeats } = await req.json();

    if (!firmId || typeof additionalSeats !== 'number' || additionalSeats < 1) {
      return NextResponse.json(
        { error: 'Invalid request: firmId and additionalSeats (>= 1) required' },
        { status: 400 }
      );
    }

    // Only firm owner can purchase seats
    const isOwner = await verifyFirmOwner(authResult.user.uid, firmId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only firm owners can purchase additional seats' },
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

    // Verify seat plan exists
    const seatPlanId = getSeatPlanId(plan);
    if (!seatPlanId) {
      return NextResponse.json(
        { error: 'Seat plans not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Calculate pro-rated amount
    const now = new Date();
    const msRemaining = currentPeriodEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    const seatPricing = SEAT_PRICING[plan];
    const dailyRate = seatPricing.amount / seatPricing.periodDays;
    const proRatedPerSeat = Math.ceil(dailyRate * daysRemaining);
    const totalProRatedAmount = proRatedPerSeat * additionalSeats;

    const currentPurchased = subscription.seats?.purchased || 0;
    const newTotalPurchased = currentPurchased + additionalSeats;

    // Create Razorpay order for pro-rated one-time payment
    const order = await razorpay.orders.create({
      amount: totalProRatedAmount,
      currency: 'INR',
      receipt: `seats_${firmId}_${Date.now()}`,
      notes: {
        app: 'valuquick',
        type: 'seat_purchase',
        firmId,
        additionalSeats: String(additionalSeats),
        newTotalPurchased: String(newTotalPurchased),
        plan,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: totalProRatedAmount,
      currency: 'INR',
      firmId,
      additionalSeats,
      newTotalPurchased,
      plan,
      seatPlanId,
    });
  } catch (error) {
    console.error('Error creating seat purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
