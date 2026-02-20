// PDF Template Engine — 5 header/footer styles for firm branding
// Each template is CSS-scoped via body class: .tmpl-{style}

import { FirmBranding, ValuerInfo, DEFAULT_BRANDING } from '@/types/branding';

// ============ HEADER RENDERING ============

export function renderHeader(
  branding: FirmBranding,
  valuerInfo: ValuerInfo,
  logoBase64: string | null
): string {
  const style = branding.templateStyle || 'classic';
  const h = branding.header;
  const color = h.primaryColor || '#1a5276';

  const logoHtml = h.showLogo && logoBase64
    ? `<img src="${logoBase64}" alt="Logo" class="header-logo" />`
    : '';

  const firmNameHtml = h.showFirmName && branding.firmName
    ? `<h1 class="header-firm-name">${escapeHtml(branding.firmName)}</h1>`
    : '';

  const subtitleHtml = h.showSubtitle && branding.subtitle
    ? `<p class="header-subtitle">${escapeHtml(branding.subtitle)}</p>`
    : '';

  const addressHtml = h.showAddress && branding.address
    ? `<p class="header-address">${escapeHtml(branding.address)}</p>`
    : '';

  const contactHtml = h.showContact && (branding.contact || branding.email)
    ? `<p class="header-contact">${[branding.contact, branding.email].filter(Boolean).map(escapeHtml).join(' | ')}</p>`
    : '';

  const valuerHtml = h.showValuerInfo && valuerInfo.name
    ? renderValuerBlock(valuerInfo, style)
    : '';

  switch (style) {
    case 'modern':
      return renderModernHeader(logoHtml, firmNameHtml, subtitleHtml, addressHtml, contactHtml, valuerHtml, color);
    case 'elegant':
      return renderElegantHeader(logoHtml, firmNameHtml, subtitleHtml, addressHtml, contactHtml, valuerHtml, color);
    case 'boldCorporate':
      return renderBoldCorporateHeader(logoHtml, firmNameHtml, subtitleHtml, addressHtml, contactHtml, valuerHtml, color);
    case 'minimal':
      return renderMinimalHeader(logoHtml, firmNameHtml, subtitleHtml, addressHtml, contactHtml, valuerHtml);
    case 'classic':
    default:
      return renderClassicHeader(logoHtml, firmNameHtml, subtitleHtml, addressHtml, contactHtml, valuerHtml, color);
  }
}

function renderValuerBlock(v: ValuerInfo, style: string): string {
  if (style === 'modern') {
    return `
      <div class="valuer-info">
        <p class="valuer-name">${escapeHtml(v.name)}</p>
        <span class="valuer-badge">${escapeHtml(v.qualification)}</span>
        <span class="valuer-badge">${escapeHtml(v.designation)}</span>
        <p class="valuer-cat">${escapeHtml(v.categoryNo)}</p>
      </div>`;
  }
  return `
    <div class="valuer-info">
      <p><strong>${escapeHtml(v.name)}</strong></p>
      <p>${escapeHtml(v.qualification)}</p>
      <p>${escapeHtml(v.designation)}</p>
      <p>${escapeHtml(v.categoryNo)}</p>
    </div>`;
}

// --- Classic: Two-column, 2px border-bottom ---
function renderClassicHeader(
  logo: string, name: string, subtitle: string, address: string, contact: string, valuer: string, color: string
): string {
  const hasLeftContent = logo || name || subtitle || address || contact;
  return `
    <div class="header" style="border-bottom: 2px solid ${color};">
      ${hasLeftContent ? `
      <div class="header-left" style="color: ${color};">
        ${logo}${name}${subtitle}${address}${contact}
      </div>` : ''}
      ${valuer ? `<div class="header-right">${valuer}</div>` : ''}
    </div>`;
}

