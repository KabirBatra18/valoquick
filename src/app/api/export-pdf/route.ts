import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminDb, verifySession } from '@/lib/firebase-admin';
import { TRIAL_LIMIT } from '@/types/subscription';
import { htmlToPdfBase64 } from '@/lib/puppeteer';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { FieldValue } from 'firebase-admin/firestore';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimited = rateLimit(request, 'export-pdf', RATE_LIMITS.expensive);
    if (rateLimited) return rateLimited;

    // Auth
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.user.uid;

    // Session
    const sessionId = request.headers.get('x-session-id');
    const sessionResult = await verifySession(userId, sessionId);
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error || 'Session expired' },
        { status: 401 }
      );
    }

    // Subscription / trial check
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const firmId = userData?.firmId;
    let isSubscribed = false;

    if (firmId) {
      const subscriptionDoc = await adminDb.collection('subscriptions').doc(firmId).get();
      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data();
        if (subscription?.status === 'active' && subscription?.currentPeriodEnd) {
          const periodEnd = subscription.currentPeriodEnd.toDate();
          const gracePeriodEnd = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000);
          if (new Date() <= gracePeriodEnd) {
            isSubscribed = true;
          }
        }
      }
    }

    // If not subscribed, check trial limit
    if (!isSubscribed) {
      let trialCount = 0;
      if (firmId) {
        // Firm users: check firm-level trial count
        const firmDoc = await adminDb.collection('firms').doc(firmId).get();
        trialCount = firmDoc.exists ? (firmDoc.data()?.trialReportsUsed || 0) : 0;
      } else {
        // Non-firm users: check user-level trial count
        trialCount = userData?.trialReportsUsed || 0;
      }

      if (trialCount >= TRIAL_LIMIT) {
        return NextResponse.json(
          { error: 'Trial limit reached. Please subscribe to continue generating reports.' },
          { status: 403 }
        );
      }
    }

    // Parse the edited HTML from the request body
    const { html } = await request.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Limit payload size to 10MB to prevent memory abuse
    if (html.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'HTML content too large' }, { status: 413 });
    }

    // Convert HTML to PDF
    const pdfBase64 = await htmlToPdfBase64(html);

    // Increment trial counter server-side (admin SDK bypasses security rules)
    if (!isSubscribed) {
      try {
        if (firmId) {
          await adminDb.collection('firms').doc(firmId).update({
            trialReportsUsed: FieldValue.increment(1),
          });
        } else {
          await adminDb.collection('users').doc(userId).update({
            trialReportsUsed: FieldValue.increment(1),
          });
        }
      } catch (err) {
        console.error('Failed to increment trial counter:', err);
      }
    }

    return NextResponse.json({ pdf: pdfBase64 });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export PDF' },
      { status: 500 }
    );
  }
}
