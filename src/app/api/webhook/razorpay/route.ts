import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { notifyNewSubscription, notifySubscriptionCancelled } from '@/lib/email';
import { logger } from '@/lib/logger';

// App identifier to distinguish ValuQuick events from other apps using same Razorpay account
const APP_IDENTIFIER = 'valuquick';

// Idempotency: track processed webhook events to prevent duplicate processing
const processedWebhooks = new Map<string, { processedAt: number }>();
const WEBHOOK_IDEMPOTENCY_WINDOW = 3600000; // 1 hour

function cleanOldWebhooks() {
  const now = Date.now();
  for (const [key, value] of processedWebhooks) {
    if (now - value.processedAt > WEBHOOK_IDEMPOTENCY_WINDOW) {
      processedWebhooks.delete(key);
    }
  }
}

function getWebhookIdempotencyKey(event: string, payload: RazorpayWebhookPayload['payload']): string {
  const subscriptionId = payload.subscription?.entity?.id || '';
  const paymentId = payload.payment?.entity?.id || '';
  return `${event}_${subscriptionId}_${paymentId}`;
}

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

interface SubscriptionNotes {
  app?: string;
  firmId?: string;
  plan?: string;
  type?: 'base' | 'seats'; // Distinguish subscription types
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        quantity?: number;
        current_end?: number; // Unix timestamp
        notes?: SubscriptionNotes;
      };
    };
    payment?: {
      entity: {
        id: string;
        subscription_id?: string;
        status: string;
        notes?: SubscriptionNotes;
      };
    };
  };
}

// Helper to check if this event belongs to ValuQuick
function isValuQuickEvent(payload: RazorpayWebhookPayload['payload']): boolean {
  const subscriptionApp = payload.subscription?.entity?.notes?.app;
  const paymentApp = payload.payment?.entity?.notes?.app;
  return subscriptionApp === APP_IDENTIFIER || paymentApp === APP_IDENTIFIER;
}

