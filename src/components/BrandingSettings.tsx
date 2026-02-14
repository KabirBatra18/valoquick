'use client';

import React, { useState, useMemo } from 'react';
import { useFirm } from '@/contexts/FirmContext';
import { FirmBranding, DEFAULT_BRANDING } from '@/types/branding';
import { uploadFirmLogo, deleteFirmLogo } from '@/lib/logo-storage';
import TemplateSelector from './branding/TemplateSelector';
import LogoUploader from './branding/LogoUploader';
import BrandingColorPicker from './branding/BrandingColorPicker';
import HeaderPreview from './branding/HeaderPreview';
import FooterPreview from './branding/FooterPreview';

interface BrandingSettingsProps {
  onClose: () => void;
}

type Tab = 'details' | 'header' | 'footer';

export default function BrandingSettings({ onClose }: BrandingSettingsProps) {
  const { firm, updateBranding } = useFirm();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<FirmBranding>(() => {
    const existing = firm?.branding;
    return {
      ...DEFAULT_BRANDING,
      ...existing,
      firmName: existing?.firmName || firm?.name || '',
      header: { ...DEFAULT_BRANDING.header, ...(existing?.header || {}) },
      footer: { ...DEFAULT_BRANDING.footer, ...(existing?.footer || {}) },
    };
  });

  const [pendingLogo, setPendingLogo] = useState<File | null>(null);

  // Preview branding with fallback sample data for empty fields
  const previewBranding = useMemo(
    (): FirmBranding => ({
      ...formData,
      firmName: formData.firmName || 'Your Firm Name',
      subtitle: formData.subtitle || 'Architects & Valuers',
      address: formData.address || '123 Business Street, New Delhi',
      contact: formData.contact || 'Mob: 9876543210',
      email: formData.email || 'info@yourfirm.com',
    }),
    [formData]
  );

  const updateField = <K extends keyof FirmBranding>(key: K, value: FirmBranding[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateHeader = (key: string, value: boolean | string) => {
    setFormData((prev) => ({ ...prev, header: { ...prev.header, [key]: value } }));
  };

  const updateFooter = (key: string, value: boolean | string) => {
    setFormData((prev) => ({ ...prev, footer: { ...prev.footer, [key]: value } }));
  };

  const handleLogoSelected = (file: File) => {
    setPendingLogo(file);
  };

  const handleLogoRemove = async () => {
    if (formData.logoStoragePath) {
      try {
        await deleteFirmLogo(formData.logoStoragePath);
      } catch (e) {
        console.error('Failed to delete logo:', e);
      }
    }
    setPendingLogo(null);
    setFormData((prev) => ({ ...prev, logoUrl: null, logoStoragePath: null }));
  };

  const handleSave = async () => {
    if (!firm) return;
    setSaving(true);
    setMessage(null);

    try {
      let logoUrl = formData.logoUrl;
      let logoStoragePath = formData.logoStoragePath;

      if (pendingLogo) {
        setUploading(true);
        const result = await uploadFirmLogo(firm.id, pendingLogo);
        logoUrl = result.url;
        logoStoragePath = result.storagePath;
        setUploading(false);
        setPendingLogo(null);
      }

      await updateBranding({
        ...formData,
        logoUrl,
        logoStoragePath,
      });

      setFormData((prev) => ({ ...prev, logoUrl, logoStoragePath }));
      setMessage({ type: 'success', text: 'Branding saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving branding:', err);
      setMessage({ type: 'error', text: 'Failed to save branding. Please try again.' });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Firm Details' },
    { id: 'header', label: 'Header' },
    { id: 'footer', label: 'Footer' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-surface-100 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-surface-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-surface-200">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Branding Settings</h2>
            <p className="text-text-tertiary text-xs mt-0.5">Customize how your reports look</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-200 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Template + Color — always visible, outside tabs */}
        <div className="px-4 lg:px-6 py-4 border-b border-surface-200">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-text-secondary mb-2">Template</label>
              <TemplateSelector
                selected={formData.templateStyle}
                onSelect={(style) => updateField('templateStyle', style)}
                primaryColor={formData.header.primaryColor}
                compact
              />
            </div>
            <div className="lg:w-52 flex-shrink-0">
              <label className="block text-xs font-medium text-text-secondary mb-2">Brand Color</label>
              <BrandingColorPicker
                color={formData.header.primaryColor}
                onChange={(c) => updateHeader('primaryColor', c)}
              />
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mx-4 lg:mx-6 mt-3 px-4 py-2.5 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-surface-200 px-4 lg:px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Firm Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3">Firm Logo</h3>
                <LogoUploader
                  logoUrl={formData.logoUrl}
                  onLogoSelected={handleLogoSelected}
                  onLogoRemove={handleLogoRemove}
                  isUploading={uploading}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Firm Name</label>
                  <input
                    type="text"
                    value={formData.firmName}
                    onChange={(e) => updateField('firmName', e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., Batra & Associates"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => updateField('subtitle', e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., Architects, Engineers & Valuers"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., 3/5 East Punjabi Bagh, New Delhi - 110026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => updateField('contact', e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., Mob: 9811741187"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
                  <input
                    type="text"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., info@yourfirm.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Header Tab */}
          {activeTab === 'header' && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Header Sections</h3>
              <p className="text-text-tertiary text-xs mb-4">
                Toggle which sections appear in your report header
              </p>
              <div className="space-y-3">
                {[
                  { key: 'showLogo', label: 'Firm Logo', desc: 'Show your logo in the header' },
                  { key: 'showFirmName', label: 'Firm Name', desc: 'Display your firm name prominently' },
                  {
                    key: 'showSubtitle',
                    label: 'Subtitle / Tagline',
                    desc: 'Show your firm description',
                  },
                  { key: 'showAddress', label: 'Address', desc: 'Include firm address' },
                  { key: 'showContact', label: 'Contact Details', desc: 'Show phone and email' },
                  {
                    key: 'showValuerInfo',
                    label: 'Valuer Information',
                    desc: 'Display valuer name, qualification, and designation',
                  },
                ].map((item) => {
                  const isOn = formData.header[item.key as keyof typeof formData.header] as boolean;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-3 p-3 bg-surface-200/30 rounded-xl hover:bg-surface-200/50 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-text-primary font-medium">{item.label}</span>
                        <p className="text-text-tertiary text-xs">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        onClick={() => updateHeader(item.key, !isOn)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
                          isOn ? 'bg-brand' : 'bg-surface-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 translate-y-[2px] ${
                            isOn ? 'translate-x-[22px]' : 'translate-x-[2px]'
                          }`}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Tab */}
          {activeTab === 'footer' && (
            <div className="space-y-5">
              <label className="flex items-center justify-between gap-3 p-3 bg-surface-200/30 rounded-xl cursor-pointer">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary font-semibold">Enable Footer</span>
                  <p className="text-text-tertiary text-xs">Show a footer at the bottom of each page</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.footer.enabled}
                  onClick={() => updateFooter('enabled', !formData.footer.enabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
                    formData.footer.enabled ? 'bg-brand' : 'bg-surface-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 translate-y-[2px] ${
                      formData.footer.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </label>

              {formData.footer.enabled && (
                <div className="space-y-3 pl-1">
                  {[
                    {
                      key: 'showPageNumbers',
                      label: 'Page Numbers',
                      desc: 'Show "Page X" on each page',
                    },
                    {
                      key: 'showContactInfo',
                      label: 'Contact Information',
                      desc: 'Repeat firm name, phone, email in footer',
                    },
                    {
                      key: 'showDisclaimer',
                      label: 'Disclaimer Text',
                      desc: 'Add a custom disclaimer note',
                    },
                  ].map((item) => {
                    const isOn = formData.footer[item.key as keyof typeof formData.footer] as boolean;
                    return (
                      <label
                        key={item.key}
                        className="flex items-center justify-between gap-3 p-3 bg-surface-200/30 rounded-xl hover:bg-surface-200/50 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-text-primary font-medium">{item.label}</span>
                          <p className="text-text-tertiary text-xs">{item.desc}</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          onClick={() => updateFooter(item.key, !isOn)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
                            isOn ? 'bg-brand' : 'bg-surface-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 translate-y-[2px] ${
                              isOn ? 'translate-x-[22px]' : 'translate-x-[2px]'
                            }`}
                          />
                        </button>
                      </label>
                    );
                  })}

                  {formData.footer.showDisclaimer && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Disclaimer Text
                      </label>
                      <textarea
                        value={formData.footer.disclaimerText}
                        onChange={(e) => updateFooter('disclaimerText', e.target.value)}
                        className="form-input w-full h-20 resize-none"
                        placeholder="e.g., This valuation report is prepared for the sole use of the client."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Preview — always visible */}
        <div className="flex-shrink-0 border-t border-surface-200 px-4 lg:px-6 py-3">
          <p className="text-[10px] uppercase tracking-wider font-medium text-text-tertiary mb-2">
            Live Preview
          </p>
          {activeTab === 'footer' ? (
            <FooterPreview branding={previewBranding} />
          ) : (
            <HeaderPreview branding={previewBranding} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-4 lg:px-6 py-3 border-t border-surface-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium bg-brand hover:bg-brand/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
