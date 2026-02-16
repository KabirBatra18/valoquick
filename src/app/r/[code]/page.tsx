'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{4,12}$/i;

export default function ReferralRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const raw = params.code;
    const code = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';

    if (code && REFERRAL_CODE_PATTERN.test(code)) {
      try {
        sessionStorage.setItem('valoquick_referral_code', code.toUpperCase());
      } catch {
        // sessionStorage not available
      }
    }
    router.replace('/');
  }, [params.code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
