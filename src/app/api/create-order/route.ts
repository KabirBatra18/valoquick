import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { PlanType } from '@/types/subscription';
import { verifyAuth, verifyFirmOwner, verifySession } from '@/lib/firebase-admin';

// Rate limiting: track requests per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 requests per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return null;
  }

  return new Razorpay({ key_id, key_secret });
}

// Get Plan ID from environment variables
function getPlanId(plan: PlanType): string | null {
  switch (plan) {
    case 'monthly':
      return process.env.RAZORPAY_PLAN_MONTHLY || null;
    case 'halfyearly':
      return process.env.RAZORPAY_PLAN_HALFYEARLY || null;
    case 'yearly':
      return process.env.RAZORPAY_PLAN_YEARLY || null;
    default:
      return null;
  }
}

// Get Seat Plan ID from environment variables
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

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

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
        { error: 'Payment system not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { plan, firmId } = body;

    // Validate and sanitize additionalSeats
    let additionalSeats = 0;
    if (body.additionalSeats !== undefined) {
      const parsed = parseInt(body.additionalSeats, 10);
      if (isNaN(parsed) || parsed < 0) {
        additionalSeats = 0;
      } else if (parsed > 100) {
        return NextResponse.json(
          { error: 'Maximum 100 additional seats allowed' },
          { status: 400 }
        );
      } else {
        additionalSeats = parsed;
      }
    }

    if (!plan || !firmId) {
      return NextResponse.json(
        { error: 'Missing required fields: plan and firmId' },
        { status: 400 }
      );
    }

    // Only firm owner can create subscriptions
    const isOwner = await verifyFirmOwner(userId, firmId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only firm owners can subscribe' },
        { status: 403 }
      );
    }

    if (!['monthly', 'halfyearly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    const planId = getPlanId(plan as PlanType);
    if (!planId) {
      return NextResponse.json(
        { error: 'Subscription plans not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // If additional seats requested, verify seat plan exists
    let seatPlanId: string | null = null;
    if (additionalSeats > 0) {
      seatPlanId = getSeatPlanId(plan as PlanType);
      if (!seatPlanId) {
        return NextResponse.json(
          { error: 'Seat plans not configured. Please contact support.' },
          { status: 503 }
        );
      }
    }

    // Create auto-recurring subscription in Razorpay
    // IMPORTANT: Include 'app: valuquick' to distinguish from other apps using same Razorpay account
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: plan === 'yearly' ? 10 : 120, // Max 10 years
      notes: {
        app: 'valuquick', // Critical: identifies this as a ValuQuick subscription
        firmId,
        plan,
        additionalSeats: String(additionalSeats),
      },
    });

    // If additional seats, create a seats subscription too
    let seatsSubscriptionId: string | undefined;
    if (additionalSeats > 0 && seatPlanId) {
      const seatsSubscription = await razorpay.subscriptions.create({
        plan_id: seatPlanId,
        customer_notify: 1,
        quantity: additionalSeats,
        total_count: plan === 'yearly' ? 10 : 120,
        notes: {
          app: 'valuquick',
          type: 'seats',
          firmId,
          plan,
          seatCount: String(additionalSeats),
        },
      });
      seatsSubscriptionId = seatsSubscription.id;
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      seatsSubscriptionId,
      plan,
      additionalSeats,
    });
  } catch (error) {
    console.error('Error creating Razorpay subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
