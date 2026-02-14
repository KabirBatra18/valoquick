'use client';

import React from 'react';
import { TemplateStyle, TEMPLATE_STYLES } from '@/types/branding';

interface TemplateSelectorProps {
  selected: TemplateStyle;
  onSelect: (style: TemplateStyle) => void;
  primaryColor?: string;
  compact?: boolean;
}

const TEMPLATE_ORDER: TemplateStyle[] = ['classic', 'modern', 'elegant', 'boldCorporate', 'minimal'];

const COMPACT_NAMES: Record<TemplateStyle, string> = {
  classic: 'Classic',
  modern: 'Modern',
  elegant: 'Elegant',
  boldCorporate: 'Bold',
  minimal: 'Minimal',
};

export default function TemplateSelector({
  selected,
  onSelect,
  primaryColor = '#1a5276',
  compact = false,
}: TemplateSelectorProps) {
  if (compact) {
    return (
      <div className="flex gap-2">
        {TEMPLATE_ORDER.map((style) => {
          const isSelected = selected === style;
          return (
            <button
              key={style}
              onClick={() => onSelect(style)}
              className={`relative flex-1 min-w-0 rounded-lg border-2 transition-all overflow-hidden ${
                isSelected
                  ? 'border-brand ring-1 ring-brand/20'
                  : 'border-surface-200 hover:border-surface-300'
              }`}
            >
              <div className="bg-white" style={{ height: 44 }}>
                <CompactTemplateIcon style={style} color={primaryColor} />
              </div>
              <div
                className={`py-1 text-[10px] font-medium text-center ${
                  isSelected ? 'text-brand bg-brand/5' : 'text-text-tertiary'
                }`}
              >
                {COMPACT_NAMES[style]}
              </div>
              {isSelected && (
                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-brand rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // Full card grid (for onboarding)
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
            <div
              className="bg-white rounded-lg mb-3 overflow-hidden border border-gray-200"
              style={{ height: '110px' }}
            >
              <FullTemplatePreview style={style} color={primaryColor} />
            </div>

            <h3 className={`font-semibold text-sm ${isSelected ? 'text-brand' : 'text-text-primary'}`}>
              {meta.name}
            </h3>
            <p className="text-text-tertiary text-xs mt-1 leading-relaxed">{meta.description}</p>

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

// ── Compact schematic icons (for strip view in settings) ──

function CompactTemplateIcon({ style, color }: { style: TemplateStyle; color: string }) {
  switch (style) {
    case 'classic':
      return (
        <div className="h-full flex flex-col justify-between p-2">
          <div className="flex justify-between">
            <div>
              <div style={{ width: 28, height: 3, backgroundColor: color, borderRadius: 1 }} />
              <div style={{ width: 20, height: 1.5, backgroundColor: '#ccc', borderRadius: 1, marginTop: 2 }} />
              <div style={{ width: 24, height: 1.5, backgroundColor: '#ccc', borderRadius: 1, marginTop: 1.5 }} />
            </div>
            <div className="flex flex-col items-end">
              <div style={{ width: 16, height: 2.5, backgroundColor: '#888', borderRadius: 1 }} />
              <div style={{ width: 12, height: 1.5, backgroundColor: '#ccc', borderRadius: 1, marginTop: 1.5 }} />
            </div>
          </div>
          <div style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
        </div>
      );

    case 'modern':
      return (
        <div className="h-full flex" style={{ borderLeft: `3px solid ${color}` }}>
          <div className="p-2 flex-1">
            <div style={{ width: 30, height: 3, backgroundColor: color, borderRadius: 1 }} />
            <div
              style={{
                width: 22,
                height: 1.5,
                backgroundColor: '#bbb',
                borderRadius: 1,
                marginTop: 3,
              }}
            />
            <div className="flex gap-1 mt-1.5">
              <div
                style={{
                  width: 14,
                  height: 5,
                  backgroundColor: `${color}15`,
                  border: `1px solid ${color}40`,
                  borderRadius: 4,
                }}
              />
              <div
                style={{
                  width: 14,
                  height: 5,
                  backgroundColor: `${color}15`,
                  border: `1px solid ${color}40`,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </div>
      );

    case 'elegant':
      return (
        <div className="h-full flex flex-col justify-center px-2">
          <div style={{ borderTop: `1px solid ${color}`, borderBottom: `1px solid ${color}`, padding: '2px 0' }}>
            <div
              style={{
                borderTop: `1px solid ${color}`,
                borderBottom: `1px solid ${color}`,
                padding: '4px 3px',
                textAlign: 'center',
              }}
            >
              <div style={{ width: 26, height: 3, backgroundColor: color, borderRadius: 1, margin: '0 auto' }} />
              <div
                style={{
                  width: 18,
                  height: 1.5,
                  backgroundColor: '#bbb',
                  borderRadius: 1,
                  margin: '2px auto 0',
                }}
              />
            </div>
          </div>
        </div>
      );

    case 'boldCorporate':
      return (
        <div className="h-full flex flex-col">
          <div
            style={{
              backgroundColor: color,
              padding: '6px 8px',
              flex: '0 0 60%',
            }}
          >
            <div
              style={{
                width: 28,
                height: 3,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 1,
              }}
            />
            <div
              style={{
                width: 20,
                height: 1.5,
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderRadius: 1,
                marginTop: 2,
              }}
            />
          </div>
          <div className="flex-1 p-1.5">
            <div
              style={{
                width: '50%',
                height: 1.5,
                backgroundColor: '#ddd',
                borderRadius: 1,
                margin: '2px auto',
              }}
            />
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className="h-full flex flex-col p-2">
          <div
            className="flex items-center gap-1"
            style={{ borderBottom: '1px solid #eee', paddingBottom: 4 }}
          >
            <div style={{ width: 8, height: 8, backgroundColor: '#e5e5e5', borderRadius: 2 }} />
            <div style={{ width: 24, height: 2.5, backgroundColor: '#999', borderRadius: 1 }} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: '40%', height: 1.5, backgroundColor: '#e5e5e5', borderRadius: 1 }} />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ── Full realistic previews (for card view in onboarding) ──

function FullTemplatePreview({ style, color }: { style: TemplateStyle; color: string }) {
  const firmName = 'Sharma & Associates';
  const subtitle = 'Architects, Engineers & Valuers';
  const address = '12/4 Rajouri Garden, New Delhi';
  const contact = 'Mob: 9876543210';
  const valuerName = 'Ar. Rajesh Sharma';
  const valuerQual = 'B.Arch, M.Plan';

  const bodyLines = (
    <div style={{ padding: '0 8px', marginTop: 4 }}>
      <div
        style={{ width: '55%', height: 2, backgroundColor: '#d4d4d4', borderRadius: 1, margin: '0 auto' }}
      />
      <div
        style={{
          width: '40%',
          height: 2,
          backgroundColor: '#d4d4d4',
          borderRadius: 1,
          margin: '3px auto 0',
        }}
      />
    </div>
  );

  switch (style) {
    case 'classic':
      return (
        <div
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '8px 8px 6px',
            }}
          >
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
        <div
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              borderLeft: `3px solid ${color}`,
              margin: '8px 8px 0',
              paddingLeft: 8,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: 0.3, lineHeight: 1.1 }}>
                {firmName}
              </div>
              <div
                style={{
                  fontSize: 4.5,
                  color: '#888',
                  marginTop: 2,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 0.8,
                }}
              >
                {subtitle}
              </div>
              <div style={{ fontSize: 5, color: '#666', marginTop: 2 }}>{address}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
              <div style={{ fontSize: 6, fontWeight: 600, color: '#333' }}>{valuerName}</div>
              <div style={{ display: 'flex', gap: 2, marginTop: 2, justifyContent: 'flex-end' }}>
                <span
                  style={{
                    fontSize: 4,
                    padding: '1px 4px',
                    borderRadius: 6,
                    backgroundColor: `${color}15`,
                    border: `1px solid ${color}40`,
                    color,
                  }}
                >
                  {valuerQual}
                </span>
              </div>
            </div>
          </div>
          {bodyLines}
        </div>
      );

    case 'elegant':
      return (
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              borderTop: `1px solid ${color}`,
              borderBottom: `1px solid ${color}`,
              margin: '6px 8px 0',
              padding: '2px 0',
            }}
          >
            <div
              style={{
                borderTop: `1px solid ${color}`,
                borderBottom: `1px solid ${color}`,
                padding: '5px 6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontVariant: 'small-caps',
                    letterSpacing: 1.5,
                    color,
                    lineHeight: 1.1,
                  }}
                >
                  {firmName}
                </div>
                <div style={{ fontSize: 5.5, fontStyle: 'italic', color: '#555', marginTop: 1 }}>
                  {subtitle}
                </div>
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
        <div
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              backgroundColor: color,
              padding: '7px 8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 900,
                  color: '#fff',
                  textTransform: 'uppercase' as const,
                  letterSpacing: 0.5,
                  lineHeight: 1.1,
                }}
              >
                {firmName}
              </div>
              <div
                style={{
                  fontSize: 4.5,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 2,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 1,
                }}
              >
                {subtitle}
              </div>
              <div style={{ fontSize: 4.5, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{address}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
              <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                {valuerName}
              </div>
              <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.7)' }}>{valuerQual}</div>
            </div>
          </div>
          {bodyLines}
        </div>
      );

    case 'minimal':
      return (
        <div
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 8px 6px',
              borderBottom: '1px solid #eee',
            }}
          >
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
