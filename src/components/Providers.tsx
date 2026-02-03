'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { FirmProvider } from '@/contexts/FirmContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FirmProvider>
        {children}
      </FirmProvider>
    </AuthProvider>
  );
}
