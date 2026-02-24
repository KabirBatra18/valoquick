import JSZip from 'jszip';
import { ValuationReport } from '@/types/valuation';

/**
 * Generate a basic DOCX export of a valuation report.
 * Produces a valid .docx (Office Open XML) using JSZip.
 * Focused on data export — not pixel-perfect layout like PDF.
 */
export async function generateDocx(report: ValuationReport): Promise<Buffer> {
  const zip = new JSZip();

  // Content Types
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  // Relationships
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  // Build document body
  const body = buildDocumentBody(report);

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${body}
  </w:body>
</w:document>`);

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  return buf;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function heading(text: string, level: 1 | 2 | 3 = 1): string {
  const sizes: Record<number, number> = { 1: 32, 2: 28, 3: 24 };
  return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="${sizes[level]}"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
}

function para(text: string): string {
  return `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function labelValue(label: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  return para(`${label}: ${value}`);
}

function buildDocumentBody(r: ValuationReport): string {
  const lines: string[] = [];
  const cv = r.calculatedValues;
  const vi = r.valuationInputs;

  // Title
  lines.push(heading('VALUATION REPORT'));
  lines.push(para(`${r.companyName || ''}`));
  if (r.companySubtitle) lines.push(para(r.companySubtitle));
  lines.push(para(''));

  // Property Details
  lines.push(heading('Property Details', 2));
  lines.push(labelValue('Address', r.propertyAddress?.fullAddress));
  lines.push(labelValue('Original Owner', r.originalOwner));
  lines.push(labelValue('Original Owner Year', r.originalOwnerYear));
  if (r.currentOwners?.length) {
    lines.push(labelValue('Current Owners', r.currentOwners.join(', ')));
  }

  // Boundaries
  if (r.boundaries) {
    lines.push(heading('Boundaries', 3));
    lines.push(labelValue('North', r.boundaries.north));
    lines.push(labelValue('South', r.boundaries.south));
    lines.push(labelValue('East', r.boundaries.east));
    lines.push(labelValue('West', r.boundaries.west));
  }

  // Valuation Parameters
  lines.push(heading('Valuation Parameters', 2));
  lines.push(labelValue('Reference No', vi.referenceNo));
  lines.push(labelValue('Bank Name', vi.bankName));
  lines.push(labelValue('Date of Valuation', vi.valuationDate));
  lines.push(labelValue('Purpose', vi.purpose));
  lines.push(labelValue('Plot Area (Sqm)', vi.plotArea));
  lines.push(labelValue('Land Rate (Rs/Sqm)', vi.landRatePerSqm));
  lines.push(labelValue('Land Rate Source', vi.landRateSource));
  lines.push(labelValue('Location Increase %', vi.locationIncreasePercent));
  lines.push(labelValue('Land Share', vi.landShareFraction));
  lines.push(labelValue('Year of Construction', vi.yearOfConstruction));
  lines.push(labelValue('Estimated Life (Years)', vi.estimatedLifeYears));
  lines.push(labelValue('Age at Valuation', vi.ageAtValuation));

  // Calculated Values
  lines.push(heading('Valuation Summary', 2));
  lines.push(labelValue('Rate of Construction (Rs/Sqm)', cv.rateOfConstruction));
  lines.push(labelValue('Net Rate of Construction', cv.netRateOfConstruction));
  lines.push(labelValue('Cost of Construction', cv.costOfConstruction?.toLocaleString('en-IN')));
  lines.push(labelValue('Remaining Life (Years)', cv.remainingLife));
  lines.push(labelValue('Depreciated Value', cv.depreciatedValue?.toLocaleString('en-IN')));
  lines.push(labelValue('Net Land Rate (Rs/Sqm)', cv.netLandRate));
  lines.push(labelValue('Total Land Value', cv.totalLandValue?.toLocaleString('en-IN')));
  lines.push(labelValue('Land Share Value', cv.landShareValue?.toLocaleString('en-IN')));
  lines.push(labelValue('Total Property Value', cv.totalPropertyValue?.toLocaleString('en-IN')));
  lines.push(para(''));
  lines.push(heading('FAIR MARKET VALUE', 2));
  lines.push(para(`Rs. ${cv.roundedValue?.toLocaleString('en-IN')} (${cv.valueInWords || ''})`));

  // General Details
  if (r.generalDetails) {
    lines.push(heading('General Details', 2));
    const gd = r.generalDetails;
    lines.push(labelValue('Property Type', gd.propertyType));
    lines.push(labelValue('Locality Class', gd.localityClass));
    lines.push(labelValue('Plot Shape', gd.plotShape));
    lines.push(labelValue('Building Occupancy', gd.buildingOccupancy));
  }

  // Building Specs
  if (r.buildingSpecs) {
    lines.push(heading('Building Specifications', 2));
    const bs = r.buildingSpecs;
    lines.push(labelValue('Roof', bs.roof));
    lines.push(labelValue('Brickwork', bs.brickwork));
    lines.push(labelValue('Flooring', bs.flooring));
    lines.push(labelValue('Tiles', bs.tiles));
    lines.push(labelValue('Electrical', bs.electrical));
    lines.push(labelValue('Woodwork', bs.woodwork));
    lines.push(labelValue('Exterior', bs.exterior));
  }

  return lines.filter(Boolean).join('\n');
}
