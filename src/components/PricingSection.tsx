'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirm } from '@/contexts/FirmContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PRICING, SEAT_PRICING, PlanType } from '@/types/subscription';
import {
  createRazorpaySubscription,
  openRazorpayCheckout,
  verifyPayment,
} from '@/lib/razorpay';

interface PricingSectionProps {
  onSelectPlan?: () => void;
  showHeader?: boolean;
}

export default function PricingSection({ onSelectPlan, showHeader = true }: PricingSectionProps) {
  const { user, signIn } = useAuth();
  const { firm } = useFirm();
  const { refreshSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = async (planType: PlanType) => {
    setError(null);

    // If not logged in, trigger sign in
    if (!user) {
      if (onSelectPlan) {
        onSelectPlan();
      } else {
        signIn();
      }
      return;
    }

    // If no firm, they need to complete onboarding first
    if (!firm) {
      setError('Please complete your organization setup first.');
      return;
    }

    setIsLoading(planType);

    try {
      // Create auto-recurring subscription on server
      const result = await createRazorpaySubscription(planType, firm.id);

      if (!result.success || !result.subscriptionId) {
        setError(result.error || 'Failed to create subscription');
        setIsLoading(null);
        return;
      }

      // Open Razorpay checkout
      await openRazorpayCheckout({
        subscriptionId: result.subscriptionId,
        plan: planType,
        firmId: firm.id,
        userEmail: user.email || '',
        userName: user.displayName || '',
        onSuccess: async (response) => {
          // Verify payment
          const verifyResult = await verifyPayment(
            response.razorpay_payment_id,
            response.razorpay_subscription_id,
            response.razorpay_signature,
            firm.id,
            planType
          );

          if (verifyResult.success) {
            await refreshSubscription();
          } else {
            setError(verifyResult.error || 'Payment verification failed');
          }
          setIsLoading(null);
        },
        onDismiss: () => {
          setIsLoading(null);
        },
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {showHeader && (
        <>
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-text-secondary text-center mb-12">
            One plan with everything you need. No hidden fees.
          </p>
        </>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Monthly Plan */}
        <div className="glass-card p-6 md:p-8 flex flex-col">
          <h3 className="text-xl font-semibold text-text-primary mb-2">Monthly</h3>
          <div className="mb-4">
            <span className="text-4xl md:text-5xl font-bold text-text-primary">
              {PRICING.monthly.displayAmount}
            </span>
            <span className="text-lg text-text-secondary">/month</span>
          </div>
          <ul className="space-y-3 mb-4 flex-grow">
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited Reports
            </li>
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              1 Team Member Included
            </li>
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              All Features
            </li>
          </ul>
          <p className="text-xs text-text-tertiary mb-4">
            + {SEAT_PRICING.monthly.displayAmount}/seat/mo for additional members
          </p>
          <button
            onClick={() => handleSelectPlan('monthly')}
            disabled={isLoading !== null}
            className="btn btn-secondary text-lg px-6 py-3 rounded-xl font-semibold w-full"
          >
            {isLoading === 'monthly' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Choose Monthly'
            )}
          </button>
        </div>

        {/* 6 Months Plan */}
        <div className="glass-card p-6 md:p-8 flex flex-col border-2 border-accent-primary/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-text-primary">6 Months</h3>
            <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-full text-sm font-semibold">
              Save {PRICING.halfyearly.savings}
            </span>
          </div>
          <div className="mb-4">
            <span className="text-4xl md:text-5xl font-bold text-text-primary">
              {PRICING.halfyearly.displayAmount}
            </span>
            <span className="text-lg text-text-secondary">/6 months</span>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            ~₹833/month
          </p>
          <ul className="space-y-3 mb-4 flex-grow">
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited Reports
            </li>
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              1 Team Member Included
            </li>
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              All Features
            </li>
          </ul>
          <p className="text-xs text-text-tertiary mb-4">
            + {SEAT_PRICING.halfyearly.displayAmount}/seat/6mo for additional members
          </p>
          <button
            onClick={() => handleSelectPlan('halfyearly')}
            disabled={isLoading !== null}
            className="btn btn-secondary text-lg px-6 py-3 rounded-xl font-semibold w-full"
          >
            {isLoading === 'halfyearly' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Choose 6 Months'
            )}
          </button>
        </div>

        {/* Yearly Plan - Best Value */}
        <div className="glass-card p-6 md:p-8 flex flex-col relative border-2 border-accent-primary">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
            BEST VALUE
          </div>
          <div className="flex items-center justify-between mb-2 mt-2">
            <h3 className="text-xl font-semibold text-text-primary">Yearly</h3>
            <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded-full text-sm font-semibold">
              Save {PRICING.yearly.savings}
            </span>
          </div>
          <div className="mb-4">
            <span className="text-4xl md:text-5xl font-bold text-text-primary">
              {PRICING.yearly.displayAmount}
            </span>
            <span className="text-lg text-text-secondary">/year</span>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            ~₹750/month
          </p>
          <ul className="space-y-3 mb-4 flex-grow">
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited Reports
            </li>
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              1 Team Member Included
            </li>
            <li className="flex items-center gap-2 text-text-primary">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              All Features
            </li>
          </ul>
          <p className="text-xs text-text-tertiary mb-4">
            + {SEAT_PRICING.yearly.displayAmount}/seat/year for additional members
          </p>
          <button
            onClick={() => handleSelectPlan('yearly')}
            disabled={isLoading !== null}
            className="btn btn-primary text-lg px-6 py-3 rounded-xl font-semibold w-full"
          >
            {isLoading === 'yearly' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Choose Yearly'
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-text-tertiary mt-8 text-lg">
        Secure payment powered by Razorpay
      </p>
    </div>
  );
}
