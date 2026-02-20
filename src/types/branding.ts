// Types for firm branding configuration

export type TemplateStyle = 'classic' | 'modern' | 'elegant' | 'boldCorporate' | 'minimal';

export interface HeaderConfig {
  showLogo: boolean;
  showFirmName: boolean;
  showSubtitle: boolean;
  showAddress: boolean;
  showContact: boolean;
  showValuerInfo: boolean;
  primaryColor: string; // Hex color, e.g. '#1a5276'
}

export interface FooterConfig {
  enabled: boolean;
  showPageNumbers: boolean;
  showContactInfo: boolean;
  showDisclaimer: boolean;
  disclaimerText: string;
}

export interface FirmBranding {
  templateStyle: TemplateStyle;
  logoUrl: string | null;
  logoStoragePath: string | null;
  firmName: string;
  subtitle: string;
  address: string;
  contact: string;
  email: string;
  header: HeaderConfig;
  footer: FooterConfig;
  updatedAt?: unknown; // Firestore Timestamp
  updatedBy?: string;
}

export interface ValuerInfo {
  name: string;
  qualification: string;
  designation: string;
  categoryNo: string;
}

export const DEFAULT_BRANDING: FirmBranding = {
  templateStyle: 'classic',
  logoUrl: null,
  logoStoragePath: null,
  firmName: '',
  subtitle: '',
  address: '',
  contact: '',
  email: '',
  header: {
    showLogo: true,
    showFirmName: true,
    showSubtitle: true,
    showAddress: true,
    showContact: true,
    showValuerInfo: true,
    primaryColor: '#1a5276',
  },
  footer: {
    enabled: true,
    showPageNumbers: true,
    showContactInfo: false,
    showDisclaimer: false,
    disclaimerText: 'This valuation report is prepared for the sole use of the client.',
  },
};

export const TEMPLATE_STYLES: Record<TemplateStyle, {
  name: string;
  description: string;
}> = {
  classic: {
    name: 'Classic',
    description: 'Traditional layout with border accent, serif fonts',
  },
  modern: {
    name: 'Modern',
    description: 'Clean sans-serif with colored sidebar accent',
  },
  elegant: {
    name: 'Elegant',
    description: 'Refined serif with thin double-line borders, centered logo',
  },
  boldCorporate: {
    name: 'Bold Corporate',
    description: 'Full-width colored banner with strong brand presence',
  },
  minimal: {
    name: 'Minimal',
    description: 'Logo and firm name only, maximum whitespace',
  },
};
