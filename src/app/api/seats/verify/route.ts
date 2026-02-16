import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { adminDb, verifyAuth, verifyFirmOwner } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PlanType } from '@/types/subscription';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

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
    // Rate limiting
    const rateLimited = rateLimit(req, 'seats-verify', RATE_LIMITS.payment);
    if (rateLimited) return rateLimited;

    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      firmId,
      additionalSeats,
      plan,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !firmId || !additionalSeats || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only firm owner can verify seat purchases
    const isOwner = await verifyFirmOwner(authResult.user.uid, firmId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only firm owners can purchase additional seats' },
        { status: 403 }
      );
    }

    // Verify signature (order_id|payment_id)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Invalid Razorpay signature for seat purchase');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Get current subscription
    const subscriptionDoc = await adminDb.collection('subscriptions').doc(firmId).get();

    if (!subscriptionDoc.exists) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const subscription = subscriptionDoc.data();
    const existingSeatsSubscriptionId = subscription?.seats?.razorpaySeatsSubscriptionId;
    const currentPurchased = subscription?.seats?.purchased || 0;
    const newTotalPurchased = currentPurchased + additionalSeats;

    const seatPlanId = getSeatPlanId(plan as PlanType);

    if (!seatPlanId) {
      return NextResponse.json(
        { error: 'Seat plan not configured' },
        { status: 503 }
      );
    }

    let seatsSubscriptionId = existingSeatsSubscriptionId;

    if (existingSeatsSubscriptionId) {
      // Update existing seats subscription quantity
      try {
        await razorpay.subscriptions.update(existingSeatsSubscriptionId, {
          quantity: newTotalPurchased,
        });
      } catch (updateError) {
        console.error('Error updating seats subscription:', updateError);
        // If update fails, try creating a new subscription
        seatsSubscriptionId = null;
      }
    }

    if (!seatsSubscriptionId) {
      // Create new seats subscription
      // Try to align with base subscription cycle by setting start_at
      const currentPeriodEnd = subscription?.currentPeriodEnd?.toDate();

      const seatsSubscription = await razorpay.subscriptions.create({
        plan_id: seatPlanId,
        quantity: newTotalPurchased,
        customer_notify: 1,
        total_count: plan === 'yearly' ? 10 : 120, // Max 10 years
        notes: {
          app: 'valuquick',
          type: 'seats',
          firmId,
          plan,
        },
        // Start at next billing cycle (pro-rated amount already paid)
        start_at: currentPeriodEnd ? Math.floor(currentPeriodEnd.getTime() / 1000) : undefined,
      });

      seatsSubscriptionId = seatsSubscription.id;
    }

    // Update Firestore with new seat info
    await adminDb.collection('subscriptions').doc(firmId).update({
      'seats.purchased': newTotalPurchased,
      'seats.total': 1 + newTotalPurchased, // 1 included + purchased
      'seats.razorpaySeatsSubscriptionId': seatsSubscriptionId,
      'seats.seatsStatus': 'active',
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      seatsSubscriptionId,
      seats: {
        included: 1,
        purchased: newTotalPurchased,
        total: 1 + newTotalPurchased,
      },
    });
  } catch (error) {
    console.error('Error verifying seat purchase:', error);
    return NextResponse.json(
      { error: 'Failed to verify seat purchase' },
      { status: 500 }
    );
  }
}
