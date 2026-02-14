'use client';

import React, { useMemo } from 'react';
import { FirmBranding } from '@/types/branding';
import { getTemplateCSS, renderFooter } from '@/lib/pdf-templates';

interface FooterPreviewProps {
  branding: FirmBranding;
}

export default function FooterPreview({ branding }: FooterPreviewProps) {
  const html = useMemo(() => {
    const css = getTemplateCSS(branding);
    const footer = renderFooter(branding);
    if (!footer) return null;
    return `
      <!DOCTYPE html>
      <html>
      <head><style>${css} body { padding: 10px; } .page-number::after { content: "3"; }</style></head>
      <body>${footer}</body>
      </html>
    `;
  }, [branding]);

  if (!html) {
    return (
      <div className="rounded-lg border border-surface-200 overflow-hidden">
        <div className="px-3 py-1.5 bg-surface-200/50 border-b border-surface-200">
          <span className="text-text-tertiary text-xs font-medium">Footer Preview</span>
        </div>
        <div className="p-4 text-text-tertiary text-xs text-center">
          Footer is disabled
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-200 overflow-hidden bg-white">
      <div className="px-3 py-1.5 bg-surface-200/50 border-b border-surface-200">
        <span className="text-text-tertiary text-xs font-medium">Footer Preview</span>
      </div>
      <iframe
        srcDoc={html}
        className="w-full border-0"
        style={{ height: '60px', pointerEvents: 'none' }}
        title="Footer preview"
      />
    </div>
  );
}