// --- Modern: 4px left sidebar accent, sans-serif ---
function renderModernHeader(
  logo: string, name: string, subtitle: string, address: string, contact: string, valuer: string, color: string
): string {
  const hasLeftContent = logo || name || subtitle || address || contact;
  return `
    <div class="header" style="border-left: 4px solid ${color}; border-bottom: none; padding-left: 16px;">
      ${hasLeftContent ? `
      <div class="header-left">
        ${logo}${name}${subtitle}${address}${contact}
      </div>` : ''}
      ${valuer ? `<div class="header-right">${valuer}</div>` : ''}
    </div>`;
}

// --- Elegant: Centered logo, small-caps, thin double lines ---
function renderElegantHeader(
  logo: string, name: string, subtitle: string, address: string, contact: string, valuer: string, color: string
): string {
  return `
    <div class="header" style="border-top: 1px solid ${color}; border-bottom: 1px solid ${color}; padding: 12px 0; flex-direction: column; align-items: center; text-align: center;">
      <div style="border-top: 1px solid ${color}; border-bottom: 1px solid ${color}; padding: 10px 20px; width: 100%; display: flex; justify-content: space-between; align-items: flex-start;">
        <div class="header-left" style="text-align: left; color: ${color};">
          ${logo}${name}${subtitle}${address}${contact}
        </div>
        ${valuer ? `<div class="header-right" style="text-align: right;">${valuer}</div>` : ''}
      </div>
    </div>`;
}

// --- Bold Corporate: Full-width colored banner ---
function renderBoldCorporateHeader(
  logo: string, name: string, subtitle: string, address: string, contact: string, valuer: string, color: string
): string {
  const hasLeftContent = logo || name || subtitle || address || contact;
  return `
    <div class="header" style="background-color: ${color}; color: #fff; padding: 14px 20px; border-bottom: none; border-radius: 4px; margin-bottom: 20px;">
      ${hasLeftContent ? `
      <div class="header-left" style="color: #fff;">
        ${logo}${name}${subtitle}${address}${contact}
      </div>` : ''}
      ${valuer ? `<div class="header-right" style="color: rgba(255,255,255,0.9);">${valuer}</div>` : ''}
    </div>`;
}

// --- Minimal: Logo + name only, thin grey divider ---
function renderMinimalHeader(
  logo: string, name: string, subtitle: string, address: string, contact: string, valuer: string
): string {
  const hasLeftContent = logo || name;
  return `
    <div class="header" style="border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 16px;">
      ${hasLeftContent ? `
      <div class="header-left" style="color: #333;">
        ${logo}${name}
      </div>` : ''}
      ${valuer ? `<div class="header-right" style="font-size: 9pt; color: #666;">${valuer}</div>` : ''}
    </div>`;
}

// ============ FOOTER RENDERING ============

