'use client';

import React, { useMemo } from 'react';
import { FirmBranding, ValuerInfo } from '@/types/branding';
import { getTemplateCSS, renderHeader } from '@/lib/pdf-templates';

interface HeaderPreviewProps {
  branding: FirmBranding;
  valuerInfo?: ValuerInfo;
}

const DEFAULT_VALUER: ValuerInfo = {
  name: 'VALUER NAME',
  qualification: 'Qualification',
  designation: 'Govt. Approved Valuer',
  categoryNo: 'CAT-I/000/000/0000',
};

export default function HeaderPreview({ branding, valuerInfo = DEFAULT_VALUER }: HeaderPreviewProps) {
  const html = useMemo(() => {
    const css = getTemplateCSS(branding);
    const header = renderHeader(branding, valuerInfo, branding.logoUrl);
    return `
      <!DOCTYPE html>
      <html>
      <head><style>${css} body { padding: 10px; }</style></head>
      <body>${header}</body>
      </html>
    `;
  }, [branding, valuerInfo]);

  return (
    <div className="rounded-lg border border-surface-200 overflow-hidden bg-white">
      <iframe
        srcDoc={html}
        className="w-full border-0"
        style={{ height: '120px', pointerEvents: 'none' }}
        title="Header preview"
      />
    </div>
  );
}
