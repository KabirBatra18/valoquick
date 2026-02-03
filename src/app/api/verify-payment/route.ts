import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb, verifyAuth, verifyFirmOwner } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { PlanType } from '@/types/subscription';

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
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      firmId,
      plan,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !firmId || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only firm owner can verify subscription payments
    const isOwner = await verifyFirmOwner(authResult.user.uid, firmId);
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
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update subscription in Firestore
    const periodEnd = calculatePeriodEnd(plan as PlanType);

    await adminDb.collection('subscriptions').doc(firmId).set({
      plan,
      status: 'active',
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpayPaymentId: razorpay_payment_id,
      currentPeriodEnd: Timestamp.fromDate(periodEnd),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
