'use client';

import React from 'react';
import { TemplateStyle, TEMPLATE_STYLES } from '@/types/branding';

interface TemplateSelectorProps {
  selected: TemplateStyle;
  onSelect: (style: TemplateStyle) => void;
  primaryColor?: string;
}

const TEMPLATE_ORDER: TemplateStyle[] = ['classic', 'modern', 'elegant', 'boldCorporate', 'minimal'];

export default function TemplateSelector({ selected, onSelect, primaryColor = '#1a5276' }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
      {TEMPLATE_ORDER.map((style) => {
        const meta = TEMPLATE_STYLES[style];
        const isSelected = selected === style;
        return (
          <button
            key={style}
            onClick={() => onSelect(style)}
            className={`relative p-3 lg:p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              isSelected
                ? 'border-brand bg-brand/10 ring-2 ring-brand/30'
                : 'border-surface-200 hover:border-surface-300 bg-surface-100'
            }`}
          >
            {/* Mini preview */}
            <div className="bg-white rounded-lg mb-3 overflow-hidden border border-gray-200" style={{ height: '80px' }}>
              <TemplatePreviewThumb style={style} color={primaryColor} />
            </div>

            <h3 className={`font-semibold text-sm ${isSelected ? 'text-brand' : 'text-text-primary'}`}>
              {meta.name}
            </h3>
            <p className="text-text-tertiary text-xs mt-1 leading-relaxed">
              {meta.description}
            </p>

            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Mini visual thumbnail for each template style
function TemplatePreviewThumb({ style, color }: { style: TemplateStyle; color: string }) {
  const barHeight = 3;
  const lineColor = '#ccc';

  switch (style) {
    case 'classic':
      return (
        <div className="p-2 h-full flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div style={{ width: 50, height: 6, backgroundColor: color, borderRadius: 2 }} />
              <div style={{ width: 70, height: 3, backgroundColor: lineColor, borderRadius: 1, marginTop: 2 }} />
              <div style={{ width: 55, height: 3, backgroundColor: lineColor, borderRadius: 1, marginTop: 1 }} />
            </div>
            <div className="text-right">
              <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 1, marginLeft: 'auto' }} />
              <div style={{ width: 35, height: 3, backgroundColor: lineColor, borderRadius: 1, marginTop: 1, marginLeft: 'auto' }} />
            </div>
          </div>
          <div style={{ width: '100%', height: 2, backgroundColor: color, marginTop: 2 }} />
          <div className="flex-1 mt-2">
            <div style={{ width: '60%', height: 3, backgroundColor: lineColor, borderRadius: 1, margin: '0 auto' }} />
            <div style={{ width: '40%', height: 3, backgroundColor: lineColor, borderRadius: 1, margin: '3px auto 0' }} />
          </div>
        </div>
      );

    case 'modern':
      return (
        <div className="p-2 h-full flex flex-col">
          <div className="flex" style={{ borderLeft: `3px solid ${color}`, paddingLeft: 6 }}>
            <div className="flex-1">
              <div style={{ width: 55, height: 7, backgroundColor: color, borderRadius: 2 }} />
              <div style={{ width: 70, height: 2, backgroundColor: lineColor, borderRadius: 1, marginTop: 3, letterSpacing: 1 }} />
            </div>
            <div className="text-right">
              <div style={{ width: 30, height: 4, backgroundColor: '#333', borderRadius: 1, marginLeft: 'auto' }} />
              <div className="flex gap-1 mt-1 justify-end">
                <div style={{ width: 22, height: 8, backgroundColor: `${color}20`, border: `1px solid ${color}40`, borderRadius: 6 }} />
                <div style={{ width: 22, height: 8, backgroundColor: `${color}20`, border: `1px solid ${color}40`, borderRadius: 6 }} />
              </div>
            </div>
          </div>
          <div className="flex-1 mt-3">
            <div style={{ width: '60%', height: 3, backgroundColor: lineColor, borderRadius: 1, margin: '0 auto' }} />
          </div>
        </div>
      );

    case 'elegant':
      return (
        <div className="p-2 h-full flex flex-col">
          <div style={{ borderTop: `1px solid ${color}`, borderBottom: `1px solid ${color}`, padding: '4px 0' }}>
            <div style={{ borderTop: `1px solid ${color}`, borderBottom: `1px solid ${color}`, padding: '3px 0' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div style={{ width: 50, height: 6, backgroundColor: color, borderRadius: 2, fontVariant: 'small-caps' }} />
                  <div style={{ width: 60, height: 3, backgroundColor: lineColor, borderRadius: 1, marginTop: 2, fontStyle: 'italic' }} />
                </div>
                <div className="text-right">
                  <div style={{ width: 35, height: 4, backgroundColor: '#444', borderRadius: 1, marginLeft: 'auto' }} />
                  <div style={{ width: 30, height: 3, backgroundColor: lineColor, borderRadius: 1, marginTop: 1, marginLeft: 'auto' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 mt-2">
            <div style={{ width: '50%', height: 3, backgroundColor: lineColor, borderRadius: 1, margin: '0 auto' }} />
          </div>
        </div>
      );

    case 'boldCorporate':
      return (
        <div className="h-full flex flex-col">
          <div style={{ backgroundColor: color, padding: '6px 8px', borderRadius: '4px 4px 0 0' }}>
            <div className="flex justify-between items-start">
              <div>
                <div style={{ width: 55, height: 7, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 2 }} />
                <div style={{ width: 70, height: 2, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 1, marginTop: 2 }} />
              </div>
              <div className="text-right">
                <div style={{ width: 35, height: 4, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 1, marginLeft: 'auto' }} />
                <div style={{ width: 30, height: 3, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 1, marginTop: 1, marginLeft: 'auto' }} />
              </div>
            </div>
          </div>
          <div className="flex-1 p-2">
            <div style={{ width: '60%', height: 3, backgroundColor: lineColor, borderRadius: 1, margin: '4px auto 0' }} />
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className="p-2 h-full flex flex-col">
          <div className="flex justify-between items-center pb-1" style={{ borderBottom: `1px solid #eee` }}>
            <div className="flex items-center gap-1">
              <div style={{ width: 12, height: 12, backgroundColor: '#ddd', borderRadius: 3 }} />
              <div style={{ width: 40, height: 5, backgroundColor: '#555', borderRadius: 1 }} />
            </div>
            <div style={{ width: 25, height: barHeight, backgroundColor: '#bbb', borderRadius: 1 }} />
          </div>
          <div className="flex-1 mt-2">
            <div style={{ width: '50%', height: 3, backgroundColor: lineColor, borderRadius: 1, margin: '0 auto' }} />
          </div>
        </div>
      );

    default:
      return null;
  }
}
