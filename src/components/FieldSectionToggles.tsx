'use client';

import { useState, useMemo } from 'react';
import { FIELD_SECTIONS } from '@/types/fields';

interface FieldSectionTogglesProps {
  hiddenFields: string[];
  onToggle: (fieldKey: string) => void;
  onToggleSection: (sectionName: string, hide: boolean) => void;
}

export default function FieldSectionToggles({
  hiddenFields,
  onToggle,
  onToggleSection,
}: FieldSectionTogglesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const sections = useMemo(() => {
    return Object.entries(FIELD_SECTIONS).map(([sectionName, fields]) => {
      const fieldEntries = Object.entries(fields).filter(
        ([, label]) => !searchQuery || label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const totalInSection = Object.keys(fields).length;
      const visibleCount = totalInSection - Object.keys(fields).filter(k => hiddenFields.includes(k)).length;
      return { sectionName, fields: fieldEntries, totalInSection, visibleCount };
    }).filter(s => s.fields.length > 0);
  }, [hiddenFields, searchQuery]);

  const toggleExpanded = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    );
  };

  const totalFields = Object.values(FIELD_SECTIONS).reduce((sum, s) => sum + Object.keys(s).length, 0);
  const totalVisible = totalFields - hiddenFields.length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-text-tertiary px-1">
        <span>{totalVisible} of {totalFields} fields visible</span>
        <span>{hiddenFields.length} hidden</span>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface-200 border border-surface-300 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
        />
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map(({ sectionName, fields, totalInSection, visibleCount }) => {
          const isExpanded = expandedSections.includes(sectionName) || !!searchQuery;
          const allVisible = visibleCount === totalInSection;

          return (
            <div key={sectionName} className="border border-surface-200 rounded-xl overflow-hidden">
              {/* Section header */}
              <button
                type="button"
                onClick={() => toggleExpanded(sectionName)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-200/50 transition-colors"
              >
                <svg
                  className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-medium text-text-primary flex-1 text-left">{sectionName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  allVisible ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {visibleCount}/{totalInSection}
                </span>
                {/* Section toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSection(sectionName, allVisible); // hide all if all visible, show all if some hidden
                  }}
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                    allVisible
                      ? 'bg-surface-200 text-text-tertiary hover:bg-surface-300'
                      : 'bg-brand/10 text-brand hover:bg-brand/20'
                  }`}
                >
                  {allVisible ? 'Hide All' : 'Show All'}
                </button>
              </button>

              {/* Fields */}
              {isExpanded && (
                <div className="px-4 pb-3 space-y-1">
                  {fields.map(([fieldKey, label]) => {
                    const isVisible = !hiddenFields.includes(fieldKey);
                    return (
                      <label
                        key={fieldKey}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isVisible
                            ? 'hover:bg-surface-200/50'
                            : 'bg-surface-200/30 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => onToggle(fieldKey)}
                          className="w-4 h-4 rounded border-surface-300"
                          style={{ accentColor: '#6366f1' }}
                        />
                        <span className="text-sm text-text-primary">{label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
