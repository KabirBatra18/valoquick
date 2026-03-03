import JSZip from 'jszip';
import { ValuationReport } from '@/types/valuation';

// ─── XML HELPERS ──────────────────────────────────────────────────────────────

/** XML-escape raw strings. Keeps literal Unicode (₹, –, °, ©, etc.) as UTF-8. */
function xe(s: string | number | boolean | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── FORMATTING HELPERS ───────────────────────────────────────────────────────

function formatCurrency(num: number): string {
  if (!num) return 'Rs 0.00/-';
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const len = intPart.length;
  let grouped: string;
  if (len <= 3) {
    grouped = intPart;
  } else {
    grouped = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) {
      grouped = remaining.slice(-2) + ',' + grouped;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) grouped = remaining + ',' + grouped;
  }
  return `Rs ${grouped}.${decPart}/-`;
}

function fmt(num: number, decimals = 2): string {
  return (num ?? 0).toFixed(decimals);
}

// ─── PARAGRAPH / RUN PRIMITIVES ───────────────────────────────────────────────

interface ParaOpts {
  bold?: boolean;
  italic?: boolean;
  size?: number;         // half-points (20 = 10pt, 22 = 11pt, 24 = 12pt)
  align?: 'left' | 'center' | 'right' | 'both';
  spacingBefore?: number;
  spacingAfter?: number;
  color?: string;        // hex without #
  underline?: boolean;
  indent?: number;       // left indent in twips
  keepNext?: boolean;
}

function rPr(opts: ParaOpts): string {
  const sz = opts.size ?? 20;
  return [
    opts.bold ? '<w:b/><w:bCs/>' : '',
    opts.italic ? '<w:i/><w:iCs/>' : '',
    opts.underline ? '<w:u w:val="single"/>' : '',
    opts.color ? `<w:color w:val="${opts.color}"/>` : '',
    `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`,
    '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
  ].join('');
}

function para(text: string, opts: ParaOpts = {}): string {
  const pPrParts = [
    opts.align ? `<w:jc w:val="${opts.align}"/>` : '',
    `<w:spacing w:before="${opts.spacingBefore ?? 0}" w:after="${opts.spacingAfter ?? 80}"/>`,
    opts.indent ? `<w:ind w:left="${opts.indent}"/>` : '',
    opts.keepNext ? '<w:keepNext/>' : '',
  ].join('');

  const lines = String(text ?? '').split('\n');
  const runs = lines.map((line, i) => {
    const br = i < lines.length - 1 ? '<w:br/>' : '';
    return `<w:r><w:rPr>${rPr(opts)}</w:rPr><w:t xml:space="preserve">${xe(line)}</w:t>${br}</w:r>`;
  }).join('');

  return `<w:p><w:pPr>${pPrParts}</w:pPr>${runs}</w:p>`;
}

function emptyP(spacingAfter = 80): string {
  return `<w:p><w:pPr><w:spacing w:after="${spacingAfter}"/></w:pPr></w:p>`;
}

