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
            <div className="bg-white rounded-lg mb-3 overflow-hidden border border-gray-200" style={{ height: '110px' }}>
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

// Realistic miniature header preview for each template style
function TemplatePreviewThumb({ style, color }: { style: TemplateStyle; color: string }) {
  const firmName = 'Sharma & Associates';
  const subtitle = 'Architects, Engineers & Valuers';
  const address = '12/4 Rajouri Garden, New Delhi';
  const contact = 'Mob: 9876543210';
  const valuerName = 'Ar. Rajesh Sharma';
  const valuerQual = 'B.Arch, M.Plan';

  const bodyLines = (
    <div style={{ padding: '0 8px', marginTop: 4 }}>
      <div style={{ width: '55%', height: 2, backgroundColor: '#d4d4d4', borderRadius: 1, margin: '0 auto' }} />
      <div style={{ width: '40%', height: 2, backgroundColor: '#d4d4d4', borderRadius: 1, margin: '3px auto 0' }} />
    </div>
  );

  switch (style) {
    case 'classic':
      return (
        <div style={{ fontFamily: "'Times New Roman', Times, serif", height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 8px 6px' }}>
            <div style={{ flex: 1, color }}>
              <div style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.1 }}>{firmName}</div>
              <div style={{ fontSize: 5.5, color: '#555', marginTop: 1 }}>{subtitle}</div>
              <div style={{ fontSize: 5, color: '#666', marginTop: 1 }}>{address}</div>
              <div style={{ fontSize: 5, color: '#666' }}>{contact}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
              <div style={{ fontSize: 6, fontWeight: 600, color: '#333' }}>{valuerName}</div>
              <div style={{ fontSize: 5, color: '#666' }}>{valuerQual}</div>
            </div>
          </div>
          <div style={{ height: 2, backgroundColor: color, margin: '0 8px' }} />
          {bodyLines}
        </div>
      );

    case 'modern':
      return (
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', borderLeft: `3px solid ${color}`, margin: '8px 8px 0', paddingLeft: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: 0.3, lineHeight: 1.1 }}>{firmName}</div>
              <div style={{ fontSize: 4.5, color: '#888', marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: 0.8 }}>{subtitle}</div>
              <div style={{ fontSize: 5, color: '#666', marginTop: 2 }}>{address}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
              <div style={{ fontSize: 6, fontWeight: 600, color: '#333' }}>{valuerName}</div>
              <div style={{ display: 'flex', gap: 2, marginTop: 2, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 4, padding: '1px 4px', borderRadius: 6, backgroundColor: `${color}15`, border: `1px solid ${color}40`, color }}>{valuerQual}</span>
              </div>
            </div>
          </div>
          {bodyLines}
        </div>
      );

    case 'elegant':
      return (
        <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderTop: `1px solid ${color}`, borderBottom: `1px solid ${color}`, margin: '6px 8px 0', padding: '2px 0' }}>
            <div style={{ borderTop: `1px solid ${color}`, borderBottom: `1px solid ${color}`, padding: '5px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, fontVariant: 'small-caps', letterSpacing: 1.5, color, lineHeight: 1.1 }}>{firmName}</div>
                <div style={{ fontSize: 5.5, fontStyle: 'italic', color: '#555', marginTop: 1 }}>{subtitle}</div>
                <div style={{ fontSize: 4.5, color: '#666', marginTop: 1 }}>{address}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
                <div style={{ fontSize: 6, fontWeight: 600, color: '#444' }}>{valuerName}</div>
                <div style={{ fontSize: 5, color: '#666' }}>{valuerQual}</div>
              </div>
            </div>
          </div>
          {bodyLines}
        </div>
      );

    case 'boldCorporate':
      return (
        <div style={{ fontFamily: "Arial, Helvetica, sans-serif", height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: color, padding: '7px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#fff', textTransform: 'uppercase' as const, letterSpacing: 0.5, lineHeight: 1.1 }}>{firmName}</div>
              <div style={{ fontSize: 4.5, color: 'rgba(255,255,255,0.7)', marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: 1 }}>{subtitle}</div>
              <div style={{ fontSize: 4.5, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{address}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
              <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{valuerName}</div>
              <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.7)' }}>{valuerQual}</div>
            </div>
          </div>
          {bodyLines}
        </div>
      );

    case 'minimal':
      return (
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 8px 6px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 14, height: 14, backgroundColor: '#e5e5e5', borderRadius: 3 }} />
              <div style={{ fontSize: 8, fontWeight: 500, color: '#333' }}>{firmName}</div>
            </div>
            <div style={{ fontSize: 5, color: '#999' }}>{valuerName}</div>
          </div>
          {bodyLines}
        </div>
      );

    default:
      return null;
  }
}
