'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { FirmProvider } from '@/contexts/FirmContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import SessionExpiredModal from './SessionExpiredModal';
import ErrorBoundary from './ErrorBoundary';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <FirmProvider>
            <SubscriptionProvider>
              {children}
              <SessionExpiredModal />
            </SubscriptionProvider>
          </FirmProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
