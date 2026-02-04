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
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [teamSize, setTeamSize] = useState(1); // 1 = just the owner
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const additionalSeats = Math.max(0, teamSize - 1); // Base plan includes 1 seat
  const basePriceAmount = PRICING[selectedPlan].amount;
  const seatPriceAmount = SEAT_PRICING[selectedPlan].amount * additionalSeats;
  const totalAmount = basePriceAmount + seatPriceAmount;

  const formatPrice = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  const handleSubscribe = async () => {
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

    setIsLoading(true);

    try {
      // Create subscription with seat count
      const result = await createRazorpaySubscription(selectedPlan, firm.id, additionalSeats);

      if (!result.success || !result.subscriptionId) {
        setError(result.error || 'Failed to create subscription');
        setIsLoading(false);
        return;
      }

      // Open Razorpay checkout
      await openRazorpayCheckout({
        subscriptionId: result.subscriptionId,
        plan: selectedPlan,
        firmId: firm.id,
        userEmail: user.email || '',
        userName: user.displayName || '',
        additionalSeats,
        onSuccess: async (response) => {
          // Verify payment
          const verifyResult = await verifyPayment(
            response.razorpay_payment_id,
            response.razorpay_subscription_id,
            response.razorpay_signature,
            firm.id,
            selectedPlan,
            additionalSeats
          );

          if (verifyResult.success) {
            await refreshSubscription();
          } else {
            setError(verifyResult.error || 'Payment verification failed');
          }
          setIsLoading(false);
        },
        onDismiss: () => {
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const planDetails = {
    monthly: { label: 'Monthly', period: 'month', perMonth: PRICING.monthly.amount / 100 },
    halfyearly: { label: '6 Months', period: '6 months', perMonth: Math.round(PRICING.halfyearly.amount / 600) },
    yearly: { label: 'Yearly', period: 'year', perMonth: Math.round(PRICING.yearly.amount / 1200) },
  };

  return (
    <div className="max-w-2xl mx-auto">
      {showHeader && (
        <>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-2">
            Choose Your Plan
          </h2>
          <p className="text-text-secondary text-center mb-8">
            Unlimited reports. Add team members as needed.
          </p>
        </>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
          {error}
        </div>
      )}

      <div className="glass-card p-6 md:p-8">
        {/* Plan Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">Billing Cycle</label>
          <div className="grid grid-cols-3 gap-2">
            {(['monthly', 'halfyearly', 'yearly'] as PlanType[]).map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`relative p-3 rounded-xl border-2 transition-all ${
                  selectedPlan === plan
                    ? 'border-brand bg-brand/10'
                    : 'border-surface-300 hover:border-surface-200'
                }`}
              >
                {plan === 'yearly' && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
                    BEST VALUE
                  </span>
                )}
                <div className="text-sm font-semibold text-text-primary">{planDetails[plan].label}</div>
                <div className="text-xs text-text-tertiary">~₹{planDetails[plan].perMonth}/mo</div>
              </button>
            ))}
          </div>
        </div>

        {/* Team Size Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-3">Team Size</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
              disabled={teamSize <= 1}
              className="w-10 h-10 rounded-xl bg-surface-200 text-text-primary font-bold text-lg hover:bg-surface-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              -
            </button>
            <div className="flex-1 text-center">
              <div className="text-3xl font-bold text-text-primary">{teamSize}</div>
              <div className="text-xs text-text-tertiary">
                {teamSize === 1 ? 'team member' : 'team members'}
              </div>
            </div>
            <button
              onClick={() => setTeamSize(teamSize + 1)}
              className="w-10 h-10 rounded-xl bg-surface-200 text-text-primary font-bold text-lg hover:bg-surface-300 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-xs text-text-tertiary text-center mt-2">
            Base plan includes 1 member. Additional members at {SEAT_PRICING[selectedPlan].displayAmount}/{planDetails[selectedPlan].period} each.
          </p>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-surface-200 pt-6 mb-6">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Base plan ({planDetails[selectedPlan].label})</span>
              <span className="text-text-primary">{formatPrice(basePriceAmount)}</span>
            </div>
            {additionalSeats > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  Additional seats ({additionalSeats} x {SEAT_PRICING[selectedPlan].displayAmount})
                </span>
                <span className="text-text-primary">{formatPrice(seatPriceAmount)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-end border-t border-surface-200 pt-4">
            <div>
              <div className="text-sm text-text-tertiary">Total per {planDetails[selectedPlan].period}</div>
              <div className="text-2xl font-bold text-text-primary">{formatPrice(totalAmount)}</div>
            </div>
            {selectedPlan !== 'monthly' && (
              <div className="text-right">
                <span className="text-xs text-green-500 font-medium">
                  Save {PRICING[selectedPlan].savings}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Subscribe Button */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full btn btn-primary text-lg py-4 rounded-xl font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            `Subscribe - ${formatPrice(totalAmount)}/${planDetails[selectedPlan].period}`
          )}
        </button>

        <p className="text-center text-text-tertiary text-xs mt-4">
          Secure payment powered by Razorpay. Cancel anytime.
        </p>
      </div>

      {/* Features */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Unlimited Reports
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          PDF Export
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Team Collaboration
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          All Features Included
        </div>
      </div>
    </div>
  );
}
