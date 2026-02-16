'use client';

import { useState, useEffect } from 'react';
import { useFirm } from '@/contexts/FirmContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOrCreateReferralCode, getReferralStats, REFERRAL_BONUS_DAYS } from '@/lib/referral';

interface ReferralCardProps {
  variant?: 'card' | 'banner';
  onDismiss?: () => void;
}

export default function ReferralCard({ variant = 'card', onDismiss }: ReferralCardProps) {
  const { firm } = useFirm();
  const { lang } = useLanguage();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalReferrals: number; rewardedReferrals: number; bonusDaysEarned: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firm?.id) return;
    let cancelled = false;

    async function load() {
      try {
        const [code, referralStats] = await Promise.all([
          getOrCreateReferralCode(firm!.id),
          getReferralStats(firm!.id),
        ]);
        if (!cancelled) {
          setReferralCode(code);
          setStats(referralStats);
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [firm?.id]);

  if (loading || !referralCode) return null;

  const shareText = lang === 'hi'
    ? `ValuQuick से तेज़ प्रॉपर्टी वैल्यूएशन रिपोर्ट बनाएं! मेरा रेफ़रल कोड इस्तेमाल करें: ${referralCode} — हम दोनों को ${REFERRAL_BONUS_DAYS} दिन मुफ़्त मिलेंगे। https://valuquick.in`
    : `Join ValuQuick for fast property valuation reports! Use my referral code: ${referralCode} — we both get ${REFERRAL_BONUS_DAYS} days free. https://valuquick.in`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ValuQuick Referral', text: shareText });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Banner variant: compact dismissible banner at top of dashboard
  if (variant === 'banner') {
    return (
      <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 sm:p-4 mb-4 flex items-center gap-3">
        <svg className="w-5 h-5 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-text-primary">Refer & Earn: </span>
          <span className="text-sm text-text-secondary">Share code <strong className="font-mono tracking-wider">{referralCode}</strong> — you both get {REFERRAL_BONUS_DAYS} days free!</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-lg bg-brand/20 text-brand text-xs font-medium hover:bg-brand/30 transition-colors"
          >
            Share
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card variant: full referral card
  return (
    <div className="glass-card p-4 sm:p-5 mt-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            Refer & Earn
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            Share this code with other valuers. When they subscribe, you both get {REFERRAL_BONUS_DAYS} days free!
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 px-3 py-2.5 bg-surface-200 rounded-lg font-mono text-sm tracking-wider text-text-primary text-center font-semibold">
          {referralCode}
        </div>
        <button
          onClick={handleCopy}
          className="p-2.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-text-secondary hover:text-text-primary transition-colors"
          title="Copy code"
        >
          {copied ? (
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand transition-colors"
          title="Share"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {stats && stats.totalReferrals > 0 && (
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span>{stats.totalReferrals} referral{stats.totalReferrals !== 1 ? 's' : ''}</span>
          {stats.bonusDaysEarned > 0 && (
            <>
              <span className="text-surface-300">|</span>
              <span className="text-emerald-400">{stats.bonusDaysEarned} bonus days earned</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