function pageBreak(): string {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function sectionTitle(text: string): string {
  return para(text, { bold: true, size: 22, underline: true, spacingBefore: 160, spacingAfter: 80, keepNext: true });
}

function boldPara(text: string, align: ParaOpts['align'] = 'left'): string {
  return para(text, { bold: true, size: 22, align, spacingAfter: 80 });
}

// ─── TABLE HELPERS ────────────────────────────────────────────────────────────

const BORDER = '<w:top w:val="single" w:sz="4" w:space="0" w:color="444444"/><w:left w:val="single" w:sz="4" w:space="0" w:color="444444"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="444444"/><w:right w:val="single" w:sz="4" w:space="0" w:color="444444"/>';

function tcPr(width: number, shading?: string, vAlign?: string): string {
  return `<w:tcPr>
    <w:tcW w:w="${width}" w:type="dxa"/>
    <w:tcBorders>${BORDER}</w:tcBorders>
    ${shading ? `<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>` : ''}
    ${vAlign ? `<w:vAlign w:val="${vAlign}"/>` : ''}
  </w:tcPr>`;
}

function tc(content: string, width: number, shading?: string): string {
  return `<w:tc>${tcPr(width, shading)}${content}</w:tc>`;
}

function cellP(text: string, opts: ParaOpts = {}, shading?: string): string {
  const cellOpts = { size: 18, spacingAfter: 40, ...opts };
  return tc(para(text, cellOpts), 0, shading); // width set by tcPr separately
}

// 3-column questionnaire table row: (serial | question | answer)
function qRow(
  serial: string | number,
  question: string,
  answer: string,
  isHeader = false,
): string {
  const shade = isHeader ? 'E8EAED' : undefined;
  const opts: ParaOpts = { size: 18, spacingAfter: 40, bold: isHeader };
  return `<w:tr>
    ${tc(para(String(serial), { ...opts, align: 'center' }), 450, shade)}
    ${tc(para(question, opts), 4600, shade)}
    ${tc(para(answer, opts), 4950, shade)}
  </w:tr>`;
}

// 2-column detail row (label | value)
function detailRow(label: string, value: string, isHeader = false): string {
  const shade = isHeader ? 'E8EAED' : undefined;
  return `<w:tr>
    ${tc(para(label, { size: 18, spacingAfter: 40, bold: true }), 4000, shade)}
    ${tc(para(value, { size: 18, spacingAfter: 40 }), 6000, shade)}
  </w:tr>`;
}

// 2-column spec table row (label | value, label right-aligned)
function specRow(label: string, value: string): string {
  return `<w:tr>
    ${tc(para(label, { size: 18, spacingAfter: 40, bold: true }), 2500)}
    ${tc(para(value, { size: 18, spacingAfter: 40 }), 7500)}
  </w:tr>`;
}

function tblPr(totalWidthTwips: number, noOuterBorders = false): string {
  const outerBorder = noOuterBorders ? '' : BORDER;
  return `<w:tblPr>
    <w:tblW w:w="${totalWidthTwips}" w:type="dxa"/>
    <w:tblBorders>
      ${outerBorder}
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="444444"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="444444"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top w:w="80" w:type="dxa"/>
      <w:left w:w="100" w:type="dxa"/>
      <w:bottom w:w="80" w:type="dxa"/>
      <w:right w:w="100" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>`;
}

function qTable(rows: string[]): string {
  return `<w:tbl>${tblPr(10000)}${rows.join('\n')}</w:tbl>`;
}

function detailTable(rows: string[]): string {
  return `<w:tbl>${tblPr(10000)}${rows.join('\n')}</w:tbl>`;
}

// ─── IMAGE HELPERS ────────────────────────────────────────────────────────────

interface ImageEntry {
  rId: string;
  fileName: string;
  data: Uint8Array;
}

/** Decode a data URI to binary and create an image entry */
function decodeImage(dataUri: string, index: number): ImageEntry | null {
  try {
    const match = dataUri.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (!match) return null;
    const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpeg' : match[1];
    const binary = Buffer.from(match[2], 'base64');
    const uint8 = new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
    return {
      rId: `rId_img${index}`,
      fileName: `image${index}.${ext}`,
      data: uint8,
    };
  } catch {
    return null;
  }
}

/** Inline drawing XML for an embedded image */
function imgDrawing(rId: string, cx: number, cy: number, picId: number, name: string): string {
  return `<w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="${picId}" name="${xe(name)}"/>
      <wp:cNvGraphicFramePr>
        <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
      </wp:cNvGraphicFramePr>
      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:nvPicPr>
              <pic:cNvPr id="${picId}" name="${xe(name)}"/>
              <pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="${rId}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing>`;
}

// ─── DOCUMENT SECTIONS ────────────────────────────────────────────────────────

function buildCoverSection(r: ValuationReport): string {
  const vi = r.valuationInputs;
  const owners = (r.currentOwners ?? []).map(o => o.name).join(' & ');
  const address = (r.propertyAddress?.fullAddress ?? '').toUpperCase();

  return [
    emptyP(240),
    para(`${r.companyName ?? ''}`, { bold: true, size: 28, align: 'center', spacingAfter: 40 }),
    r.companySubtitle ? para(r.companySubtitle, { size: 20, align: 'center', spacingAfter: 40 }) : '',
    r.companyAddress ? para(r.companyAddress, { size: 18, align: 'center', spacingAfter: 20 }) : '',
    (r.companyContact || r.companyEmail)
      ? para([r.companyContact, r.companyEmail].filter(Boolean).join('  |  '), { size: 18, align: 'center', spacingAfter: 160 })
      : '',
    para(`VALUATION REPORT – FAIR MARKET VALUE`, { bold: true, size: 24, align: 'center', spacingAfter: 80 }),
    para(address, { bold: true, size: 22, align: 'center', spacingAfter: 80 }),
    r.originalOwner?.trim()
      ? para(`OWNERS IN ${r.originalOwnerYear ?? ''} – ${r.originalOwner}`, { bold: true, size: 20, align: 'center', spacingAfter: 40 })
      : '',
    owners.trim()
      ? para(`CURRENT OWNERS – ${owners}`, { bold: true, size: 20, align: 'center', spacingAfter: 120 })
      : '',
    `<w:tbl>${tblPr(10000, true)}<w:tr>
      ${tc(para(`Ref: ${xe(vi.referenceNo ?? '')}`, { size: 20, bold: true }), 5000)}
      ${tc(para(`Date: ${xe(vi.valuationDate ?? '')}`, { size: 20, bold: true, align: 'right' }), 5000)}
    </w:tr></w:tbl>`,
  ].join('');
}

function buildGeneralSection(r: ValuationReport): string {
  const vi = r.valuationInputs;
  const gd = r.generalDetails;
  const address = (r.propertyAddress?.fullAddress ?? '').toUpperCase();
  const owners = (r.currentOwners ?? []).map(o => o.name).join(' & ');
  const ownersDetail = (r.currentOwners ?? []).map(o => `${o.name} – ${o.share} Share`).join('\n');
  const isJoint = (r.currentOwners?.length ?? 0) > 1;

  const rows = [
    qRow(1, 'Purpose for which valuation is made', `${vi.purpose ?? ''}${vi.bankName ? ` (${vi.bankName})` : ''}`),
    qRow(2, 'Date as on which valuation is made', `${vi.valuationDate ?? ''} for the date ${vi.valuationForDate ?? ''}`),
    qRow(3, 'Name of owner/owners', [
      r.originalOwner?.trim() ? `IN ${r.originalOwnerYear ?? ''} – ${r.originalOwner}` : '',
      owners.trim() ? `Current Owners – ${owners}` : 'N/A',
    ].filter(Boolean).join('\n')),
    qRow(4, 'If the property is under joint ownership/co-ownership, share of each owner.',
      `${isJoint ? 'Joint Ownership' : 'Sole Ownership'}\n${ownersDetail}`),
    qRow(5, 'Brief description of property', `${r.floors?.[0]?.floorName ?? 'the property'} of the ${(gd?.propertyType ?? 'residential').toLowerCase()} property`),
    qRow(6, 'Location, street, and ward no.', address),
    qRow(7, 'Survey / Plot no. of land', 'As above.'),
    qRow(8, 'Is the property situated in residential / mixed area / commercial / industrial area?', gd?.propertyType ?? ''),
    qRow(9, 'Classification of locality – high class / middle class / poor class', gd?.localityClass ?? ''),
    qRow(10, 'Proximity to civic amenities', gd?.proximityToCivicAmenities ?? ''),
    qRow(11, 'Means and proximity to surface communication', gd?.surfaceCommunication ?? ''),
  ];

  return [
    sectionTitle('GENERAL'),
    qTable(rows),
  ].join('');
}

function buildLandSection(r: ValuationReport): string {
  const vi = r.valuationInputs;
  const gd = r.generalDetails;
  const b = r.boundaries;

  const boundaryLines = [
    `North – ${b?.north ?? ''}`,
    `South – ${b?.south ?? ''}`,
    `East – ${b?.east ?? ''}`,
    `West – ${b?.west ?? ''}`,
    ...(b?.northEast ? [`North East – ${b.northEast}`] : []),
    ...(b?.northWest ? [`North West – ${b.northWest}`] : []),
    ...(b?.southEast ? [`South East – ${b.southEast}`] : []),
    ...(b?.southWest ? [`South West – ${b.southWest}`] : []),
  ].join('\n');

  const rows = [
    qRow(12, 'Area of land supported by documentary proof\nshape, dimensions and physical features',
      `Plot Area – ${fmt(vi?.plotArea ?? 0, 4)} Sqm\n${gd?.plotShape ?? ''}`),
    qRow(13, 'Road or lanes on which the land is abutting', boundaryLines),
    qRow(14, 'Is it freehold or lease-hold land?', gd?.isLeasehold ? 'Leasehold' : 'Freehold'),
    qRow(15, 'If lease-hold, name of lessor etc.',
      gd?.isLeasehold ? (gd?.lessorDetails ?? 'N/A') : 'N/A'),
    qRow(16, 'Are there any restrictive covenants?', gd?.restrictiveCovenants ?? 'No'),
    qRow(17, 'Are there any agreements of easement?', gd?.easementAgreements ?? 'No'),
    qRow(18, 'Does the land fall in any town planning area?', gd?.townPlanningArea ?? ''),
    qRow(19, 'Has any contribution been made towards development?', gd?.developmentContribution ?? 'No'),
    qRow(20, 'Has any part of the land been notified for acquisition?', gd?.acquisitionNotification ?? 'No'),
    qRow(21, 'Attach a dimension site plan', 'Owner to attach if required'),
  ];

  const improvRows = [
    qRow(22, 'Attached plans and elevations of all structures', 'Owner to attach if required'),
    qRow(23, 'Furnish technical details of the building on a separate sheet', 'Good Specifications'),
    qRow(24, '(I) Is the building owner occupied / tenanted / both?\n(ii) If partly owner occupied, specify portion & extent.',
      gd?.buildingOccupancy ?? ''),
    qRow(25, 'What is the floor space index permissible & percentage actually utilized?', gd?.floorSpaceIndex ?? 'As per Building Bye-Laws'),
  ];

  const rentRows = [
    qRow(26, 'Name of tenant / leases / licenses etc.\nPortion in occupation.\nMonthly or annual rent.\nGross amount received.',
      'N/A\nN/A\nN/A\nN/A'),
    qRow(27, 'Are any of the occupants related to, or close business associates of the owner?', 'N/A'),
  ];

  return [
    sectionTitle('LAND'),
    qTable(rows),
    sectionTitle('IMPROVEMENTS'),
    qTable(improvRows),
    sectionTitle('RENT'),
    qTable(rentRows),
  ].join('');
}

function buildMoreDetailsSection(r: ValuationReport): string {
  const vi = r.valuationInputs;
  const gd = r.generalDetails;

  const rentRows = [
    qRow(28, 'Is separate amount recovered for use of fixtures like fans, geysers, refrigerators etc.?', 'N/A'),
    qRow(29, 'Give details of water and electricity charges, if any, to be borne by the owner.', 'N/A'),
    qRow(30, 'Has the tenant to bear the whole or part of the cost of repair and maintenance?', 'N/A'),
    qRow(31, 'If a lift is installed, who is to bear the cost of maintenance and operation?', 'N/A'),
    qRow(32, 'If a pump is installed, who has to bear the cost of maintenance?', 'N/A'),
    qRow(33, 'Who has to bear the cost of electricity for common areas?', 'N/A'),
    qRow(34, 'What is the amount of property tax? Who is to bear it?', gd?.propertyTax ?? 'N/A'),
    qRow(35, 'Is the building insured? Give policy no., insured amount, and annual premium.', gd?.buildingInsurance ?? 'N/A'),
    qRow(36, 'Is any dispute between landlord and tenant regarding rent pending in court?', 'N/A'),
    qRow(37, 'Has any standard rent been fixed under any rent control law?', 'N/A'),
  ];

  const saleRows = [
    qRow(38, 'Give instances of sales of immovable property in the locality.', 'Not Available'),
    qRow(39, 'Land rate adopted in this valuation', `Rs ${vi?.landRatePerSqm ?? 0}/- Per Sqm`),
    qRow(40, 'If sale instances are not available, basis of arriving at the land rate', vi?.landRateSource ?? ''),
  ];

  const costRows = [
    qRow(41, 'Year of commencement and year of completion of construction', vi?.yearOfConstruction ?? ''),
    qRow(42, 'What was the method of construction – by contract or employing labour directly / both', 'Both'),
    qRow(43, 'For items done on contract, produce copies of agreement.', 'Not Available'),
    qRow(44, 'For items done by engaging labour directly, give detail rate of materials and labour.', 'Not Available'),
  ];

  return [
    sectionTitle('RENT (Contd.)'),
    qTable(rentRows),
    sectionTitle('SALE'),
    qTable(saleRows),
    sectionTitle('COST OF CONSTRUCTION'),
    qTable(costRows),
  ].join('');
}

function buildTechnicalSection(r: ValuationReport): string {
  const td = r.technicalDetails;
  const bs = r.buildingSpecs;
  const floors = r.floors ?? [];

  const finishingText = floors.length > 0
    ? floors.map((f, i) => `(${String.fromCharCode(97 + i)}) ${f.finishing || 'Cement sand plaster with POP and Paint finish'}`).join('\n')
    : 'Cement sand plaster with POP and Paint finish';

  const rows = [
    qRow(1, 'No. of floors and height of each floor', td?.heightOfFloors ?? ''),
    qRow(2, 'Total Covered area on all Floors', td?.totalCoveredArea ?? ''),
    qRow(3, 'Year of construction', td?.yearOfConstruction ?? ''),
    qRow(4, 'Estimated total life of building', td?.estimatedLife ?? ''),
    qRow(5, 'Type of Construction – Load Bearing Walls / RCC Frame / Steel Frame', td?.constructionType ?? ''),
    qRow(6, 'Type of foundation', td?.foundationType ?? ''),
    qRow(7, 'Walls\n(a) Ground Floor', floors[0]?.walls ?? 'Brick Masonry Walls'),
    qRow(8, 'Partitions', td?.partitions ?? ''),
    qRow(9, 'Doors and windows (Floor wise)\n(a) Ground Floor', floors[0]?.doorsWindows ?? 'Teak Wood'),
    qRow(10, 'Flooring (Floor Wise)\n(a) Ground Floor', bs?.flooring ?? ''),
    qRow(11, 'Finishing (Floor Wise)\n(a) Ground Floor\n(b) First Floor\n(c) Second Floor', finishingText),
    qRow(12, 'Roofing & Terracing', td?.roofingTerracing ?? ''),
    qRow(13, 'Special Architectural decorative features, if any', td?.architecturalFeatures || bs?.exterior || ''),
    qRow(14, '(a) Internal wiring – surface or conduit\n(b) Class of fittings – superior / ordinary / poor',
      `${td?.internalWiring ?? ''}, ${td?.fittingsClass ?? ''}`),
    qRow(15, 'Sanitary installations\n(a) No. of water closets / No. of sinks\n(b) Class of fittings',
      `${td?.noOfWaterClosets ?? 0} WCs / ${td?.noOfSinks ?? 0} Sinks\n${td?.sanitaryFittingsClass ?? ''}`),
    qRow(16, 'Compound wall:\n(a) Height and length\n(b) Type of construction',
      `${td?.compoundWallHeight ?? ''}\n${td?.compoundWallType ?? ''}`),
    qRow(17, 'No. of Lifts and capacity', td?.noOfLifts ?? 'None'),
    qRow(18, 'Underground pump – capacity & type', td?.undergroundPump ?? 'None'),
    qRow(19, 'Overhead water tank – type and capacity', td?.overheadTank ?? ''),
    qRow(20, 'No. of pumps and their horse power', td?.noOfPumps ?? ''),
    qRow(21, 'Roads and paving within the compound – area and type', td?.roadsPaving ?? 'N/A'),
    qRow(22, 'Sewer disposal – whether connected to public sewer; septic tank no. and capacity', td?.sewerDisposal ?? ''),
  ];

  return [
    para('PART-II', { bold: true, size: 24, align: 'center', spacingBefore: 120, spacingAfter: 40 }),
    sectionTitle('BUILDING – TECHNICAL DETAILS'),
    qTable(rows),
  ].join('');
}

function buildDeclaration(r: ValuationReport): string {
  const vi = r.valuationInputs;
  return [
    sectionTitle('DECLARATION'),
    para('I hereby declare that:', { size: 20, spacingAfter: 80 }),
    para('(a) The information furnished in Part-I is true and correct to the best of my knowledge and belief.', { size: 20, spacingAfter: 60 }),
    para('(b) I have no direct or indirect interest in the property valued.', { size: 20, spacingAfter: 200 }),
    `<w:tbl>${tblPr(10000, true)}<w:tr>
      ${tc(para(`Date: ${xe(vi?.valuationDate ?? '')}`, { size: 20, bold: true }), 5000)}
      ${tc(para('Signature of Govt. Registered Valuer', { size: 20, bold: true, align: 'right' }), 5000)}
    </w:tr></w:tbl>`,
  ].join('');
}

function buildValuationBody(r: ValuationReport): string {
  const vi = r.valuationInputs;
  const cv = r.calculatedValues;
  const floors = r.floors ?? [];
  const bs = r.buildingSpecs;

  const floorNames = floors.map(f => f.floorName).filter(Boolean);
  const isWholeProperty = ['Entire Building', 'Villa/Independent House', 'Flat/Apartment']
    .some(n => floorNames.includes(n));

  const joinNatural = (items: string[]) => {
    if (items.length <= 1) return items[0] || '';
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  };

  const floorDescUpper = isWholeProperty || floorNames.length === 0
    ? 'THE'
    : `${joinNatural(floorNames.map(n => n.toUpperCase()))} OF THE`;

  const address = (r.propertyAddress?.fullAddress ?? '').toUpperCase();
  const floorLabel = floors.map(f => f.floorName).filter(Boolean).join(' and ') || 'Ground Floor';
  const multiFloor = floors.length > 1;

  const specRows = [
    specRow('Roof', bs?.roof ?? ''),
    specRow('Brickwork', bs?.brickwork ?? ''),
    specRow('Flooring', bs?.flooring ?? ''),
    specRow('Tiles', bs?.tiles ?? ''),
    specRow('Electrical', bs?.electrical ?? ''),
    specRow('Switches', bs?.electricalSwitches ?? ''),
    specRow('Sanitary', bs?.sanitaryFixtures ?? ''),
    specRow('Woodwork', bs?.woodwork ?? ''),
    specRow('Exterior', bs?.exterior ?? ''),
  ];

  return [
    para(`VALUATION REPORT FOR THE FAIR MARKET VALUE OF ${floorDescUpper} IMMOVABLE PROPERTY SITUATED AT – ${address}`,
      { bold: true, size: 22, spacingAfter: 80 }),
    para(`This valuation report is based on the information and documents provided by the owner and is prepared for the fair market value of ${floorDescUpper.toLowerCase()} immovable property situated at – ${address}`,
      { size: 20, spacingAfter: 80 }),
    para(`The details are furnished with this report. This valuation report is prepared on ${vi?.valuationDate ?? ''}. The area of the plot is ${fmt(vi?.plotArea ?? 0, 4)} Sqm. This valuation report is prepared for the ${isWholeProperty ? 'entire property' : floorLabel.toLowerCase()} of the building.`,
      { size: 20, spacingAfter: 120 }),
    sectionTitle('Specification of Construction'),
    `<w:tbl>${tblPr(10000)}${specRows.join('\n')}</w:tbl>`,
    para('On the basis of above specification, I assess the cost of construction on covered area basis.',
      { size: 20, spacingAfter: 80 }),
  ].join('');
}

function buildCalculations(r: ValuationReport): string {
  const vi = r.valuationInputs;
  const cv = r.calculatedValues;
  const floors = r.floors ?? [];
  const floorLabel = floors.map(f => f.floorName).filter(Boolean).join(' and ') || 'Ground Floor';
  const multiFloor = floors.length > 1;
  const area = floors[0]?.area ?? 0;

  const depreciationRows = [
    `<w:tr>
      <w:trPr><w:trHeight w:val="320"/></w:trPr>
      ${tc(para('S.no', { bold: true, size: 18, align: 'center' }), 700, 'E8EAED')}
      ${tc(para('Floor', { bold: true, size: 18 }), 2000, 'E8EAED')}
      ${tc(para('Year of Construction', { bold: true, size: 18 }), 1500, 'E8EAED')}
      ${tc(para(`Age as on ${vi?.valuationForDate ?? ''}`, { bold: true, size: 18 }), 1500, 'E8EAED')}
      ${tc(para('Est. Life', { bold: true, size: 18 }), 1200, 'E8EAED')}
      ${tc(para('Depreciated Value', { bold: true, size: 18 }), 3100, 'E8EAED')}
    </w:tr>`,
    `<w:tr>
      ${tc(para('1', { size: 18, align: 'center' }), 700)}
      ${tc(para(floorLabel, { size: 18 }), 2000)}
      ${tc(para(vi?.yearOfConstruction ?? '', { size: 18 }), 1500)}
      ${tc(para(`${vi?.ageAtValuation ?? 0} Years`, { size: 18 }), 1500)}
      ${tc(para(`${vi?.estimatedLifeYears ?? 0} yrs`, { size: 18 }), 1200)}
      ${tc(para(`${cv?.remainingLife ?? 0}/${vi?.estimatedLifeYears ?? 0} × ${formatCurrency(cv?.costOfConstruction ?? 0)}\n${formatCurrency(cv?.depreciatedValue ?? 0)}`, { size: 18, bold: false }), 3100)}
    </w:tr>`,
    `<w:tr>
      ${tc(para('', { size: 18 }), 700, 'F0F1F3')}
      ${tc(para('', { size: 18 }), 2000, 'F0F1F3')}
      ${tc(para('', { size: 18 }), 1500, 'F0F1F3')}
      ${tc(para('', { size: 18 }), 1500, 'F0F1F3')}
      ${tc(para('Total Depreciated Value', { size: 18, bold: true, align: 'right' }), 1200, 'F0F1F3')}
      ${tc(para(formatCurrency(cv?.depreciatedValue ?? 0), { size: 18, bold: true }), 3100, 'F0F1F3')}
    </w:tr>`,
  ];

  return [
    sectionTitle('CALCULATION OF VALUE OF CONSTRUCTION'),
    para('As per Plinth Area Rates [PAR] 1.1.92 with base as 100', { size: 20, spacingAfter: 40 }),
    para(`Cost index as on ${vi?.valuationForDate ?? ''} = ${vi?.costIndex ?? 0}`, { size: 20, spacingAfter: 80 }),

    boldPara(`1. ${floorLabel}  (Year of construction: ${vi?.yearOfConstruction ?? ''})`),
    para(`${multiFloor ? 'Total area of valued portions' : 'Area of floor'} = ${fmt(area, 3)} Sqm`, { size: 20, indent: 400 }),
    para(`Plinth area rate (as on 1.1.92) = Rs ${vi?.plinthAreaRate ?? 0} per Sqm`, { size: 20, indent: 400 }),
    para(`Cost index as on ${vi?.valuationForDate ?? ''} = ${vi?.costIndex ?? 0}`, { size: 20, indent: 400 }),
    para(`Rate of construction = ${vi?.plinthAreaRate ?? 0} × ${((vi?.costIndex ?? 0) / 100).toFixed(2)} = Rs ${fmt(cv?.rateOfConstruction ?? 0, 1)} per Sqm`, { size: 20, indent: 400 }),
    para(`Percentage increase due to superior specifications = ${vi?.specificationIncreasePercent ?? 0}%`, { size: 20, indent: 400 }),
    para(`Net rate = ${fmt(1 + (vi?.specificationIncreasePercent ?? 0) / 100, 2)} × ${fmt(cv?.rateOfConstruction ?? 0, 1)} = Rs ${fmt(cv?.netRateOfConstruction ?? 0, 2)} per Sqm`, { size: 20, indent: 400 }),
    para(`Cost of construction = ${fmt(area, 3)} Sqm × Rs ${fmt(cv?.netRateOfConstruction ?? 0, 2)} per Sqm = ${formatCurrency(cv?.costOfConstruction ?? 0)}`,
      { size: 20, bold: true, indent: 400, spacingAfter: 120 }),

    sectionTitle('DEPRECIATION DUE TO AGE OF THE CONSTRUCTION'),
    `<w:tbl>${tblPr(10000)}${depreciationRows.join('\n')}</w:tbl>`,
    emptyP(80),

    sectionTitle('VALUE OF LAND SHARE'),
    para(`Area of plot = ${fmt(vi?.plotArea ?? 0, 4)} Sqm`, { size: 20, indent: 400 }),
    para(`Rate of land = Rs ${vi?.landRatePerSqm ?? 0} Per Sqm  (${vi?.landRateSource ?? ''})`, { size: 20, indent: 400 }),
  ].join('');
}

function buildFinalValue(r: ValuationReport): string {
  const vi = r.valuationInputs;
  const cv = r.calculatedValues;

  return [
    para(`Percentage increase in land rate due to location and year of valuation [${vi?.valuationForDate ?? ''}] = ${vi?.locationIncreasePercent ?? 0}%`,
      { size: 20, spacingAfter: 80 }),
    para(`Net rate = ${fmt(1 + (vi?.locationIncreasePercent ?? 0) / 100, 2)} × ${vi?.landRatePerSqm ?? 0} = Rs ${fmt(cv?.netLandRate ?? 0, 0)}/-`, { size: 20, indent: 400 }),
    para(`Value of land = ${fmt(vi?.plotArea ?? 0, 4)} Sqm @ Rs ${fmt(cv?.netLandRate ?? 0, 0)}/- per Sqm = ${formatCurrency(cv?.totalLandValue ?? 0)}`, { size: 20, indent: 400 }),
    para(`Share of land = ${vi?.landShareFraction ?? vi?.landShareDecimal?.toString() ?? '1/1'}`, { size: 20, indent: 400 }),
    para(`Value of land share = ${vi?.landShareFraction ?? vi?.landShareDecimal?.toString() ?? '1/1'} × ${formatCurrency(cv?.totalLandValue ?? 0)} = ${formatCurrency(cv?.landShareValue ?? 0)}`,
      { size: 20, bold: true, indent: 400, spacingAfter: 120 }),

    sectionTitle('VALUE OF THE PROPERTY = VALUE OF LAND SHARE + VALUE OF CONSTRUCTION'),
    para(`= ${formatCurrency(cv?.landShareValue ?? 0)} + ${formatCurrency(cv?.depreciatedValue ?? 0)}`, { size: 20, align: 'center' }),
    para(`= ${formatCurrency(cv?.totalPropertyValue ?? 0)}`, { size: 20, align: 'center' }),
    para(`Say  ${formatCurrency(cv?.roundedValue ?? 0)}`, { size: 24, bold: true, align: 'center', spacingAfter: 120 }),

    para(`I assess the fair market value of the valuated property as on ${vi?.valuationForDate ?? ''} to be  Say ${formatCurrency(cv?.roundedValue ?? 0)}`,
      { size: 20, align: 'center', spacingBefore: 120, spacingAfter: 40 }),
    para(`[ ${cv?.valueInWords ?? ''} ]`, { size: 20, bold: true, align: 'center', spacingAfter: 200 }),

    `<w:tbl>${tblPr(10000, true)}<w:tr>
      ${tc(para(`Date: ${xe(vi?.valuationDate ?? '')}`, { size: 20, bold: true }), 5000)}
      ${tc(para(`${xe(r.valuerName ?? '')}\n${xe(r.valuerDesignation ?? '')}\n${xe(r.valuerCategoryNo ?? '')}`, { size: 20, bold: true, align: 'right' }), 5000)}
    </w:tr></w:tbl>`,
  ].join('');
}

function buildPhotoPages(photos: string[], images: ImageEntry[]): string {
  if (photos.length === 0) return '';
  const parts: string[] = [
    pageBreak(),
    sectionTitle('PHOTOGRAPHS OF PROPERTY'),
  ];

  // 2-column photo grid using a table — 4800 × 4800 EMU per photo (approx 5.25cm)
  // Content width: ~10466 twips; 1 twip = 635 EMU; each photo col ≈ 5100 twips = 3,238,500 EMU
  const imgW = 3200000; // ~3.5 inches
  const imgH = 3200000;

  let picId = 100; // start pic IDs high to avoid conflicts

  for (let i = 0; i < photos.length; i += 2) {
    const imgA = images[i];
    const imgB = images[i + 1];

    const cellA = imgA
      ? `<w:tc>${tcPr(5000)}<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${imgDrawing(imgA.rId, imgW, imgH, picId++, `Photo ${i + 1}`)}</w:r></w:p>
         ${para(`Photo ${i + 1}`, { size: 16, align: 'center', spacingAfter: 40 })}</w:tc>`
      : '';
    const cellB = imgB
      ? `<w:tc>${tcPr(5000)}<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${imgDrawing(imgB.rId, imgW, imgH, picId++, `Photo ${i + 2}`)}</w:r></w:p>
         ${para(`Photo ${i + 2}`, { size: 16, align: 'center', spacingAfter: 40 })}</w:tc>`
      : `<w:tc>${tcPr(5000)}<w:p/></w:tc>`;

    parts.push(`<w:tbl>${tblPr(10000, true)}<w:tr>${cellA}${cellB}</w:tr></w:tbl>`);
    parts.push(emptyP(120));
  }

  return parts.join('');
}

// ─── HEADER / FOOTER XML ──────────────────────────────────────────────────────

function buildHeader(r: ValuationReport): string {
  const color = '1a5276';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="10000" w:type="dxa"/>
      <w:tblBorders>
        <w:bottom w:val="single" w:sz="12" w:space="2" w:color="${color}"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="7000" w:type="dxa"/><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders></w:tcPr>
        <w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>${xe(r.companyName ?? '')}</w:t></w:r></w:p>
        ${r.companyAddress ? `<w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>${xe(r.companyAddress)}</w:t></w:r></w:p>` : ''}
        ${(r.companyContact || r.companyEmail) ? `<w:p><w:pPr><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>${xe([r.companyContact, r.companyEmail].filter(Boolean).join('  |  '))}</w:t></w:r></w:p>` : ''}
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders><w:vAlign w:val="bottom"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>${xe(r.valuerName ?? '')}</w:t></w:r></w:p>
        ${r.valuerQualification ? `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>${xe(r.valuerQualification)}</w:t></w:r></w:p>` : ''}
        ${r.valuerDesignation ? `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>${xe(r.valuerDesignation)}</w:t></w:r></w:p>` : ''}
        ${r.valuerCategoryNo ? `<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="20"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>${xe(r.valuerCategoryNo)}</w:t></w:r></w:p>` : ''}
      </w:tc>
    </w:tr>
  </w:tbl>
</w:hdr>`;
}

function buildFooter(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="right"/>
      <w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="bbbbbb"/></w:pBdr>
      <w:spacing w:before="80" w:after="0"/>
    </w:pPr>
    <w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t xml:space="preserve">Page </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>`;
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export async function generateDocx(report: ValuationReport): Promise<Buffer> {
  const zip = new JSZip();

  // ── Decode photos (skip nulls / non-base64 URLs) ──────────────────────────
  const rawPhotos = (report.photos ?? []).filter(p => p?.startsWith('data:'));
  // Skip cover photo (index 0) for body photo grid — it's already first
  const bodyPhotos = rawPhotos.slice(1);

  const imageEntries: ImageEntry[] = [];
  bodyPhotos.forEach((photo, i) => {
    const entry = decodeImage(photo, i + 1); // start at 1 (0 = cover)
    if (entry) imageEntries.push(entry);
  });

  // Cover photo entry
  let coverImgEntry: ImageEntry | null = null;
  if (rawPhotos.length > 0) {
    coverImgEntry = decodeImage(rawPhotos[0], 0);
  }

  // ── Build relationships ───────────────────────────────────────────────────
  const imgRels = [
    ...(coverImgEntry ? [coverImgEntry] : []),
    ...imageEntries,
  ].map(img =>
    `<Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.fileName}"/>`
  ).join('\n');

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId_hdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId_ftr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  ${imgRels}
</Relationships>`;

  // ── Build content types ───────────────────────────────────────────────────
  const allImages = [coverImgEntry, ...imageEntries].filter(Boolean) as ImageEntry[];
  const hasJpeg = allImages.some(i => i.fileName.endsWith('.jpeg'));
  const hasPng = allImages.some(i => i.fileName.endsWith('.png'));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasJpeg ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : ''}
  ${hasPng ? '<Default Extension="png" ContentType="image/png"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`;

  // ── Cover photo inline image ──────────────────────────────────────────────
  let coverPhotoXml = '';
  if (coverImgEntry) {
    // ~5 inches wide, square (photos are 600×600)
    const cxW = 4572000;
    coverPhotoXml = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr><w:r>${imgDrawing(coverImgEntry.rId, cxW, cxW, 1, 'Cover Photo')}</w:r></w:p>`;
  }

  // ── Section properties (page size, margins, header/footer refs) ───────────
  const sectPr = `<w:sectPr>
    <w:headerReference w:type="default" r:id="rId_hdr"/>
    <w:footerReference w:type="default" r:id="rId_ftr"/>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="720" w:right="720" w:bottom="900" w:left="720" w:header="500" w:footer="500" w:gutter="0"/>
  </w:sectPr>`;

  // ── Assemble document body ────────────────────────────────────────────────
  const bodyXml = [
    buildCoverSection(report),
    coverPhotoXml,
    pageBreak(),

    buildGeneralSection(report),
    pageBreak(),

    buildLandSection(report),
    pageBreak(),

    buildMoreDetailsSection(report),
    pageBreak(),

    buildTechnicalSection(report),
    pageBreak(),

    buildDeclaration(report),
    pageBreak(),

    buildValuationBody(report),
    pageBreak(),

    buildCalculations(report),
    pageBreak(),

    buildFinalValue(report),

    imageEntries.length > 0 ? buildPhotoPages(bodyPhotos, imageEntries) : '',

    sectPr,
  ].join('\n');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
${bodyXml}
  </w:body>
</w:document>`;

  // ── Assemble ZIP ──────────────────────────────────────────────────────────
  zip.file('[Content_Types].xml', contentTypes);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/document.xml', documentXml);
  zip.file('word/header1.xml', buildHeader(report));
  zip.file('word/footer1.xml', buildFooter());
  zip.file('word/_rels/document.xml.rels', docRels);

  // Embed all images
  for (const img of allImages) {
    zip.file(`word/media/${img.fileName}`, img.data, { binary: true });
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return buf;
}
