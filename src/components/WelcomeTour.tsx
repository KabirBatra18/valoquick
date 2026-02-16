'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'valoquick_tour_dismissed';

interface WelcomeTourProps {
  onCreateReport: () => void;
  onOpenBranding: () => void;
  onOpenTeam: () => void;
}

const steps = [
  {
    title: 'Create Your First Report',
    description: 'Click "New Report" to start a valuation. Fill in property details, add photos, and generate a bank-ready PDF.',
    icon: (
      <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    action: 'create',
  },
  {
    title: 'Customize Your Branding',
    description: 'Add your firm logo, choose colors, and set header/footer text. Your reports will carry your professional identity.',
    icon: (
      <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    action: 'branding',
  },
  {
    title: 'Invite Your Team',
    description: 'Add colleagues to your firm so they can create reports too. Each member gets their own login.',
    icon: (
      <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    action: 'team',
  },
];

export default function WelcomeTour({ onCreateReport, onOpenBranding, onOpenTeam }: WelcomeTourProps) {
  const [dismissed, setDismissed] = useState(true); // Default to hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === 'true');
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleAction = (action: string) => {
    if (action === 'create') onCreateReport();
    if (action === 'branding') onOpenBranding();
    if (action === 'team') onOpenTeam();
    handleDismiss();
  };

  return (
    <div className="mb-6 glass-card p-5 sm:p-6 border-brand/30">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Welcome to ValuQuick</h2>
          <p className="text-sm text-text-secondary mt-1">Here&apos;s how to get started in 3 simple steps</p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => handleAction(step.action)}
            className="text-left p-4 rounded-xl bg-surface-200/50 hover:bg-surface-200 border border-surface-300 hover:border-brand/30 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand/20 transition-colors">
                {step.icon}
              </div>
              <span className="text-xs font-bold text-brand">STEP {i + 1}</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">{step.title}</h3>
            <p className="text-xs text-text-tertiary leading-relaxed">{step.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
