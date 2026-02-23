// PDF Template Engine — 5 header/footer styles for firm branding
// Puppeteer native header/footer for PDF output (consistent on every page)
// Embedded header/footer for HTML preview mode

import { FirmBranding, ValuerInfo, DEFAULT_BRANDING } from '@/types/branding';

function getFontFamily(style?: string): string {
  switch (style) {
    case 'modern':
    case 'minimal':
      return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    case 'elegant':
      return "Georgia, 'Times New Roman', serif";
    case 'boldCorporate':
      return "Arial, Helvetica, sans-serif";
    case 'classic':
    default:
      return "'Times New Roman', Times, serif";
  }
}

// ============ PUPPETEER NATIVE HEADER/FOOTER (for PDF output) ============

export function renderPuppeteerHeader(
  branding: FirmBranding,
  valuerInfo: ValuerInfo,
  logoBase64: string | null
): string {
  const h = branding.header;
  const color = h.primaryColor || '#1a5276';

  // Build left side
  const leftParts: string[] = [];
  if (h.showLogo && logoBase64) {
    leftParts.push(`<img src="${logoBase64}" style="max-height: 44px; max-width: 160px; object-fit: contain; display: block; margin-bottom: 3px;" />`);
  }
  if (h.showFirmName && branding.firmName) {
    leftParts.push(`<div style="font-size: 16px; font-weight: bold; color: ${color}; line-height: 1.2; letter-spacing: 0.3px;">${escapeHtml(branding.firmName)}</div>`);
  }
  if (h.showSubtitle && branding.subtitle) {
    leftParts.push(`<div style="font-size: 9px; color: #444; line-height: 1.3; margin-top: 1px;">${escapeHtml(branding.subtitle)}</div>`);
  }
  if (h.showAddress && branding.address) {
    leftParts.push(`<div style="font-size: 9px; color: #333; line-height: 1.3;">${escapeHtml(branding.address)}</div>`);
  }
  if (h.showContact && (branding.contact || branding.email)) {
    leftParts.push(`<div style="font-size: 9px; color: #333; line-height: 1.3;">${[branding.contact, branding.email].filter(Boolean).map(escapeHtml).join(' | ')}</div>`);
  }

  // Build right side (valuer info)
  const rightParts: string[] = [];
  if (h.showValuerInfo && valuerInfo.name) {
    rightParts.push(`<div style="font-size: 10px; font-weight: bold; line-height: 1.3;">${escapeHtml(valuerInfo.name)}</div>`);
    if (valuerInfo.qualification) rightParts.push(`<div style="font-size: 9px; color: #333; line-height: 1.3;">${escapeHtml(valuerInfo.qualification)}</div>`);
    if (valuerInfo.designation) rightParts.push(`<div style="font-size: 9px; color: #333; line-height: 1.3;">${escapeHtml(valuerInfo.designation)}</div>`);
    if (valuerInfo.categoryNo) rightParts.push(`<div style="font-size: 9px; color: #333; line-height: 1.3;">${escapeHtml(valuerInfo.categoryNo)}</div>`);
  }

  const hasContent = leftParts.length > 0 || rightParts.length > 0;
  if (!hasContent) return '<span></span>';

  const fontFamily = getFontFamily(branding.templateStyle);
  return `<div style="width: 100%; padding: 0 10mm; font-family: ${fontFamily}; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid ${color}; padding-bottom: 6px; margin-top: 5mm;">
    <div>${leftParts.join('')}</div>
    <div style="text-align: right;">${rightParts.join('')}</div>
  </div>`;
}

