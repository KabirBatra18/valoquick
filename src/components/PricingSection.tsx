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
  const [extraMembers, setExtraMembers] = useState(0); // Extra members beyond the 1 included
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Select plan, Step 2: Add team, Step 3: Review & pay

  const additionalSeats = extraMembers; // Extra members = additional seats
  const totalTeamSize = 1 + extraMembers; // 1 included + extra members
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
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? 'bg-brand text-white' : 'bg-surface-200 text-text-tertiary'
                }`}>
                  {step > s ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-0.5 ${step > s ? 'bg-brand' : 'bg-surface-300'}`} />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary text-center mb-2">
            {step === 1 && 'Step 1: Choose Billing'}
            {step === 2 && 'Step 2: Add Team Members'}
            {step === 3 && 'Step 3: Review & Pay'}
          </h2>
          <p className="text-sm sm:text-base text-text-secondary text-center mb-6 sm:mb-8">
            {step === 1 && 'How often would you like to be billed?'}
            {step === 2 && 'Need extra logins for your staff?'}
            {step === 3 && 'Check everything looks correct'}
          </p>
        </>
      )}

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-xs sm:text-sm">
          {error}
        </div>
      )}

      <div className="glass-card p-4 sm:p-6 md:p-8">
        {/* STEP 1: Choose Billing Cycle */}
        {step === 1 && (
          <>
            {/* Plan Options */}
            <div className="space-y-3 mb-6">
              {(['yearly', 'halfyearly', 'monthly'] as PlanType[]).map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative w-full p-4 sm:p-5 rounded-xl border-2 transition-all text-left ${
                    selectedPlan === plan
                      ? 'border-brand bg-brand/10'
                      : 'border-surface-300 hover:border-surface-200'
                  }`}
                >
                  {plan === 'yearly' && (
                    <span className="absolute -top-2.5 right-4 text-[10px] sm:text-xs bg-green-500 text-white px-2 sm:px-3 py-0.5 rounded-full font-semibold">
                      BEST VALUE
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base sm:text-lg font-semibold text-text-primary">
                        {planDetails[plan].label}
                      </div>
                      <div className="text-xs sm:text-sm text-text-tertiary mt-0.5">
                        Billed every {planDetails[plan].period}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold text-text-primary">
                        ₹{planDetails[plan].perMonth}<span className="text-xs font-normal text-text-tertiary">/mo</span>
                      </div>
                      {plan !== 'monthly' && (
                        <div className="text-xs text-text-tertiary">
                          billed {formatPrice(PRICING[plan].amount)} / {planDetails[plan].period}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedPlan === plan && plan !== 'monthly' && PRICING[plan].savings && (
                    <div className="mt-2 text-xs sm:text-sm text-green-500 font-medium">
                      You save {PRICING[plan].savings}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Features */}
            <div className="bg-surface-200/30 rounded-xl p-4 mb-6">
              <div className="text-sm font-semibold text-text-primary mb-3">What&apos;s included:</div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
            </div>

            {/* Next Button */}
            <button
              onClick={() => setStep(2)}
              className="w-full btn btn-primary text-sm sm:text-lg py-3 sm:py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              Next: Add Team Members
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* STEP 2: Team Size */}
        {step === 2 && (
          <>
            {/* Your Account - Included */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                    Your Account (Included in Plan)
                  </div>
                  <div className="text-xs sm:text-sm text-text-secondary">
                    You can use ValuQuick with your base subscription
                  </div>
                </div>
                <div className="ml-auto">
                  <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                    Included
                  </span>
                </div>
              </div>
            </div>

            {/* Extra Members Selector */}
            <div className="mb-5">
              <label className="block text-sm sm:text-base font-semibold text-text-primary mb-2">
                Do you need extra logins for your team?
              </label>
              <p className="text-xs sm:text-sm text-text-tertiary mb-4">
                Add extra members if you want your staff or colleagues to also use ValuQuick with their own login.
              </p>

              <div className="bg-surface-200/50 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm sm:text-base font-medium text-text-primary">
                      Extra Members
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {SEAT_PRICING[selectedPlan].displayAmount} per member
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      onClick={() => setExtraMembers(Math.max(0, extraMembers - 1))}
                      disabled={extraMembers <= 0}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-surface-100 border border-surface-300 text-text-primary font-bold text-2xl hover:bg-surface-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[50px]">
                      <div className="text-3xl sm:text-4xl font-bold text-text-primary">{extraMembers}</div>
                    </div>
                    <button
                      onClick={() => setExtraMembers(extraMembers + 1)}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-surface-100 border border-surface-300 text-text-primary font-bold text-2xl hover:bg-surface-200 transition-colors flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Total Team Summary */}
              <div className="mt-4 flex items-center justify-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand rounded-full text-sm font-medium">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Total: {totalTeamSize} {totalTeamSize === 1 ? 'person' : 'people'} can use ValuQuick
                </span>
              </div>

              {/* Price breakdown */}
              <div className="mt-4 bg-surface-200/30 rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Base plan (includes you)</span>
                    <span>{formatPrice(basePriceAmount)}</span>
                  </div>
                  {extraMembers > 0 && (
                    <div className="flex justify-between text-text-secondary">
                      <span>{extraMembers} extra {extraMembers === 1 ? 'member' : 'members'}</span>
                      <span>{formatPrice(seatPriceAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-text-primary pt-2 border-t border-surface-300">
                    <span>Total ({planDetails[selectedPlan].period})</span>
                    <span className="text-brand">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4 mb-5">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-xs sm:text-sm text-text-secondary">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Note:</span> Each account can only be used on one device at a time.
                  If someone else logs in, the previous device will be logged out automatically.
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setStep(3)}
                className="w-full btn btn-primary text-sm sm:text-lg py-3 sm:py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                Next: Review & Pay
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 sm:py-3 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Review & Pay */}
        {step === 3 && (
          <>
            {/* Order Summary */}
            <div className="mb-5 sm:mb-6">
              <label className="block text-sm sm:text-base font-semibold text-text-primary mb-3 sm:mb-4">
                Your Order Summary
              </label>

              <div className="bg-surface-200/30 rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4">
                {/* Plan */}
                <div className="flex justify-between items-center pb-3 border-b border-surface-300">
                  <div>
                    <div className="text-sm sm:text-base font-medium text-text-primary">
                      {planDetails[selectedPlan].label} Plan
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-tertiary">
                      For 1 person
                    </div>
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-text-primary">
                    {formatPrice(basePriceAmount)}
                  </div>
                </div>

                {/* Extra members */}
                {extraMembers > 0 && (
                  <div className="flex justify-between items-center pb-3 border-b border-surface-300">
                    <div>
                      <div className="text-sm sm:text-base font-medium text-text-primary">
                        Extra Members
                      </div>
                      <div className="text-[11px] sm:text-xs text-text-tertiary">
                        {extraMembers} {extraMembers === 1 ? 'member' : 'members'} × {SEAT_PRICING[selectedPlan].displayAmount}
                      </div>
                    </div>
                    <div className="text-base sm:text-lg font-semibold text-text-primary">
                      {formatPrice(seatPriceAmount)}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-1">
                  <div>
                    <div className="text-base sm:text-lg font-bold text-text-primary">
                      Total Amount
                    </div>
                    <div className="text-[11px] sm:text-xs text-text-tertiary">
                      Billed every {planDetails[selectedPlan].period}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-brand">
                      {formatPrice(totalAmount)}
                    </div>
                    {selectedPlan !== 'monthly' && PRICING[selectedPlan].savings && (
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
                    {totalTeamSize} {totalTeamSize === 1 ? 'Person' : 'People'} Can Use ValuQuick
                  </div>
                  <div className="text-[11px] sm:text-xs text-text-tertiary">
                    {extraMembers === 0 ? 'Just you' : `You + ${extraMembers} extra ${extraMembers === 1 ? 'member' : 'members'}`}
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
                onClick={() => setStep(2)}
                className="w-full py-2.5 sm:py-3 text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
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
