'use client';

import { useState, useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFirm } from '@/contexts/FirmContext';
import { loadRazorpayScript } from '@/lib/razorpay';
import { SEAT_PRICING } from '@/types/subscription';
import { authenticatedFetch } from '@/lib/api-client';

interface AddSeatsModalProps {
  onClose: () => void;
}

interface CalculationResult {
  currentSeats: number;
  newTotalSeats: number;
  proRatedAmount: number;
  recurringAmount: number;
  daysRemaining: number;
  display: {
    proRated: string;
    recurring: string;
    perSeat: string;
  };
}

export default function AddSeatsModal({ onClose }: AddSeatsModalProps) {
  const { subscription, refreshSubscription, refreshSeatInfo } = useSubscription();
  const { firm } = useFirm();
  const [seatCount, setSeatCount] = useState(1);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = subscription?.plan || 'monthly';
  const seatPrice = SEAT_PRICING[plan];

  // Calculate cost when seat count changes
  useEffect(() => {
    if (!firm?.id || seatCount < 1) return;

    const calculateCost = async () => {
      setIsCalculating(true);
      setError(null);

      try {
        const response = await authenticatedFetch('/api/seats/calculate', {
          method: 'POST',
          body: JSON.stringify({
            firmId: firm.id,
            additionalSeats: seatCount,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to calculate cost');
          return;
        }

        setCalculation(data);
      } catch (err) {
        setError('Failed to calculate cost');
      } finally {
        setIsCalculating(false);
      }
    };

    calculateCost();
  }, [firm?.id, seatCount]);

  const handlePurchase = async () => {
    if (!firm?.id || !calculation) return;

    setIsPurchasing(true);
    setError(null);

    try {
      // Load Razorpay script
      await loadRazorpayScript();

      // Create order
      const orderResponse = await authenticatedFetch('/api/seats/purchase', {
        method: 'POST',
        body: JSON.stringify({
          firmId: firm.id,
          additionalSeats: seatCount,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        setError(orderData.error || 'Failed to create order');
        setIsPurchasing(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ValuQuick',
        description: `Add ${seatCount} seat${seatCount > 1 ? 's' : ''} (Pro-rated)`,
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // Verify payment
          const verifyResponse = await authenticatedFetch('/api/seats/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              firmId: firm.id,
              additionalSeats: seatCount,
              plan: plan,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyData.success) {
            await refreshSubscription();
            await refreshSeatInfo();
            onClose();
          } else {
            setError(verifyData.error || 'Payment verification failed');
          }
          setIsPurchasing(false);
        },
        modal: {
          ondismiss: () => {
            setIsPurchasing(false);
          },
        },
        prefill: {
          name: firm.name,
        },
        theme: {
          color: '#6366f1',
        },
      };

      const RazorpayConstructor = (window as typeof window & { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
      const razorpay = new RazorpayConstructor(options);
      razorpay.open();
    } catch (err) {
      console.error('Purchase error:', err);
      setError('Something went wrong. Please try again.');
      setIsPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-primary rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Add Team Seats</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Seat Counter */}
        <div className="mb-6">
          <label className="block text-sm text-text-secondary mb-2">
            How many seats do you need?
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
              disabled={seatCount <= 1}
              className="w-12 h-12 rounded-lg bg-surface-secondary text-text-primary text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-tertiary transition-colors"
            >
              -
            </button>
            <div className="flex-1 text-center">
              <span className="text-4xl font-bold text-text-primary">{seatCount}</span>
              <p className="text-sm text-text-tertiary">seat{seatCount > 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setSeatCount(seatCount + 1)}
              className="w-12 h-12 rounded-lg bg-surface-secondary text-text-primary text-xl font-bold hover:bg-surface-tertiary transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mb-6 p-4 bg-surface-secondary rounded-xl">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Cost Breakdown</h3>

          {isCalculating ? (
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-5 w-5 text-accent-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : calculation ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  Pro-rated ({calculation.daysRemaining} days remaining)
                </span>
                <span className="text-text-primary font-medium">
                  {calculation.display.proRated}
                </span>
              </div>
              <div className="border-t border-surface-tertiary my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  Then recurring ({seatCount} x {seatPrice.displayAmount})
                </span>
                <span className="text-text-primary font-medium">
                  {calculation.display.recurring}/{plan === 'yearly' ? 'year' : plan === 'halfyearly' ? '6mo' : 'mo'}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 btn btn-secondary py-3 rounded-xl font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={isPurchasing || isCalculating || !calculation}
            className="flex-1 btn btn-primary py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {isPurchasing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Pay ${calculation?.display.proRated || ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
