'use client';

import { useState, useEffect, useCallback } from 'react';
import Dashboard from '@/components/Dashboard';
import ValuationForm from '@/components/ValuationForm';
import { ValuationReport } from '@/types/valuation';
import { ReportFormData, DEFAULT_FORM_DATA } from '@/types/report';
import { getReport, saveReport, createNewReport, updateReportStatus } from '@/utils/storage';

const steps = [
  { id: 0, name: 'Property', fullName: 'Property Details', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 1, name: 'Owners', fullName: 'Owner Information', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
  { id: 2, name: 'Valuation', fullName: 'Valuation Parameters', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 3, name: 'Building', fullName: 'Building Specs', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 4, name: 'Technical', fullName: 'Technical Details', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 5, name: 'Photos', fullName: 'Property Photos', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReportFormData>(DEFAULT_FORM_DATA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<{ pdf?: string; docx?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save every 5 seconds when in editor
  useEffect(() => {
    if (view !== 'editor' || !currentReportId) return;

    const saveInterval = setInterval(() => {
      const report = getReport(currentReportId);
      if (report) {
        report.formData = formData;
        saveReport(report);
        setLastSaved(new Date());
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [view, currentReportId, formData]);

  // Save when leaving editor
  const handleBackToDashboard = useCallback(() => {
    if (currentReportId) {
      const report = getReport(currentReportId);
      if (report) {
        report.formData = formData;
        saveReport(report);
      }
    }
    setView('dashboard');
    setCurrentReportId(null);
    setFormData(DEFAULT_FORM_DATA);
    setActiveStep(0);
    setGeneratedFiles(null);
    setError(null);
  }, [currentReportId, formData]);

  const handleOpenReport = (reportId: string) => {
    let report = getReport(reportId);

    // If report doesn't exist (new report), create it
    if (!report) {
      report = createNewReport();
      report.metadata.id = reportId;
      saveReport(report);
    }

    setCurrentReportId(reportId);
    setFormData(report.formData);
    setView('editor');
    setActiveStep(0);
  };

  const handleCreateReport = () => {
    const newReport = createNewReport();
    saveReport(newReport);
    handleOpenReport(newReport.metadata.id);
  };

  // Update form data handler - passed to ValuationForm
  const handleFormDataChange = useCallback((newData: Partial<ReportFormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleGenerate = async (data: ValuationReport) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedFiles(null);

    // Save before generating
    if (currentReportId) {
      const report = getReport(currentReportId);
      if (report) {
        report.formData = formData;
        saveReport(report);
      }
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const result = await response.json();
      setGeneratedFiles(result);

      // Mark report as concluded after successful generation
      if (currentReportId) {
        updateReportStatus(currentReportId, 'concluded');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadFile = (base64Data: string, filename: string, mimeType: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show Dashboard
  if (view === 'dashboard') {
    return (
      <Dashboard
        onOpenReport={handleOpenReport}
        onCreateReport={handleCreateReport}
      />
    );
  }

  // Show Editor
  return (
    <div className="flex min-h-screen bg-surface-50 text-text-primary">
      {/* Sidebar */}
      <aside className="w-80 border-r border-surface-200 bg-surface-100 flex flex-col fixed inset-y-0 z-50 h-screen hidden lg:flex">
        <div className="p-6 border-b border-surface-200">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white shadow-lg shadow-brand/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">Valuation Report</h1>
              <p className="text-xs text-text-tertiary">
                {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Auto-saving...'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-3 mb-3 mt-2">Report Sections</p>
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeStep === step.id
                  ? 'bg-surface-200 text-text-primary'
                  : 'text-text-secondary hover:bg-surface-200/50 hover:text-text-primary'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                activeStep === step.id ? 'bg-brand text-white shadow-md shadow-brand/20' : 'bg-surface-200 text-text-tertiary'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                </svg>
              </span>
              <span>{step.fullName}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-surface-200 space-y-3 bg-surface-100/50 backdrop-blur-md">
          {generatedFiles && (
            <div className="p-4 rounded-xl bg-surface-200/50 border border-surface-200 mb-4">
              <p className="text-xs font-semibold text-text-secondary mb-3 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Downloads Ready
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => downloadFile(generatedFiles.pdf!, 'Valuation_Report.pdf', 'application/pdf')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-100 border border-surface-200 text-xs font-medium text-text-secondary hover:border-red-500/30 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={isGenerating}
            className="w-full btn btn-primary"
          >
            {isGenerating ? (
               <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating...</span>
               </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-80 relative">
        {/* Header - Desktop Only */}
        <header className="hidden lg:block sticky top-0 z-40 bg-surface-50/80 backdrop-blur-xl border-b border-surface-200">
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">{steps[activeStep].fullName}</h2>
              <p className="text-sm text-text-tertiary mt-1">Step {activeStep + 1} of {steps.length}</p>
            </div>

            {generatedFiles && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Report Ready
              </span>
            )}
          </div>
        </header>

         {/* Mobile Header */}
         <div className="lg:hidden p-4 border-b border-surface-200 bg-surface-100/95 backdrop-blur-xl sticky top-0 z-40">
           <div className="flex items-center justify-between">
             <button
               onClick={handleBackToDashboard}
               className="flex items-center gap-2 text-text-secondary"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
               </svg>
             </button>
             <div className="text-center">
                <h1 className="text-base font-bold text-text-primary">{steps[activeStep].fullName}</h1>
                <p className="text-xs text-text-tertiary">Step {activeStep + 1} of {steps.length}</p>
             </div>
             {generatedFiles ? (
               <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 Ready
               </span>
             ) : (
               <div className="w-10" /> // Spacer
             )}
           </div>
         </div>

         {/* Mobile Bottom Navigation */}
         <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-100/95 backdrop-blur-xl border-t border-surface-200 safe-area-bottom">
           <div className="grid grid-cols-6 h-16">
             {steps.map((step) => (
               <button
                 key={step.id}
                 onClick={() => setActiveStep(step.id)}
                 className={`flex flex-col items-center justify-center gap-1 transition-all ${
                   activeStep === step.id
                     ? 'text-brand'
                     : 'text-text-tertiary'
                 }`}
               >
                 <svg className={`w-5 h-5 ${activeStep === step.id ? 'scale-110' : ''} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeStep === step.id ? 2.5 : 1.5}>
                   <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                 </svg>
                 <span className={`text-[10px] font-medium ${activeStep === step.id ? 'text-brand' : ''}`}>{step.name}</span>
               </button>
             ))}
           </div>
         </nav>

         {/* Mobile Floating Action Button */}
         <div className="lg:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
           {generatedFiles && (
             <div className="flex flex-col gap-2 animate-fade-in">
               <button
                 onClick={() => downloadFile(generatedFiles.pdf!, 'Valuation_Report.pdf', 'application/pdf')}
                 className="w-12 h-12 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 flex items-center justify-center"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
               </button>
             </div>
           )}
           <button
             onClick={() => {
               const form = document.querySelector('form');
               if (form) form.requestSubmit();
             }}
             disabled={isGenerating}
             className="w-14 h-14 rounded-full bg-brand text-white shadow-lg shadow-brand/30 flex items-center justify-center disabled:opacity-50"
           >
             {isGenerating ? (
               <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
               </svg>
             ) : (
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
               </svg>
             )}
           </button>
         </div>

        <div className="p-4 lg:p-8 pb-36 lg:pb-8 max-w-5xl mx-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-400">Error Generating Report</h3>
                <p className="text-sm text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          <ValuationForm
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            activeSection={activeStep}
            setActiveSection={setActiveStep}
            initialData={formData}
            onDataChange={handleFormDataChange}
          />

          {/* Desktop Navigation Footer */}
          <div className="nav-footer hidden lg:flex">
            <button
              type="button"
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="btn btn-ghost disabled:opacity-30 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous Step
            </button>

            <div className="nav-dots flex">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`nav-dot ${i === activeStep ? 'active' : ''}`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={activeStep === steps.length - 1}
              className="btn btn-ghost disabled:opacity-30 flex items-center gap-2"
            >
              Next Step
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Mobile Swipe Navigation */}
          <div className="lg:hidden flex justify-center gap-4 py-4">
            <button
              type="button"
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-200 text-text-secondary disabled:opacity-30 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
              disabled={activeStep === steps.length - 1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-200 text-text-secondary disabled:opacity-30 text-sm font-medium"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