export function renderFooter(branding: FirmBranding): string {
  const f = branding.footer;
  if (!f.enabled) return '';

  const style = branding.templateStyle || 'classic';
  const color = branding.header.primaryColor || '#1a5276';

  const pageNumHtml = f.showPageNumbers
    ? `<span class="footer-page-num">Page <span class="page-number"></span></span>`
    : '';

  const contactHtml = f.showContactInfo && (branding.contact || branding.email || branding.address)
    ? `<span class="footer-contact">${[branding.firmName, branding.contact, branding.email].filter(Boolean).map(escapeHtml).join(' | ')}</span>`
    : '';

  const disclaimerHtml = f.showDisclaimer && f.disclaimerText
    ? `<div class="footer-disclaimer">${escapeHtml(f.disclaimerText)}</div>`
    : '';

  const hasContent = pageNumHtml || contactHtml || disclaimerHtml;
  if (!hasContent) return '';

  switch (style) {
    case 'modern':
      return `
        <div class="page-footer" style="border-top: 3px solid ${color}; padding-top: 6px;">
          <div class="footer-row">
            ${contactHtml}
            ${pageNumHtml}
          </div>
          ${disclaimerHtml}
        </div>`;

    case 'elegant':
      return `
        <div class="page-footer" style="border-top: 1px solid ${color}; padding-top: 8px; text-align: center;">
          ${contactHtml}
          ${pageNumHtml}
          ${disclaimerHtml}
        </div>`;

    case 'boldCorporate':
      return `
        <div class="page-footer" style="background-color: ${color}; color: #fff; padding: 8px 16px; border-radius: 3px;">
          <div class="footer-row" style="color: #fff;">
            ${contactHtml ? contactHtml.replace('class="footer-contact"', 'class="footer-contact" style="color: rgba(255,255,255,0.9);"') : ''}
            ${pageNumHtml ? pageNumHtml.replace('class="footer-page-num"', 'class="footer-page-num" style="color: #fff;"') : ''}
          </div>
          ${disclaimerHtml ? disclaimerHtml.replace('class="footer-disclaimer"', 'class="footer-disclaimer" style="color: rgba(255,255,255,0.8);"') : ''}
        </div>`;

    case 'minimal':
      return `
        <div class="page-footer" style="border-top: 1px solid #eee; padding-top: 6px;">
          <div class="footer-row">
            ${pageNumHtml}
          </div>
        </div>`;

    case 'classic':
    default:
      return `
        <div class="page-footer" style="border-top: 1px solid #999; padding-top: 8px;">
          <div class="footer-row">
            ${contactHtml}
            ${pageNumHtml}
          </div>
          ${disclaimerHtml}
        </div>`;
  }
}

// ============ TEMPLATE CSS ============

