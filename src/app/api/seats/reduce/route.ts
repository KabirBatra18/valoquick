import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyAuth, verifyFirmOwner } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

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

    const { firmId, newSeatCount } = await req.json();

    if (!firmId || typeof newSeatCount !== 'number' || newSeatCount < 0) {
      return NextResponse.json(
        { error: 'Invalid request: firmId and newSeatCount (>= 0) required' },
        { status: 400 }
      );
    }

    // Only firm owner can reduce seats
    const isOwner = await verifyFirmOwner(authResult.user.uid, firmId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only firm owners can reduce seats' },
        { status: 403 }
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

    if (subscription?.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      );
    }

    // Get current member count (can't reduce below this)
    const membersSnapshot = await adminDb.collection('firms').doc(firmId).collection('members').get();
    const memberCount = membersSnapshot.size;

    // Total seats needed = 1 (included) + newSeatCount (purchased)
    const newTotalSeats = 1 + newSeatCount;

    if (memberCount > newTotalSeats) {
      return NextResponse.json(
        {
          error: `Cannot reduce to ${newTotalSeats} seats. You have ${memberCount} team members. Remove ${memberCount - newTotalSeats} member(s) first.`,
          memberCount,
          requestedSeats: newTotalSeats,
        },
        { status: 400 }
      );
    }

    const currentPurchased = subscription.seats?.purchased || 0;

    // If requesting same or more seats, cancel any pending reduction
    if (newSeatCount >= currentPurchased) {
      await adminDb.collection('subscriptions').doc(firmId).update({
        'seats.pendingReduction': FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        message: 'Pending seat reduction cancelled',
        seats: {
          purchased: currentPurchased,
          total: 1 + currentPurchased,
          pendingReduction: null,
        },
      });
    }

    // Schedule reduction for next renewal
    await adminDb.collection('subscriptions').doc(firmId).update({
      'seats.pendingReduction': newSeatCount,
      updatedAt: Timestamp.now(),
    });

    const currentPeriodEnd = subscription.currentPeriodEnd?.toDate();

    return NextResponse.json({
      success: true,
      message: `Seats will be reduced to ${newTotalSeats} at next renewal`,
      seats: {
        current: {
          purchased: currentPurchased,
          total: 1 + currentPurchased,
        },
        afterRenewal: {
          purchased: newSeatCount,
          total: newTotalSeats,
        },
        pendingReduction: newSeatCount,
        effectiveDate: currentPeriodEnd?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error scheduling seat reduction:', error);
    return NextResponse.json(
      { error: 'Failed to schedule seat reduction' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current reduction status
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const firmId = searchParams.get('firmId');

    if (!firmId) {
      return NextResponse.json(
        { error: 'firmId required' },
        { status: 400 }
      );
    }

    // Only firm owner can check reduction status
    const isOwner = await verifyFirmOwner(authResult.user.uid, firmId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only firm owners can view seat reduction status' },
        { status: 403 }
      );
    }

    const subscriptionDoc = await adminDb.collection('subscriptions').doc(firmId).get();

    if (!subscriptionDoc.exists) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const subscription = subscriptionDoc.data();
    const pendingReduction = subscription?.seats?.pendingReduction;
    const currentPeriodEnd = subscription?.currentPeriodEnd?.toDate();

    return NextResponse.json({
      hasPendingReduction: pendingReduction !== undefined,
      pendingReduction,
      currentSeats: {
        purchased: subscription?.seats?.purchased || 0,
        total: subscription?.seats?.total || 1,
      },
      effectiveDate: currentPeriodEnd?.toISOString(),
    });
  } catch (error) {
    console.error('Error checking seat reduction:', error);
    return NextResponse.json(
      { error: 'Failed to check seat reduction status' },
      { status: 500 }
    );
  }
}
