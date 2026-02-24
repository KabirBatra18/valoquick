'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirmTemplate } from '@/types/report';
import { FIELD_SECTIONS } from '@/types/fields';
import FieldSectionToggles from './FieldSectionToggles';

const TEMPLATE_EMOJIS = ['📋', '🏦', '🏠', '📑', '🏢', '💰', '📊', '🏗️', '🔑', '📝', '🏘️', '💳', '🏛️', '📄', '🔍', '⚖️', '✈️', '🏥', '🎓', '⚡'];

interface TemplateBuilderModalProps {
  editingTemplate?: FirmTemplate | null;
  onSave: (data: { name: string; subtitle: string; icon: string; purpose?: string; bankName?: string; hiddenFields: string[] }) => Promise<void>; // subtitle kept for data compat
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export default function TemplateBuilderModal({
  editingTemplate,
  onSave,
  onDelete,
  onClose,
}: TemplateBuilderModalProps) {
  const isEditing = !!editingTemplate;

  const [name, setName] = useState(editingTemplate?.name || '');
  const [icon, setIcon] = useState(editingTemplate?.icon || '📋');
  const [purpose, setPurpose] = useState(editingTemplate?.purpose || '');
  const [bankName, setBankName] = useState(editingTemplate?.bankName || '');
  const [hiddenFields, setHiddenFields] = useState<string[]>(editingTemplate?.hiddenFields || []);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleToggleField = useCallback((fieldKey: string) => {
    setHiddenFields(prev =>
      prev.includes(fieldKey) ? prev.filter(f => f !== fieldKey) : [...prev, fieldKey]
    );
  }, []);

  const handleToggleSection = useCallback((sectionName: string, hide: boolean) => {
    const sectionFields = Object.keys(FIELD_SECTIONS[sectionName] || {});
    setHiddenFields(prev => {
      if (hide) {
        // Add all section fields to hidden
        return [...new Set([...prev, ...sectionFields])];
      } else {
        // Remove all section fields from hidden
        return prev.filter(f => !sectionFields.includes(f));
      }
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        subtitle: '',
        icon,
        purpose: purpose.trim() || undefined,
        bankName: bankName.trim() || undefined,
        hiddenFields,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
    } finally {
      setSaving(false);
    }
  };

  const totalFields = Object.values(FIELD_SECTIONS).reduce((sum, s) => sum + Object.keys(s).length, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-surface-100 sm:rounded-2xl rounded-t-2xl w-full sm:max-w-xl max-h-[92vh] overflow-hidden flex flex-col border-t sm:border border-surface-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-surface-200 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {isEditing ? 'Edit Template' : 'Create Template'}
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                Configure which fields appear in reports
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* Section 1: Template Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">1</span>
                Template Info
              </h3>

              {/* Name + Emoji */}
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-12 h-12 rounded-xl bg-surface-200 border border-surface-300 hover:border-brand/50 flex items-center justify-center text-2xl transition-colors"
                  >
                    {icon}
                  </button>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                      <div className="absolute top-full left-0 mt-2 z-20 bg-surface-100 border border-surface-200 rounded-xl shadow-xl p-2 grid grid-cols-5 gap-1 w-[180px]">
                        {TEMPLATE_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => { setIcon(emoji); setShowEmojiPicker(false); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-surface-200 transition-colors ${icon === emoji ? 'bg-brand/10 ring-1 ring-brand' : ''}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name *"
                  className="flex-1 px-4 py-3 bg-surface-200 border border-surface-300 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Default bank name"
                  className="px-4 py-3 bg-surface-200 border border-surface-300 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
                />
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Default purpose"
                  className="px-4 py-3 bg-surface-200 border border-surface-300 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Section 2: Field Visibility */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">2</span>
                Field Visibility
              </h3>

              <FieldSectionToggles
                hiddenFields={hiddenFields}
                onToggle={handleToggleField}
                onToggleSection={handleToggleSection}
              />
            </div>

            {/* Section 3: Preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">3</span>
                Preview
              </h3>
              <div className="p-4 rounded-xl bg-surface-200/50 border border-surface-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {name || 'Template Name'}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {purpose || bankName || 'Custom template'}
                    </p>
                    {bankName && (
                      <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 bg-brand/10 text-brand rounded-full font-medium">
                        {bankName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-surface-300 flex items-center gap-3 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {totalFields - hiddenFields.length} visible
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                    {hiddenFields.length} hidden
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-surface-200 shrink-0">
            <div className="flex gap-2">
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving}
                  className="px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 bg-surface-200 text-text-secondary rounded-xl text-sm font-medium hover:bg-surface-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center p-4 rounded-2xl">
              <div className="bg-surface-100 rounded-xl p-5 max-w-xs w-full text-center shadow-xl border border-surface-200">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-text-primary">Delete this template?</p>
                <p className="text-xs text-text-tertiary mt-1">Existing reports using it will not be affected.</p>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-2 bg-surface-200 rounded-lg text-sm text-text-secondary hover:bg-surface-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
