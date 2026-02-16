'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

interface ReportEditorProps {
  html: string;
  onExportPdf: (html: string) => void;
  onBack: () => void;
  isExporting: boolean;
}

const A4_WIDTH_PX = 794; // 210mm at 96dpi

export default function ReportEditor({ html, onExportPdf, onBack, isExporting }: ReportEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [iframeHeight, setIframeHeight] = useState(1122); // A4 default

  // Keep ref in sync for use inside iframe event handlers
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Responsive scale — fit A4 content to available width
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const update = () => {
      // Match the Tailwind padding on the inner wrapper: p-3 / sm:p-6 / lg:p-8
      const vw = el.clientWidth;
      const pad = vw < 640 ? 24 : vw < 1024 ? 48 : 64; // total horizontal padding (both sides)
      setScale(Math.max(0.65, Math.min(1, (vw - pad) / A4_WIDTH_PX)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateIframeHeight = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) {
      setIframeHeight(doc.body.scrollHeight + 40);
    }
  }, []);

  const setupEditableContent = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Mark text elements as editable
    const selectors = [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'td', 'th', 'span', 'li', 'strong', 'em',
      '.title', '.section-title', '.calculation-line',
      '.final-value', '.value-words',
    ].join(', ');

    doc.querySelectorAll(selectors).forEach((el) => {
      const htmlEl = el as HTMLElement;

      // Skip images and photo containers
      if (htmlEl.querySelector('img') || htmlEl.tagName === 'IMG') return;
      if (htmlEl.closest('.photo-grid') || htmlEl.closest('.photo-item') || htmlEl.closest('.cover-photo')) return;

      // Skip elements without direct text
      const hasText = Array.from(htmlEl.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
      );
      if (!hasText && !['TD', 'TH'].includes(htmlEl.tagName)) return;

      htmlEl.contentEditable = 'true';
    });

    // All visual styles in the stylesheet — no inline style pollution
    const style = doc.createElement('style');
    style.setAttribute('data-editor', 'true');
    style.textContent = `
      [contenteditable="true"] {
        outline: none;
        cursor: text;
        -webkit-user-select: text;
        -webkit-tap-highlight-color: rgba(99, 102, 241, 0.12);
        border-radius: 2px;
      }
      @media (hover: hover) {
        [contenteditable="true"]:hover {
          outline: 1px dashed rgba(99, 102, 241, 0.4) !important;
          outline-offset: 2px;
        }
      }
      [contenteditable="true"]:active {
        outline: 2px solid rgba(99, 102, 241, 0.5) !important;
        outline-offset: 2px;
      }
      [contenteditable="true"]:focus {
        outline: 2px solid rgba(99, 102, 241, 0.6) !important;
        outline-offset: 2px;
        background-color: rgba(99, 102, 241, 0.05);
      }
    `;
    doc.head.appendChild(style);

    // Scroll focused element into view (handles virtual keyboard on mobile)
    doc.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      if (target.contentEditable !== 'true') return;

      setTimeout(() => {
        const scrollArea = scrollAreaRef.current;
        const iframe = iframeRef.current;
        if (!scrollArea || !iframe) return;

        // Get element position inside iframe (unscaled coordinates)
        let top = 0;
        let el: HTMLElement | null = target;
        while (el && el !== doc.body) {
          top += el.offsetTop;
          el = el.offsetParent as HTMLElement | null;
        }

        // Map to outer container scroll position (accounting for scale + padding)
        const s = scaleRef.current;
        const pad = scrollArea.clientWidth < 640 ? 12 : scrollArea.clientWidth < 1024 ? 24 : 32;
        const scaledTop = pad + top * s;

        scrollArea.scrollTo({
          top: Math.max(0, scaledTop - scrollArea.clientHeight / 3),
          behavior: 'smooth',
        });
      }, 350); // delay for virtual keyboard animation
    });

    updateIframeHeight();

    // Re-measure on content edits
    const mo = new MutationObserver(updateIframeHeight);
    mo.observe(doc.body, { childList: true, subtree: true, characterData: true });
  }, [updateIframeHeight]);

  // Clone-based export — never mutate the live DOM
  const getEditedHtml = useCallback((): string => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return html;

    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('style[data-editor]').forEach((el) => el.remove());

    return `<!DOCTYPE html>\n${clone.outerHTML}`;
  }, [html]);

  const handleExport = () => {
    onExportPdf(getEditedHtml());
  };

  const scaledHeight = iframeHeight * scale;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 bg-surface-100 border-b border-surface-200 shrink-0 gap-2">
        <button
          onClick={onBack}
          disabled={isExporting}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-text-secondary hover:text-text-primary hover:bg-surface-200 rounded-lg transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back to Form</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Undo button */}
          <button
            type="button"
            onClick={() => iframeRef.current?.contentDocument?.execCommand('undo')}
            className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-200 transition-colors"
            title="Undo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
            </svg>
          </button>
          <div className="text-text-tertiary text-[11px] sm:text-sm flex items-center gap-1">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="hidden sm:inline">Click any text to edit</span>
            <span className="sm:hidden">Tap to edit</span>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium bg-brand hover:bg-brand/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Export overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 rounded-2xl p-6 text-center shadow-2xl border border-surface-200 max-w-xs w-full">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-brand/10 flex items-center justify-center">
              <div className="w-6 h-6 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Exporting PDF</p>
            <p className="text-xs text-text-tertiary mt-1">This may take 15–30 seconds</p>
          </div>
        </div>
      )}

      {/* Editor area — scrollable, with scaled A4 paper */}
      <div ref={scrollAreaRef} className="flex-1 overflow-auto" style={{ touchAction: 'manipulation' }}>
        <div className="p-3 sm:p-6 lg:p-8">
          {/* Sizer: correct visual dimensions for scrollable area */}
          <div
            className="mx-auto"
            style={{
              width: A4_WIDTH_PX * scale,
              minHeight: scaledHeight,
            }}
          >
            {/* Scaled paper: renders at full A4 width, visually scaled */}
            <div
              className="bg-white shadow-2xl"
              style={{
                width: A4_WIDTH_PX,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={html}
                className="border-0 block"
                style={{ width: A4_WIDTH_PX, height: iframeHeight }}
                sandbox="allow-same-origin"
                onLoad={setupEditableContent}
                title="Report editor"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
