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
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Select plan & team, Step 2: Review & pay

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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary text-center mb-2">
            {step === 1 ? 'Choose Your Plan' : 'Review & Pay'}
          </h2>
          <p className="text-sm sm:text-base text-text-secondary text-center mb-6 sm:mb-8">
            {step === 1 ? 'Unlimited reports. Add team members as needed.' : 'Confirm your subscription details'}
          </p>
        </>
      )}

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 1 ? 'bg-brand text-white' : 'bg-green-500 text-white'}`}>
          {step === 1 ? '1' : '✓'}
        </div>
        <div className={`w-12 h-1 rounded ${step === 2 ? 'bg-brand' : 'bg-surface-300'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 2 ? 'bg-brand text-white' : 'bg-surface-300 text-text-tertiary'}`}>
          2
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6 md:p-8">
        {/* STEP 1: Plan & Team Selection */}
        {step === 1 && (
          <>
            {/* Plan Selector */}
            <div className="mb-5 sm:mb-6">
              <label className="block text-sm sm:text-base font-semibold text-text-primary mb-2 sm:mb-3">
                Select Billing Cycle
              </label>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {(['monthly', 'halfyearly', 'yearly'] as PlanType[]).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative p-2.5 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all ${
                      selectedPlan === plan
                        ? 'border-brand bg-brand/10'
                        : 'border-surface-300 hover:border-surface-200'
                    }`}
                  >
                    {plan === 'yearly' && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] bg-green-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        BEST
                      </span>
                    )}
                    <div className="text-xs sm:text-sm font-semibold text-text-primary">{planDetails[plan].label}</div>
                    <div className="text-[10px] sm:text-xs text-text-tertiary">₹{planDetails[plan].perMonth}/mo</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Extra Members Section */}
            <div className="mb-5 sm:mb-6">
              <label className="block text-sm sm:text-base font-semibold text-text-primary mb-2 sm:mb-3">
                Add Team Members
              </label>

              {/* Included member highlight */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                      1 Member Included FREE
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-tertiary">
                      Your account is already included
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra members selector */}
              <div className="bg-surface-200/50 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm sm:text-base font-medium text-text-primary">
                      Extra Members
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-tertiary">
                      {SEAT_PRICING[selectedPlan].displayAmount} each
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                      disabled={teamSize <= 1}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-surface-100 border border-surface-300 text-text-primary font-bold text-xl hover:bg-surface-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      −
                    </button>
                    <div className="w-12 sm:w-14 text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-text-primary">{additionalSeats}</div>
                    </div>
                    <button
                      onClick={() => setTeamSize(teamSize + 1)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-surface-100 border border-surface-300 text-text-primary font-bold text-xl hover:bg-surface-200 transition-colors flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Total team size summary */}
              <div className="mt-3 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-xs sm:text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Total Team: {teamSize} {teamSize === 1 ? 'person' : 'people'}
                </span>
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={() => setStep(2)}
              className="w-full btn btn-primary text-sm sm:text-lg py-3 sm:py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              Next: Review Payment
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Features */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited Reports
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                PDF Export
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Team Collaboration
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Cancel Anytime
              </div>
            </div>
          </>
        )}

        {/* STEP 2: Review & Pay */}
        {step === 2 && (
          <>
            {/* Order Summary */}
            <div className="mb-5 sm:mb-6">
              <label className="block text-sm sm:text-base font-semibold text-text-primary mb-3 sm:mb-4">
                Your Order
              </label>

              <div className="bg-surface-200/30 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
                {/* Plan */}
                <div className="flex justify-between items-center pb-3 border-b border-surface-300">
                  <div>
                    <div className="text-sm sm:text-base font-medium text-text-primary">
                      {planDetails[selectedPlan].label} Plan
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-tertiary">
                      Includes 1 member
                    </div>
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-text-primary">
                    {formatPrice(basePriceAmount)}
                  </div>
                </div>

                {/* Extra members */}
                <div className="flex justify-between items-center pb-3 border-b border-surface-300">
                  <div>
                    <div className="text-sm sm:text-base font-medium text-text-primary">
                      Extra Members
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-tertiary">
                      {additionalSeats} × {SEAT_PRICING[selectedPlan].displayAmount}
                    </div>
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-text-primary">
                    {formatPrice(seatPriceAmount)}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-1">
                  <div>
                    <div className="text-base sm:text-lg font-bold text-text-primary">
                      Total
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-tertiary">
                      Billed per {planDetails[selectedPlan].period}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-brand">
                      {formatPrice(totalAmount)}
                    </div>
                    {selectedPlan !== 'monthly' && (
                      <div className="text-xs sm:text-sm text-green-500 font-medium">
                        You save {PRICING[selectedPlan].savings}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Team Summary */}
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 sm:p-4 mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-semibold text-text-primary">
                    Team of {teamSize} {teamSize === 1 ? 'Person' : 'People'}
                  </div>
                  <div className="text-[11px] sm:text-xs text-text-tertiary">
                    1 included + {additionalSeats} extra {additionalSeats === 1 ? 'member' : 'members'}
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full btn btn-primary text-sm sm:text-lg py-3 sm:py-4 rounded-xl font-semibold"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <span>Pay {formatPrice(totalAmount)}</span>
                )}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 sm:py-3 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Edit
              </button>
            </div>

            <p className="text-center text-text-tertiary text-[10px] sm:text-xs mt-4">
              Secure payment via Razorpay. Cancel anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
