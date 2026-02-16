'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { FirmProvider } from '@/contexts/FirmContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import SessionExpiredModal from './SessionExpiredModal';

export default function Providers({ children }: { children: ReactNode }) {
  return (
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
  );
}
