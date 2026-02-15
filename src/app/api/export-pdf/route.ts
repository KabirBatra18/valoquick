import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminDb, verifySession } from '@/lib/firebase-admin';
import { TRIAL_LIMIT } from '@/types/subscription';
import { htmlToPdfBase64 } from '@/lib/puppeteer';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
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
    let canGenerate = false;

    if (firmId) {
      const subscriptionDoc = await adminDb.collection('subscriptions').doc(firmId).get();
      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data();
        if (subscription?.status === 'active' && subscription?.currentPeriodEnd) {
          const periodEnd = subscription.currentPeriodEnd.toDate();
          const gracePeriodEnd = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000);
          if (new Date() <= gracePeriodEnd) {
            canGenerate = true;
          }
        }
      }
    }

    if (!canGenerate) {
      const userTrialCount = userData?.trialReportsUsed || 0;
      if (userTrialCount < TRIAL_LIMIT) {
        canGenerate = true;
      }
    }

    if (!canGenerate) {
      return NextResponse.json(
        { error: 'Trial limit reached. Please subscribe to continue generating reports.' },
        { status: 403 }
      );
    }

    // Parse the edited HTML from the request body
    const { html } = await request.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Convert HTML to PDF
    const pdfBase64 = await htmlToPdfBase64(html);

    return NextResponse.json({ pdf: pdfBase64 });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export PDF' },
      { status: 500 }
    );
  }
}