export function getTemplateCSS(branding: FirmBranding): string {
  const style = branding.templateStyle || 'classic';
  const color = branding.header.primaryColor || '#1a5276';

  // Base CSS shared across all templates
  const baseCSS = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }
    .page {
      page-break-after: always;
      padding: 10mm;
      position: relative;
      min-height: calc(297mm - 20mm);
      display: flex;
      flex-direction: column;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      margin-bottom: 20px;
      flex-shrink: 0;
    }
    .header-left {
      flex: 1;
    }
    .header-right {
      text-align: right;
      flex-shrink: 0;
    }
    .header-right p {
      font-size: 10pt;
      margin: 1px 0;
    }
    .header-logo {
      max-height: 60px;
      max-width: 180px;
      object-fit: contain;
      margin-bottom: 4px;
      display: block;
    }
    .header-firm-name {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .header-subtitle,
    .header-address,
    .header-contact {
      font-size: 10pt;
      margin: 1px 0;
    }
    .valuer-info p {
      font-size: 10pt;
      margin: 1px 0;
    }
    .title {
      text-align: center;
      font-weight: bold;
      margin: 20px 0;
      font-size: 12pt;
    }
    .owners {
      margin: 15px 0;
    }
    .ref-date {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
      font-size: 10pt;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .section-title {
      font-weight: bold;
      font-size: 12pt;
      margin: 20px 0 10px 0;
      text-decoration: underline;
      page-break-after: avoid;
    }
    h1, h2, h3, h4, h5, h6, .section-title, .part-title, strong {
      page-break-after: avoid;
      orphans: 3;
      widows: 3;
    }
    table {
      page-break-inside: avoid;
    }
    tr {
      page-break-inside: avoid;
    }
    .keep-together, .section-block, .calculation-box, .declaration {
      page-break-inside: avoid;
    }
    p + table, .section-title + table, strong + table {
      page-break-before: avoid;
    }
    .cover-photo {
      text-align: center;
      margin: 30px 0;
    }
    .cover-photo img {
      max-width: 80%;
      max-height: 400px;
      border: 2px solid #333;
      border-radius: 8px;
    }
    .signature {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
    }
    .calculation-box {
      margin: 15px 0;
      padding: 10px;
    }
    .calculation-line {
      margin: 5px 0;
    }
    .specs-list p {
      margin: 5px 0;
    }
    .final-value {
      margin: 30px 0;
      padding: 15px;
      border: 2px solid #000;
      text-align: center;
      font-size: 12pt;
    }
    .value-words {
      text-align: center;
      font-weight: bold;
      margin: 15px 0;
      font-size: 12pt;
    }
    .photo-page {
      text-align: center;
    }
    .photo-caption {
      font-weight: bold;
      margin-bottom: 20px;
      font-size: 11pt;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 0 auto;
      max-width: 90%;
    }
    .photo-item {
      aspect-ratio: 4/3;
      overflow: hidden;
      border: 1px solid #333;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Footer — pinned to bottom of page via flex */
    .page-footer {
      margin-top: auto;
      padding-top: 12px;
      font-size: 8pt;
      color: #666;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-contact {
      font-size: 8pt;
    }
    .footer-page-num {
      font-size: 8pt;
    }
    .footer-disclaimer {
      font-size: 7pt;
      color: #888;
      margin-top: 4px;
      font-style: italic;
    }

    /* Page counter for page numbers */
    body { counter-reset: page; }
    .page { counter-increment: page; }
    .page-number::after { content: counter(page); }
  `;

  // Style-specific overrides
  let styleCSS = '';

  switch (style) {
    case 'modern':
      styleCSS = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header-firm-name { font-size: 18pt; letter-spacing: 0.5px; color: ${color}; }
        .header-subtitle { color: #555; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; }
        .valuer-badge {
          display: inline-block;
          background: ${color}15;
          border: 1px solid ${color}40;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 8pt;
          margin: 2px 2px;
          color: ${color};
        }
        .valuer-name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
        .valuer-cat { font-size: 8pt; color: #666; margin-top: 4px; }
        .section-title { color: ${color}; }
        th { background-color: ${color}10; }
      `;
      break;

    case 'elegant':
      styleCSS = `
        body { font-family: Georgia, 'Times New Roman', serif; }
        .header-firm-name {
          font-size: 18pt;
          font-variant: small-caps;
          letter-spacing: 2px;
          color: ${color};
        }
        .header-subtitle { font-style: italic; font-size: 10pt; color: #555; }
        .header-address, .header-contact { font-size: 9pt; color: #444; }
        .section-title { font-style: italic; }
        .final-value { border: 1px solid ${color}; }
      `;
      break;

    case 'boldCorporate':
      styleCSS = `
        body { font-family: Arial, Helvetica, sans-serif; }
        .header-firm-name {
          font-size: 20pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header-subtitle { font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; }
        .header-address, .header-contact { font-size: 9pt; opacity: 0.85; }
        .header-logo { max-height: 50px; filter: brightness(0) invert(1); }
        .section-title { color: ${color}; text-transform: uppercase; font-size: 11pt; }
        th { background-color: ${color}; color: #fff; }
      `;
      break;

    case 'minimal':
      styleCSS = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header-firm-name { font-size: 14pt; font-weight: 500; color: #333; }
        .header-logo { max-height: 40px; }
      `;
      break;

    case 'classic':
    default:
      styleCSS = `
        body { font-family: 'Times New Roman', Times, serif; }
        .header-left h1, .header-firm-name { font-size: 16pt; }
        .header-left p { font-size: 10pt; margin: 1px 0; }
      `;
      break;
  }

  return baseCSS + styleCSS;
}

// ============ HELPERS ============

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build the full branding config by merging firm branding with defaults
export function mergeBrandingWithDefaults(branding?: Partial<FirmBranding> | null): FirmBranding {
  if (!branding) return DEFAULT_BRANDING;
  return {
    ...DEFAULT_BRANDING,
    ...branding,
    header: { ...DEFAULT_BRANDING.header, ...(branding.header || {}) },
    footer: { ...DEFAULT_BRANDING.footer, ...(branding.footer || {}) },
  };
}