export function renderPuppeteerFooter(branding: FirmBranding): string {
  const f = branding.footer;

  let contactHtml = '';
  if (f.enabled && f.showContactInfo && (branding.contact || branding.email)) {
    contactHtml = `<span style="font-size: 8px; color: #555;">${[branding.firmName, branding.contact, branding.email].filter(Boolean).map(escapeHtml).join(' | ')}</span>`;
  }

  // Always show page numbers — font-size must be explicit for Chromium header/footer context
  const pageNumHtml = `<span style="font-size: 10px; color: #555;"><span>Page </span><span class="pageNumber"></span></span>`;

  let disclaimerHtml = '';
  if (f.enabled && f.showDisclaimer && f.disclaimerText) {
    disclaimerHtml = `<div style="font-size: 7px; color: #777; font-style: italic; text-align: center; margin-top: 2px;">${escapeHtml(f.disclaimerText)}</div>`;
  }

  const fontFamily = getFontFamily(branding.templateStyle);
  return `<div style="width: 100%; padding: 0 10mm; font-family: ${fontFamily}; border-top: 1.5px solid #bbb; padding-top: 4px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      ${contactHtml}
      ${pageNumHtml}
    </div>
    ${disclaimerHtml}
  </div>`;
}

// ============ EMBEDDED HEADER/FOOTER (for preview mode) ============

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

// ============ CONDENSED HEADER (pages 2+ — both preview and PDF) ============

export function renderCondensedHeader(branding: FirmBranding, valuerName?: string): string {
  const color = branding.header.primaryColor || '#1a5276';
  const firmName = branding.firmName;
  if (!firmName && !valuerName) return '';

  const fontFamily = getFontFamily(branding.templateStyle);
  return `
    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2.5px solid ${color}; padding-bottom: 6px; margin-bottom: 15px; margin-left: -4mm; margin-right: -4mm; padding-left: 4mm; padding-right: 4mm; font-family: ${fontFamily};">
      ${firmName ? `<span style="font-size: 16px; color: ${color}; font-weight: bold; letter-spacing: 0.3px;">${escapeHtml(firmName)}</span>` : ''}
      ${valuerName ? `<span style="font-size: 10px; color: #555;">${escapeHtml(valuerName)}</span>` : ''}
    </div>`;
}

