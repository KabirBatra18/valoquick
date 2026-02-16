import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb, verifyAuth, verifyFirmOwner, verifySession } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PlanType } from '@/types/subscription';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// Idempotency: track processed payment IDs to prevent duplicate processing
const processedPayments = new Map<string, { success: boolean; processedAt: number }>();
const IDEMPOTENCY_WINDOW = 3600000; // 1 hour

// Clean old entries periodically
function cleanOldPayments() {
  const now = Date.now();
  for (const [key, value] of processedPayments) {
    if (now - value.processedAt > IDEMPOTENCY_WINDOW) {
      processedPayments.delete(key);
    }
  }
}

function calculatePeriodEnd(plan: PlanType): Date {
  const now = new Date();
  switch (plan) {
    case 'yearly':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case 'halfyearly':
      return new Date(now.setMonth(now.getMonth() + 6));
    case 'monthly':
    default:
      return new Date(now.setMonth(now.getMonth() + 1));
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimited = rateLimit(req, 'verify-payment', RATE_LIMITS.payment);
    if (rateLimited) return rateLimited;

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

    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      firmId,
      plan,
    } = body;

    // Validate and sanitize additionalSeats
    let additionalSeats = 0;
    if (body.additionalSeats !== undefined) {
      const parsed = parseInt(body.additionalSeats, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        additionalSeats = parsed;
      }
    }

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !firmId || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Idempotency check - prevent duplicate processing
    cleanOldPayments();
    const idempotencyKey = `${razorpay_payment_id}_${razorpay_subscription_id}`;
    const existingPayment = processedPayments.get(idempotencyKey);
    if (existingPayment) {
      return NextResponse.json({ success: existingPayment.success, duplicate: true });
    }

    // Only firm owner can verify subscription payments
    const isOwner = await verifyFirmOwner(userId, firmId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only firm owners can verify subscription payments' },
        { status: 403 }
      );
    }

    // Verify signature (for subscriptions: payment_id|subscription_id)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Invalid Razorpay signature');
      processedPayments.set(idempotencyKey, { success: false, processedAt: Date.now() });
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update subscription in Firestore
    const periodEnd = calculatePeriodEnd(plan as PlanType);

    // Prepare subscription data with seat info
    const subscriptionData: Record<string, unknown> = {
      plan,
      status: 'active',
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpayPaymentId: razorpay_payment_id,
      currentPeriodEnd: Timestamp.fromDate(periodEnd),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      seats: {
        included: 1,
        purchased: additionalSeats,
        total: 1 + additionalSeats,
      },
    };

    await adminDb.collection('subscriptions').doc(firmId).set(subscriptionData, { merge: true });

    // Process referral rewards (first-time subscription only)
    try {
      const firmDoc = await adminDb.collection('firms').doc(firmId).get();
      const referredBy = firmDoc.data()?.referredBy;
      if (referredBy) {
        // Check if referral reward was already given
        const referralSnap = await adminDb.collection('referrals')
          .where('refereeFirmId', '==', firmId)
          .where('referrerFirmId', '==', referredBy)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (!referralSnap.empty) {
          const referralDoc = referralSnap.docs[0];
          const bonusDays = 30;
          const bonusMs = bonusDays * 24 * 60 * 60 * 1000;

          // Reward referrer: extend their subscription period
          const referrerSub = await adminDb.collection('subscriptions').doc(referredBy).get();
          if (referrerSub.exists) {
            const currentEnd = referrerSub.data()?.currentPeriodEnd?.toDate() || new Date();
            const newEnd = new Date(currentEnd.getTime() + bonusMs);
            await adminDb.collection('subscriptions').doc(referredBy).update({
              currentPeriodEnd: Timestamp.fromDate(newEnd),
              updatedAt: Timestamp.now(),
            });
          }

          // Reward referee: extend this subscription period
          const refereeSub = await adminDb.collection('subscriptions').doc(firmId).get();
          if (refereeSub.exists) {
            const currentEnd = refereeSub.data()?.currentPeriodEnd?.toDate() || periodEnd;
            const newEnd = new Date(currentEnd.getTime() + bonusMs);
            await adminDb.collection('subscriptions').doc(firmId).update({
              currentPeriodEnd: Timestamp.fromDate(newEnd),
              updatedAt: Timestamp.now(),
            });
          }

          // Mark referral as rewarded
          await referralDoc.ref.update({
            status: 'rewarded',
            rewardedAt: Timestamp.now(),
          });
        }
      }
    } catch (referralError) {
      // Referral processing failure should not block subscription
      console.error('Referral reward error (non-critical):', referralError);
    }

    // Mark as processed for idempotency
    processedPayments.set(idempotencyKey, { success: true, processedAt: Date.now() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
