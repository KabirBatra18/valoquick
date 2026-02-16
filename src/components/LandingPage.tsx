'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { signIn } = useAuth();

  const handleTryFree = () => {
    signIn();
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-100/95 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-text-primary">ValuQuick</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-lg text-text-secondary hover:text-text-primary transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-lg text-text-secondary hover:text-text-primary transition-colors">
              Pricing
            </a>
            <button
              onClick={signIn}
              className="btn btn-secondary text-lg px-6 py-3"
            >
              Log In
            </button>
          </nav>
          <button
            onClick={signIn}
            className="md:hidden btn btn-secondary"
          >
            Log In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6">
            Create Professional Valuation Reports{' '}
            <span className="text-brand">in Minutes</span>, Not Hours
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-10 leading-relaxed">
            The simple way for valuation professionals to generate bank-ready reports
          </p>

          {/* Benefits List */}
          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 mb-12 text-left md:text-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-lg md:text-xl text-text-primary">Save 80% of Your Time</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-lg md:text-xl text-text-primary">Bank-Ready Reports</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-lg md:text-xl text-text-primary">Auto Calculations</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleTryFree}
            className="w-full md:w-auto btn btn-primary text-xl md:text-2xl px-10 py-5 rounded-2xl font-semibold"
          >
            TRY FREE - No Credit Card Needed
          </button>
          <p className="mt-4 text-lg text-text-tertiary">
            Generate up to 5 reports free
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-20 px-4 bg-surface-100/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-12">
            Why Valuation Professionals Choose ValuQuick
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="glass-card text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">80% Faster</h3>
              <p className="text-lg text-text-secondary leading-relaxed">
                Stop wasting hours on formatting and calculations. Enter the data once and get a complete, professional report instantly.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="glass-card text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">Perfect Format</h3>
              <p className="text-lg text-text-secondary leading-relaxed">
                Bank-ready reports every time. Consistent, professional formatting that meets all industry standards.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="glass-card text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-4">Accurate Numbers</h3>
              <p className="text-lg text-text-secondary leading-relaxed">
                All calculations done automatically. Land value, depreciation, and final valuation computed correctly every time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-16">
            How It Works
          </h2>
          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Enter Property Details</h3>
                <p className="text-xl text-text-secondary leading-relaxed">
                  Fill in the simple form with property information. Just type in the details you already know - address, measurements, ownership.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Add Photos</h3>
                <p className="text-xl text-text-secondary leading-relaxed">
                  Upload property photos from your phone or computer. Just drag and drop - we handle the rest.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Generate Report</h3>
                <p className="text-xl text-text-secondary leading-relaxed">
                  Click one button and download your professional PDF report instantly. Ready to submit to the bank.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-20 px-4 bg-surface-100/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-text-secondary text-center mb-12">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free Trial */}
            <div className="glass-card p-6 md:p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-text-primary mb-1">Free Trial</h3>
                <p className="text-sm text-text-tertiary">No credit card needed</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-text-primary">&#8377;0</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['5 Free Reports', 'Full PDF Export', 'Photo Attachments', 'Preview & Edit Before Export'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={handleTryFree} className="w-full btn btn-secondary py-3 rounded-xl font-semibold">
                Start Free
              </button>
            </div>

            {/* Yearly — Best Value */}
            <div className="glass-card p-6 md:p-8 flex flex-col border-2 border-brand relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-brand text-white px-4 py-1 rounded-full font-semibold">
                BEST VALUE
              </span>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-text-primary mb-1">Yearly</h3>
                <p className="text-sm text-text-tertiary">Billed annually</p>
              </div>
              <div className="mb-1">
                <span className="text-4xl font-bold text-text-primary">&#8377;750</span>
                <span className="text-text-tertiary">/month</span>
              </div>
              <p className="text-sm text-green-500 font-medium mb-6">&#8377;9,000/year — save &#8377;3,000</p>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited Reports', 'Team Collaboration', 'Custom Branding', 'Priority Support', 'Extra Members from &#8377;300/mo'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span dangerouslySetInnerHTML={{ __html: f }} />
                  </li>
                ))}
              </ul>
              <button onClick={handleTryFree} className="w-full btn btn-primary py-3 rounded-xl font-semibold">
                Get Started
              </button>
            </div>

            {/* Monthly */}
            <div className="glass-card p-6 md:p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-text-primary mb-1">Monthly</h3>
                <p className="text-sm text-text-tertiary">Cancel anytime</p>
              </div>
              <div className="mb-1">
                <span className="text-4xl font-bold text-text-primary">&#8377;1,000</span>
                <span className="text-text-tertiary">/month</span>
              </div>
              <p className="text-sm text-text-tertiary mb-6">Flexible, no commitment</p>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited Reports', 'Team Collaboration', 'Custom Branding', 'Priority Support', 'Extra Members from &#8377;400/mo'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span dangerouslySetInnerHTML={{ __html: f }} />
                  </li>
                ))}
              </ul>
              <button onClick={handleTryFree} className="w-full btn btn-secondary py-3 rounded-xl font-semibold">
                Get Started
              </button>
            </div>
          </div>

          <p className="text-center text-text-tertiary text-sm mt-8">
            All plans include GST. Secure payment via Razorpay.
          </p>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-8">
            Trusted by Valuation Professionals
          </h2>
          <div className="glass-card p-8 md:p-12">
            <svg className="w-12 h-12 text-brand/50 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p className="text-xl md:text-2xl text-text-secondary leading-relaxed mb-6">
              "ValuQuick has transformed how I create reports. What used to take me 3-4 hours now takes less than 30 minutes. The reports look professional and banks accept them without any issues."
            </p>
            <p className="text-lg text-text-tertiary">
              — Property Valuation Professional
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 px-4 bg-brand/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
            Ready to Save Hours Every Week?
          </h2>
          <p className="text-xl text-text-secondary mb-10">
            Join valuation professionals who have already made the switch
          </p>
          <button
            onClick={handleTryFree}
            className="w-full md:w-auto btn btn-primary text-xl md:text-2xl px-10 py-5 rounded-2xl font-semibold"
          >
            START FREE TRIAL
          </button>
          <p className="mt-4 text-lg text-text-tertiary">
            No credit card required - 5 free reports
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-surface-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-tertiary">
            © 2026 ValuQuick. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-text-tertiary hover:text-text-secondary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-text-tertiary hover:text-text-secondary transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
