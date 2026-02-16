'use client';

import React from 'react';

interface BrandingColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  { hex: '#1a5276', name: 'Navy' },
  { hex: '#1e3a5f', name: 'Dark Blue' },
  { hex: '#2c3e50', name: 'Charcoal' },
  { hex: '#7b2d26', name: 'Maroon' },
  { hex: '#1a6b3c', name: 'Forest' },
  { hex: '#117a65', name: 'Teal' },
  { hex: '#5b2c6f', name: 'Purple' },
  { hex: '#d35400', name: 'Orange' },
  { hex: '#b7950b', name: 'Gold' },
  { hex: '#000000', name: 'Black' },
];

export default function BrandingColorPicker({ color, onChange }: BrandingColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            onClick={() => onChange(preset.hex)}
            className={`w-8 h-8 rounded-lg border-2 transition-all duration-150 ${
              color === preset.hex
                ? 'border-brand scale-110 ring-2 ring-brand/30'
                : 'border-surface-300 hover:scale-105'
            }`}
            style={{ backgroundColor: preset.hex }}
            title={preset.name}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-text-tertiary text-xs">Custom:</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-lg border border-surface-300 cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                onChange(val);
              }
            }}
            className="w-24 px-2 py-1 text-xs font-mono bg-surface-100 border border-surface-200 rounded-lg text-text-primary focus:border-brand focus:outline-none"
            placeholder="#1a5276"
          />
        </div>
      </div>
    </div>
  );
}