// ============ FOOTER (for preview) ============

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
          <div class="footer-row">${contactHtml}${pageNumHtml}</div>
          ${disclaimerHtml}
        </div>`;
    case 'elegant':
      return `
        <div class="page-footer" style="border-top: 1px solid ${color}; padding-top: 8px; text-align: center;">
          ${contactHtml}${pageNumHtml}${disclaimerHtml}
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
          <div class="footer-row">${pageNumHtml}</div>
        </div>`;
    case 'classic':
    default:
      return `
        <div class="page-footer" style="border-top: 1px solid #999; padding-top: 8px;">
          <div class="footer-row">${contactHtml}${pageNumHtml}</div>
          ${disclaimerHtml}
        </div>`;
  }
}

// ============ TEMPLATE CSS ============

export function getTemplateCSS(branding: FirmBranding): string {
  const style = branding.templateStyle || 'classic';
  const color = branding.header.primaryColor || '#1a5276';

  // Base CSS — used for PDF body content (headers/footers handled by Puppeteer)
  const baseCSS = `
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    p {
      margin: 10px 0;
    }
    .page {
      padding: 5mm 12mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .page:last-child {
      page-break-after: auto;
    }

    /* Preview mode: simulate A4 pages so footers pin to bottom */
    body.preview-mode .page {
      min-height: 270mm;
      border-bottom: 2px solid #e0e0e0;
      margin-bottom: 8mm;
    }

    /* --- Cover page --- */
    .cover-title {
      text-align: left;
      font-weight: bold;
      margin: 24px 0 16px;
      font-size: 13pt;
      line-height: 1.5;
    }
    .cover-owners {
      margin: 14px 0;
      line-height: 1.6;
    }
    .cover-meta {
      margin: 14px 0 10px;
      line-height: 1.8;
    }
    .cover-photo {
      text-align: center;
      margin: 30px 0;
    }
    .cover-photo img {
      max-width: 85%;
      max-height: 280px;
      border: 2px solid #444;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    /* --- Inline title (non-cover pages) --- */
    .title {
      text-align: left;
      font-weight: bold;
      margin: 16px 0;
      font-size: 12pt;
    }
    .owners {
      margin: 15px 0;
    }
    .ref-date {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
    }
    .ref-date span {
      font-weight: bold;
    }

    /* --- Tables --- */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #444;
      padding: 7px 10px;
      text-align: left;
      vertical-align: top;
      font-size: 10pt;
    }
    th {
      background-color: #e8eaed;
      font-weight: bold;
      font-size: 9.5pt;
    }
    /* Zebra striping for readability */
    tbody tr:nth-child(even),
    table tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    /* Questionnaire tables (3-col: serial, question, answer) */
    .q-table td:first-child {
      width: 28px;
      text-align: center;
      color: #555;
      font-size: 9.5pt;
    }
    .q-table td:nth-child(2) {
      width: 52%;
    }

    /* --- Section titles --- */
    .section-title {
      font-weight: bold;
      font-size: 12pt;
      margin: 20px 0 10px 0;
      text-decoration: underline;
      page-break-after: avoid;
    }
    .part-title {
      text-align: center;
      font-weight: bold;
      font-size: 13pt;
      margin: 10px 0 5px;
      letter-spacing: 0.5px;
      page-break-after: avoid;
    }
    h1, h2, h3, h4, h5, h6, .section-title, .part-title, strong {
      page-break-after: avoid;
      orphans: 3;
      widows: 3;
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

    /* --- N/A placeholder styling --- */
    .na {
      color: #999;
      font-style: italic;
    }

    /* --- Declaration & Signature --- */
    .declaration {
      margin-top: 30px;
      padding: 20px 24px;
      border: 1px solid #d0d0d0;
      background-color: #fafbfc;
      border-radius: 4px;
    }
    .declaration .section-title {
      margin-top: 0;
    }
    .signature {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding-top: 0;
    }
    .sig-block {
      text-align: center;
      min-width: 180px;
    }
    .sig-line {
      border-top: 1px solid #333;
      padding-top: 8px;
      font-size: 10pt;
    }

    /* --- Calculations --- */
    .calculation-box {
      margin: 15px 0;
      padding: 12px 16px;
      background-color: #f8f9fa;
      border-left: 3px solid ${color};
      border-radius: 2px;
    }
    .calculation-line {
      margin: 6px 0;
    }

    /* --- Specs table --- */
    .specs-table {
      width: 100%;
      margin: 10px 0 15px;
      border-collapse: collapse;
    }
    .specs-table td {
      border: none;
      padding: 4px 10px;
      font-size: 10.5pt;
    }
    .specs-table td:first-child {
      font-weight: bold;
      width: 150px;
      color: #333;
    }
    .specs-table tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    /* --- Final value emphasis --- */
    .final-value {
      margin: 30px 0;
      padding: 16px 20px;
      border: 2px solid ${color};
      background-color: #f0f7ed;
      text-align: center;
      font-size: 12pt;
      border-radius: 4px;
    }
    .value-words {
      text-align: center;
      font-weight: bold;
      margin: 15px 0;
      font-size: 12pt;
      background-color: #f8f9fa;
      padding: 12px 16px;
      border-radius: 4px;
    }

    /* --- Photos --- */
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
      overflow: hidden;
      border: 1px solid #444;
      border-radius: 3px;
    }
    .photo-item img {
      width: 100%;
      aspect-ratio: 4/3;
      object-fit: cover;
      display: block;
    }
    .photo-number {
      text-align: center;
      font-size: 8.5pt;
      color: #666;
      padding: 4px 0;
      background-color: #f8f9fa;
      border-top: 1px solid #eee;
    }

    /* --- Total / summary rows --- */
    .total-row td {
      border-top: 2px solid #333;
      background-color: #f0f1f3 !important;
    }

    /* --- Detail tables (2-col: label + value, used in addendum pages) --- */
    .detail-table td:first-child {
      width: 40%;
      color: #333;
    }

    /* --- Location map page --- */
    .map-container {
      text-align: center;
      margin: 20px 0;
    }
    .map-container img {
      max-width: 100%;
      height: auto;
      border: 2px solid #444;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .coord-table {
      width: 60%;
      margin: 30px auto;
    }
    .coord-table td {
      text-align: center;
      padding: 15px;
      background-color: #f8f9fa;
    }
    .map-date {
      text-align: center;
      font-size: 10pt;
      color: #666;
      margin-top: 20px;
    }
    .map-attribution {
      text-align: center;
      font-size: 9pt;
      color: #888;
      margin-top: 40px;
    }

    /* --- Valuer sign-off (final page) --- */
    .valuer-signoff {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .valuer-signoff .sig-block {
      text-align: center;
      min-width: 180px;
    }
    .valuer-signoff .sig-line {
      border-top: 1px solid #333;
      padding-top: 8px;
      font-size: 10pt;
      line-height: 1.5;
    }

    /* --- Continuation label --- */
    .cont-label {
      font-size: 10pt;
      color: #666;
      font-style: italic;
      margin-bottom: 8px;
    }
  `;

  // Preview-mode header/footer CSS (embedded headers; Puppeteer handles these in PDF mode)
  const previewHeaderFooterCSS = `
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      margin-bottom: 10px;
      margin-left: -4mm;
      margin-right: -4mm;
      padding-left: 4mm;
      padding-right: 4mm;
    }
    .header-left { flex: 1; }
    .header-right { text-align: right; }
    .header-logo { max-height: 56px; max-width: 180px; object-fit: contain; display: block; margin-bottom: 4px; }
    .header-firm-name { font-size: 16pt; margin: 0; line-height: 1.2; letter-spacing: 0.3px; }
    .header-subtitle { font-size: 9pt; margin: 3px 0 1px; color: #444; }
    .header-address, .header-contact { font-size: 9pt; margin: 1px 0; color: #333; }
    .valuer-info p { font-size: 9.5pt; margin: 1px 0; }
    .valuer-name { font-weight: bold; }
    .valuer-badge { display: inline-block; font-size: 8.5pt; background: #f0f0f0; padding: 2px 7px; border-radius: 3px; margin: 1px 2px; }
    .valuer-cat { font-size: 8.5pt; margin-top: 2px; }
    .page-footer { margin-top: auto; padding-top: 8px; font-size: 8pt; }
    .footer-row { display: flex; justify-content: space-between; align-items: center; }
    .footer-contact, .footer-page-num { font-size: 8pt; color: #666; }
    .footer-disclaimer { font-size: 7pt; color: #888; font-style: italic; margin-top: 3px; text-align: center; }
  `;

  // Style-specific overrides (body font only — headers handled by Puppeteer)
  let styleCSS = '';

  switch (style) {
    case 'modern':
      styleCSS = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .section-title { color: ${color}; }
        th { background-color: ${color}10; }
      `;
      break;

    case 'elegant':
      styleCSS = `
        body { font-family: Georgia, 'Times New Roman', serif; }
        .section-title { font-style: italic; }
        .final-value { border: 1px solid ${color}; }
      `;
      break;

    case 'boldCorporate':
      styleCSS = `
        body { font-family: Arial, Helvetica, sans-serif; }
        .section-title { color: ${color}; text-transform: uppercase; font-size: 11pt; }
        th { background-color: ${color}; color: #fff; }
      `;
      break;

    case 'minimal':
      styleCSS = `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `;
      break;

    case 'classic':
    default:
      styleCSS = `
        body { font-family: 'Times New Roman', Times, serif; }
      `;
      break;
  }

  return baseCSS + previewHeaderFooterCSS + styleCSS;
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
