'use client';

import { PRICING, SEAT_PRICING, PlanType } from '@/types/subscription';
import { authenticatedFetch } from './api-client';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

let razorpayScriptLoaded = false;

export async function loadRazorpayScript(): Promise<void> {
  if (razorpayScriptLoaded) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      razorpayScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay script'));
    };
    document.body.appendChild(script);
  });
}

export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

export async function createRazorpaySubscription(
  plan: PlanType,
  firmId: string,
  additionalSeats: number = 0
): Promise<CreateSubscriptionResult> {
  try {
    const response = await authenticatedFetch('/api/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan, firmId, additionalSeats }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Create subscription error:', response.status, error);
      return { success: false, error: error.error || 'Failed to create subscription' };
    }

    const data = await response.json();
    return { success: true, subscriptionId: data.subscriptionId };
  } catch (error) {
    console.error('Create subscription network error:', error);
    return { success: false, error: 'Network error' };
  }
}

export interface OpenCheckoutOptions {
  subscriptionId: string;
  plan: PlanType;
  firmId: string;
  userEmail: string;
  userName: string;
  additionalSeats?: number;
  onSuccess: (response: RazorpayResponse) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(options: OpenCheckoutOptions): Promise<void> {
  await loadRazorpayScript();

  const planDetails = PRICING[options.plan];
  const additionalSeats = options.additionalSeats || 0;

  // Calculate total for description
  const baseAmount = planDetails.amount;
  const seatsAmount = additionalSeats * SEAT_PRICING[options.plan].amount;
  const totalAmount = (baseAmount + seatsAmount) / 100;

  let description = `${planDetails.name} Plan`;
  if (additionalSeats > 0) {
    description += ` + ${additionalSeats} extra seat${additionalSeats > 1 ? 's' : ''}`;
  }
  description += ` - ₹${totalAmount.toLocaleString('en-IN')}/${planDetails.period}`;

  const razorpayOptions: RazorpayOptions = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    subscription_id: options.subscriptionId,
    name: 'ValuQuick',
    description,
    prefill: {
      name: options.userName,
      email: options.userEmail,
    },
    theme: {
      color: '#6366f1',
    },
    handler: options.onSuccess,
    modal: {
      ondismiss: options.onDismiss,
    },
  };

  const razorpay = new window.Razorpay(razorpayOptions);
  razorpay.open();
}

export async function verifyPayment(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  firmId: string,
  plan: PlanType,
  additionalSeats: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await authenticatedFetch('/api/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: subscriptionId,
        razorpay_signature: signature,
        firmId,
        plan,
        additionalSeats,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Payment verification failed' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}