function calculatePeriodEnd(plan: string): Date {
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

// Handle successful subscription payment (initial or renewal)
async function handleSubscriptionCharged(payload: RazorpayWebhookPayload['payload']) {
  const subscription = payload.subscription?.entity;
  const payment = payload.payment?.entity;

  if (!subscription) return;

  const firmId = subscription.notes?.firmId;
  const plan = subscription.notes?.plan;
  const subscriptionType = subscription.notes?.type;

  if (!firmId || !plan) {
    console.error('Missing firmId or plan in subscription notes');
    return;
  }

  // Use Razorpay's current_end if available, otherwise calculate
  let periodEnd: Date;
  if (subscription.current_end) {
    periodEnd = new Date(subscription.current_end * 1000);
  } else {
    periodEnd = calculatePeriodEnd(plan);
  }

  // Handle seats subscription differently
  if (subscriptionType === 'seats') {
    await handleSeatsSubscriptionCharged(firmId, payload.subscription!, periodEnd);
    return;
  }

  // Base subscription handling
  await adminDb.collection('subscriptions').doc(firmId).set({
    plan,
    status: 'active',
    razorpaySubscriptionId: subscription.id,
    razorpayPaymentId: payment?.id || null,
    currentPeriodEnd: Timestamp.fromDate(periodEnd),
    updatedAt: Timestamp.now(),
  }, { merge: true });

  logger.info(`Base subscription renewed for firm ${firmId}, next billing: ${periodEnd}`);

  // Send email notification for new subscription
  try {
    const firmDoc = await adminDb.collection('firms').doc(firmId).get();
    const firmData = firmDoc.data();
    const firmName = firmData?.name || 'Unknown Firm';

    // Get owner email
    const membersSnapshot = await adminDb.collection('firms').doc(firmId).collection('members').where('role', '==', 'owner').get();
    const ownerEmail = membersSnapshot.docs[0]?.data()?.email || 'Unknown';

    // Calculate amount based on plan
    const planPrices: Record<string, number> = { monthly: 999, halfyearly: 4999, yearly: 7999 };
    const amount = planPrices[plan] || 999;

    await notifyNewSubscription(firmName, plan, amount, ownerEmail);
  } catch (emailError) {
    console.error('Error sending subscription email:', emailError);
  }
}

// Handle seats subscription charged/renewed
async function handleSeatsSubscriptionCharged(
  firmId: string,
  subscriptionPayload: NonNullable<RazorpayWebhookPayload['payload']['subscription']>,
  periodEnd: Date
) {
  const subscription = subscriptionPayload.entity;
  if (!subscription) return;

  const razorpay = getRazorpayInstance();

  // Get current subscription data to check for pending reduction
  const subscriptionDoc = await adminDb.collection('subscriptions').doc(firmId).get();
  const currentData = subscriptionDoc.data();
  const pendingReduction = currentData?.seats?.pendingReduction;

  // If there's a pending reduction, apply it now
  if (pendingReduction !== undefined && razorpay) {
    logger.info(`Applying pending seat reduction for firm ${firmId}: ${pendingReduction} seats`);

    try {
      if (pendingReduction === 0) {
        // Cancel seats subscription entirely
        await razorpay.subscriptions.cancel(subscription.id);

        await adminDb.collection('subscriptions').doc(firmId).update({
          'seats.purchased': 0,
          'seats.total': 1,
          'seats.razorpaySeatsSubscriptionId': FieldValue.delete(),
          'seats.seatsCurrentPeriodEnd': FieldValue.delete(),
          'seats.seatsStatus': 'cancelled',
          'seats.pendingReduction': FieldValue.delete(),
          updatedAt: Timestamp.now(),
        });

        logger.info(`Seats subscription cancelled for firm ${firmId}`);
        return;
      } else {
        // Update quantity to reduced amount
        await razorpay.subscriptions.update(subscription.id, {
          quantity: pendingReduction,
        });

        await adminDb.collection('subscriptions').doc(firmId).update({
          'seats.purchased': pendingReduction,
          'seats.total': 1 + pendingReduction,
          'seats.seatsCurrentPeriodEnd': Timestamp.fromDate(periodEnd),
          'seats.seatsStatus': 'active',
          'seats.pendingReduction': FieldValue.delete(),
          updatedAt: Timestamp.now(),
        });

        logger.info(`Seats reduced to ${pendingReduction} for firm ${firmId}`);
        return;
      }
    } catch (error) {
      console.error('Error applying pending seat reduction:', error);
      // Continue with normal update if reduction fails
    }
  }

  // Normal seats renewal - just update period end
  const currentQuantity = subscription.quantity || currentData?.seats?.purchased || 0;

  await adminDb.collection('subscriptions').doc(firmId).update({
    'seats.seatsCurrentPeriodEnd': Timestamp.fromDate(periodEnd),
    'seats.seatsStatus': 'active',
    'seats.purchased': currentQuantity,
    'seats.total': 1 + currentQuantity,
    updatedAt: Timestamp.now(),
  });

  logger.info(`Seats subscription renewed for firm ${firmId}, ${currentQuantity} seats, next billing: ${periodEnd}`);
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(payload: RazorpayWebhookPayload['payload']) {
  const subscription = payload.subscription?.entity;
  if (!subscription) return;

  const firmId = subscription.notes?.firmId;
  const subscriptionType = subscription.notes?.type;

  if (!firmId) {
    console.error('Missing firmId in subscription notes');
    return;
  }

  if (subscriptionType === 'seats') {
    // Seats subscription cancelled
    await adminDb.collection('subscriptions').doc(firmId).update({
      'seats.seatsStatus': 'cancelled',
      'seats.purchased': 0,
      'seats.total': 1,
      updatedAt: Timestamp.now(),
    });
    logger.info(`Seats subscription cancelled for firm ${firmId}`);
  } else {
    // Base subscription cancelled - also cancel seats subscription if exists
    const subscriptionDoc = await adminDb.collection('subscriptions').doc(firmId).get();
    const currentData = subscriptionDoc.data();
    const seatsSubscriptionId = currentData?.seats?.razorpaySeatsSubscriptionId;

    if (seatsSubscriptionId) {
      const razorpay = getRazorpayInstance();
      if (razorpay) {
        try {
          await razorpay.subscriptions.cancel(seatsSubscriptionId);
          logger.info(`Auto-cancelled seats subscription for firm ${firmId}`);
        } catch (error) {
          console.error('Error cancelling seats subscription:', error);
        }
      }
    }

    await adminDb.collection('subscriptions').doc(firmId).update({
      status: 'cancelled',
      'seats.seatsStatus': 'cancelled',
      updatedAt: Timestamp.now(),
    });
    logger.info(`Base subscription cancelled for firm ${firmId}`);

    // Send email notification for cancellation
    try {
      const firmDoc = await adminDb.collection('firms').doc(firmId).get();
      const firmData = firmDoc.data();
      const firmName = firmData?.name || 'Unknown Firm';

      const membersSnapshot = await adminDb.collection('firms').doc(firmId).collection('members').where('role', '==', 'owner').get();
      const ownerEmail = membersSnapshot.docs[0]?.data()?.email || 'Unknown';

      const plan = currentData?.plan || 'unknown';
      await notifySubscriptionCancelled(firmName, plan, ownerEmail);
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
    }
  }
}

// Handle payment failure (card declined, insufficient funds, etc.)
async function handlePaymentFailed(payload: RazorpayWebhookPayload['payload']) {
  const subscription = payload.subscription?.entity;
  if (!subscription) return;

  const firmId = subscription.notes?.firmId;
  const subscriptionType = subscription.notes?.type;

  if (!firmId) {
    console.error('Missing firmId in subscription notes');
    return;
  }

  if (subscriptionType === 'seats') {
    // Seats subscription payment failed
    // Base subscription still active, but extra members get read-only access
    await adminDb.collection('subscriptions').doc(firmId).update({
      'seats.seatsStatus': 'past_due',
      updatedAt: Timestamp.now(),
    });
    logger.info(`Seats payment failed for firm ${firmId} - extra members have read-only access`);
  } else {
    // Base subscription payment failed
    await adminDb.collection('subscriptions').doc(firmId).update({
      status: 'past_due',
      updatedAt: Timestamp.now(),
    });
    logger.info(`Base payment failed for firm ${firmId}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event: RazorpayWebhookPayload = JSON.parse(payload);

    // CRITICAL: Only process events that belong to ValuQuick
    // This allows multiple apps to share the same Razorpay account safely
    if (!isValuQuickEvent(event.payload)) {
      // Not a ValuQuick event - return 200 so Razorpay doesn't retry
      // (This event likely belongs to another app like Electro-Ninjas)
      logger.debug('Ignoring non-ValuQuick event:', event.event);
      return NextResponse.json({ received: true, ignored: true });
    }

    // Idempotency check - prevent duplicate processing
    cleanOldWebhooks();
    const idempotencyKey = getWebhookIdempotencyKey(event.event, event.payload);
    if (processedWebhooks.has(idempotencyKey)) {
      logger.debug('Duplicate webhook ignored:', idempotencyKey);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Mark as processing
    processedWebhooks.set(idempotencyKey, { processedAt: Date.now() });

    switch (event.event) {
      case 'subscription.charged':
        // Successful payment (initial or renewal)
        await handleSubscriptionCharged(event.payload);
        break;
      case 'subscription.activated':
        // Subscription activated after first payment
        await handleSubscriptionCharged(event.payload);
        break;
      case 'subscription.cancelled':
        // User or admin cancelled subscription
        await handleSubscriptionCancelled(event.payload);
        break;
      case 'subscription.halted':
        // Too many payment failures
        await handlePaymentFailed(event.payload);
        break;
      case 'payment.failed':
        // Individual payment failed
        await handlePaymentFailed(event.payload);
        break;
      default:
        logger.debug('Unhandled webhook event:', event.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
