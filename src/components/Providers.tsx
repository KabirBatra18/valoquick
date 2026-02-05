'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { FirmProvider } from '@/contexts/FirmContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import SessionExpiredModal from './SessionExpiredModal';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FirmProvider>
        <SubscriptionProvider>
          {children}
          <SessionExpiredModal />
        </SubscriptionProvider>
      </FirmProvider>
    </AuthProvider>
  );
}
