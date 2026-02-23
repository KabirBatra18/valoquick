import { NextRequest, NextResponse } from 'next/server';
import { ValuationReport } from '@/types/valuation';
import { verifyAuth, adminDb, verifySession } from '@/lib/firebase-admin';
import { TRIAL_LIMIT } from '@/types/subscription';
import { FirmBranding, ValuerInfo } from '@/types/branding';
import { getTemplateCSS, renderHeader, renderCondensedHeader, renderFooter, renderPuppeteerFooter, mergeBrandingWithDefaults } from '@/lib/pdf-templates';
import { htmlToPdfBase64 } from '@/lib/puppeteer';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import sharp from 'sharp';

// Configure for serverless - allow up to 5 minutes for PDF generation
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimited = rateLimit(request, 'generate', RATE_LIMITS.expensive);
    if (rateLimited) return rateLimited;

    // Verify authentication - only authenticated users can generate reports
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.user.uid;

    // Verify session is valid (single-device enforcement)
    const sessionId = request.headers.get('x-session-id');
    const sessionResult = await verifySession(userId, sessionId);
    if (!sessionResult.valid) {
      return NextResponse.json(
        { error: sessionResult.error || 'Session expired' },
        { status: 401 }
      );
    }

    // Server-side subscription/trial validation
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const firmId = userData?.firmId;
    let canGenerate = false;
    let firmBranding: FirmBranding = mergeBrandingWithDefaults(null);

    // Fetch firm data in parallel: subscription + firm doc (branding) in one batch
    if (firmId) {
      const [subscriptionDoc, firmDoc] = await Promise.all([
        adminDb.collection('subscriptions').doc(firmId).get(),
        adminDb.collection('firms').doc(firmId).get(),
      ]);

      // Check subscription
      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data();
        if (subscription?.status === 'active' && subscription?.currentPeriodEnd) {
          const periodEnd = subscription.currentPeriodEnd.toDate();
          const now = new Date();
          const gracePeriodEnd = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000);
          if (now <= gracePeriodEnd) {
            canGenerate = true;
          }
        }
      }

      // Extract branding from firm doc (already fetched)
      if (firmDoc.exists && firmDoc.data()?.branding) {
        firmBranding = mergeBrandingWithDefaults(firmDoc.data()!.branding);
      }
    }

    // If not subscribed, check trial status
    if (!canGenerate) {
      const userTrialCount = userData?.trialReportsUsed || 0;
      if (userTrialCount < TRIAL_LIMIT) {
        canGenerate = true;
      }
    }

    if (!canGenerate) {
      return NextResponse.json(
        { error: 'Trial limit reached. Please subscribe to continue generating reports.' },
        { status: 403 }
      );
    }

    // Fetch firm branding configuration
    let logoBase64: string | null = null;

    if (firmId) {
      // Convert logo URL to base64 for PDF embedding
      if (firmBranding.logoUrl) {
        try {
          const logoResponse = await fetch(firmBranding.logoUrl);
          if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const mimeType = logoResponse.headers.get('content-type') || 'image/png';
            logoBase64 = `data:${mimeType};base64,${Buffer.from(logoBuffer).toString('base64')}`;
          }
        } catch (e) {
          console.error('Failed to fetch logo for PDF:', e);
        }
      }
    }

    const data: ValuationReport = await request.json();

    // Convert photo URLs to base64 for PDF embedding
    // Uses sharp to resize to 600x600 — handles raw uploads that skipped client compression
    if (data.photos && data.photos.length > 0) {
      const base64Photos = await Promise.all(
        data.photos.map(async (photoUrl) => {
          if (photoUrl.startsWith('data:')) return photoUrl; // Already base64
          try {
            const response = await fetch(photoUrl);
            if (!response.ok) return null;
            const inputBuffer = Buffer.from(await response.arrayBuffer());
            // Resize to 600x600 center-crop, JPEG quality 60 — keeps PDF small
            const resized = await sharp(inputBuffer)
              .resize(600, 600, { fit: 'cover', position: 'centre' })
              .jpeg({ quality: 60 })
              .toBuffer();
            return `data:image/jpeg;base64,${resized.toString('base64')}`;
          } catch {
            return null;
          }
        })
      );
      data.photos = base64Photos.filter(Boolean) as string[];
    }

    // Check if preview mode (return HTML without Puppeteer)
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    // Generate HTML content — in preview mode, headers/footers are embedded in HTML;
    // in PDF mode, they're empty because Puppeteer renders them natively on every page
    const htmlContent = generateHTML(data, firmBranding, logoBase64, isPreview);

    if (isPreview) {
      return NextResponse.json({ html: htmlContent });
    }

    // Puppeteer footer for reliable page numbering (headers are embedded in HTML)
    const footerTemplate = renderPuppeteerFooter(firmBranding);

    const pdfBase64 = await htmlToPdfBase64(htmlContent, {
      footerTemplate,
      marginTop: '12mm',
      marginBottom: '15mm',
    });

    return NextResponse.json({
      pdf: pdfBase64,
      docx: pdfBase64, // For now, using same content. Will add DOCX later
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate document' },
      { status: 500 }
    );
  }
}

function generateAddendumPages(
  templateId: string | undefined,
  ext: NonNullable<ValuationReport['extendedData']>,
  calculatedValues: { roundedValue: number },
  headerHtml: string,
  footerHtml: string,
  formatCurrency: (n: number) => string,
  isBank: boolean,
  isPSU: boolean,
  isIT: boolean,
): string {
  if (!isBank && !isIT) return '';

  let pages = '';

  // LEGAL & REGULATORY COMPLIANCE (Bank templates only)
  if (isBank) {
    pages += `
    <div class="page">
      ${headerHtml}
      <p class="section-title">LEGAL &amp; REGULATORY COMPLIANCE</p>
      <table class="detail-table">
        <tr><td>Encumbrances</td><td>${ext.encumbrances || 'Nil'}</td></tr>
        <tr><td>Building Plan Sanction</td><td>${ext.buildingPlanSanction || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Approval Authority</td><td>${ext.approvalAuthority || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Plan Violations</td><td>${ext.planViolations || 'None observed'}</td></tr>
        <tr><td>Occupancy Certificate</td><td>${ext.occupancyCertificateStatus || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Unauthorized Constructions</td><td>${ext.unauthorizedConstructions || 'None observed'}</td></tr>
        <tr><td>SARFAESI Compliant</td><td>${ext.sarfaesiCompliant || '<span class="na">N/A</span>'}</td></tr>
        ${isPSU ? `
        <tr><td>FAR/FSI Permitted</td><td>${ext.farFsiPermitted || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>FAR/FSI Consumed</td><td>${ext.farFsiConsumed || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Ground Coverage</td><td>${ext.groundCoverage || '<span class="na">N/A</span>'}</td></tr>
        ` : ''}
      </table>

      ${isPSU ? `
      <p class="section-title" style="margin-top: 20px;">RENTAL &amp; TENANCY DETAILS</p>
      <table class="detail-table">
        <tr><td>Occupied by Tenant</td><td>${ext.isOccupiedByTenant ? 'Yes' : 'No'}</td></tr>
        ${ext.isOccupiedByTenant ? `
        <tr><td>Number of Tenants</td><td>${ext.numberOfTenants || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Monthly Rent</td><td>${ext.monthlyRent ? formatCurrency(ext.monthlyRent) : '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Tenancy Duration</td><td>${ext.tenancyDuration || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Tenancy Status</td><td>${ext.tenancyStatus || '<span class="na">N/A</span>'}</td></tr>
        ` : ''}
        <tr><td>Reasonable Letting Value</td><td>${ext.reasonableLettingValue ? formatCurrency(ext.reasonableLettingValue) : '<span class="na">N/A</span>'}</td></tr>
      </table>
      ` : ''}
      ${footerHtml}
    </div>`;

    // MARKETABILITY ASSESSMENT + VALUATION SUMMARY (All bank templates)
    pages += `
    <div class="page">
      ${headerHtml}
      <p class="section-title">MARKETABILITY ASSESSMENT</p>
      <table class="detail-table">
        <tr><td>Location Attributes</td><td>${ext.locationAttributes || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Comparable Sale Prices</td><td>${ext.comparableSalePrices || '<span class="na">Not Available</span>'}</td></tr>
        <tr><td>Demand-Supply Assessment</td><td>${ext.demandSupplyComment || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Last Two Transactions</td><td>${ext.lastTwoTransactions || '<span class="na">Not Available</span>'}</td></tr>
        <tr><td>Market Rate Trend</td><td>${ext.marketRateTrend || '<span class="na">N/A</span>'}</td></tr>
      </table>

      <p class="section-title" style="margin-top: 20px;">VALUATION SUMMARY</p>
      <table class="detail-table">
        <tr><td>Guideline Value (Land)</td><td>${ext.guidelineValueLand ? formatCurrency(ext.guidelineValueLand) : '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Guideline Value (Building)</td><td>${ext.guidelineValueBuilding ? formatCurrency(ext.guidelineValueBuilding) : '<span class="na">N/A</span>'}</td></tr>
        <tr><td><strong>Fair Market Value</strong></td><td><strong>${formatCurrency(calculatedValues.roundedValue)}</strong></td></tr>
        <tr><td>Forced Sale Value</td><td>${ext.forcedSaleValue ? formatCurrency(ext.forcedSaleValue) : '<span class="na">N/A</span>'}</td></tr>
        ${isPSU ? `
        <tr><td>Insurance Value</td><td>${ext.insuranceValue ? formatCurrency(ext.insuranceValue) : '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Variation Justification</td><td>${ext.variationJustification || '<span class="na">N/A</span>'}</td></tr>
        ` : ''}
        <tr><td>Valuation Methodology</td><td>${ext.valuationMethodology || 'Cost Approach + Market Comparison'}</td></tr>
      </table>
      ${footerHtml}
    </div>`;
  }

  // GUIDELINE VALUE COMPARISON — Section 50C (Income Tax only)
  if (isIT) {
    pages += `
    <div class="page">
      ${headerHtml}
      <p class="section-title">GUIDELINE VALUE COMPARISON (Section 50C / 56(2)(x))</p>
      <table class="detail-table">
        <tr><td>Guideline Value (Land)</td><td>${ext.guidelineValueLand ? formatCurrency(ext.guidelineValueLand) : '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Guideline Value (Building)</td><td>${ext.guidelineValueBuilding ? formatCurrency(ext.guidelineValueBuilding) : '<span class="na">N/A</span>'}</td></tr>
        <tr><td><strong>Fair Market Value (Assessed)</strong></td><td><strong>${formatCurrency(calculatedValues.roundedValue)}</strong></td></tr>
        <tr><td>Variation Justification</td><td>${ext.variationJustification || '<span class="na">N/A</span>'}</td></tr>
        <tr><td>Valuation Methodology</td><td>${ext.valuationMethodology || 'Cost Approach + Market Comparison'}</td></tr>
      </table>
      ${footerHtml}
    </div>`;
  }

  return pages;
}

function generateHTML(data: ValuationReport, branding: FirmBranding, logoBase64: string | null, isPreview: boolean): string {
  const {
    valuerName,
    valuerQualification,
    valuerDesignation,
    valuerCategoryNo,
    propertyAddress,
    boundaries,
    originalOwner,
    originalOwnerYear,
    currentOwners,
    valuationInputs,
    floors,
    technicalDetails,
    generalDetails,
    buildingSpecs,
    calculatedValues,
    photos,
    location,
    templateId,
    extendedData,
  } = data;

  // Template grouping for conditional PDF sections
  const PSU_BANKS = ['sbi', 'pnb', 'uco'];
  const PRIVATE_BANKS = ['axis', 'hdfc'];
  const ALL_BANKS = [...PSU_BANKS, ...PRIVATE_BANKS];
  const isBank = templateId ? ALL_BANKS.includes(templateId) : false;
  const isPSU = templateId ? PSU_BANKS.includes(templateId) : false;
  const isIT = templateId === 'income-tax';
  const ext = extendedData || {};

  const valuerInfo: ValuerInfo = {
    name: valuerName,
    qualification: valuerQualification,
    designation: valuerDesignation,
    categoryNo: valuerCategoryNo,
  };

  const currentOwnersText = currentOwners.map(o => `${o.name} – ${o.share} Share`).join('<br>');
  const currentOwnersShort = currentOwners.map(o => o.name).join(' & ');
  const fullAddressUpper = propertyAddress.fullAddress.toUpperCase();

  // Dynamic property description based on floors being valued
  const floorNames = floors.map(f => f.floorName).filter(Boolean);
  const floorDescUpper = floorNames.length === 1
    ? `${floorNames[0].toUpperCase()} OF THE`
    : floorNames.length > 1
      ? `${floorNames.map(n => n.toUpperCase()).join(', ')} OF THE`
      : 'THE';
  const floorDescSentence = floorNames.length === 1
    ? floorNames[0]
    : floorNames.length > 1
      ? floorNames.join(', ')
      : 'the property';
  const floorListSentence = floorNames.length > 0
    ? `the ${floorNames.join(', ').toLowerCase()}`
    : 'the property';

  // Format numbers for display — Indian grouping (lakhs/crores)
  const formatCurrency = (num: number) => {
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
      if (remaining.length > 0) {
        grouped = remaining + ',' + grouped;
      }
    }
    return `Rs ${grouped}.${decPart}/-`;
  };
  const formatNumber = (num: number, decimals = 2) => num.toFixed(decimals);

  // Full header on cover page (page 1), condensed on pages 2+ — always embedded in HTML
  const fullHeaderHtml = renderHeader(branding, valuerInfo, logoBase64);
  const headerHtml = renderCondensedHeader(branding, valuerInfo.name);
  // Footer: embedded in preview, Puppeteer native in PDF (for reliable page numbers on every page)
  const footerHtml = isPreview ? renderFooter(branding) : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${getTemplateCSS(branding)}
  </style>
</head>
<body${isPreview ? ' class="preview-mode"' : ''}>
  <!-- Page 1: Cover Page (full header) -->
  <div class="page">
    ${fullHeaderHtml}

    <div class="cover-title">
      VALUATION REPORT FOR THE FAIR MARKET VALUE OF ${floorDescUpper} IMMOVABLE PROPERTY SITUATED AT – ${fullAddressUpper}
    </div>

    <div class="cover-owners">
      <p><strong>OWNERS – IN ${originalOwnerYear} – ${originalOwner}</strong></p>
      <p><strong>CURRENT OWNERS – ${currentOwnersShort}</strong></p>
    </div>

    <div class="cover-meta">
      <p><strong>ON BEHALF OF OWNERS</strong></p>
      ${(valuationInputs.bankName && valuationInputs.bankName.trim() && !isIT) ? `<p style="margin-top: 6px;"><strong>SUBMITTED TO: ${valuationInputs.bankName.toUpperCase()}</strong></p>` : ''}
    </div>

    <div class="ref-date">
      <span>Ref: ${valuationInputs.referenceNo}</span>
      <span>Date: ${valuationInputs.valuationDate}</span>
    </div>

    ${photos.length > 0 ? `
    <div class="cover-photo">
      <img src="${photos[0]}" alt="Property Photo">
    </div>
    ` : ''}
    ${footerHtml}
  </div>

  <!-- Page 2: General Details -->
  <div class="page">
    ${headerHtml}

    <div class="title">
      VALUATION REPORT FOR THE FAIR MARKET VALUE OF ${floorDescUpper} IMMOVABLE PROPERTY SITUATED AT – ${fullAddressUpper}
    </div>

    <div class="owners">
      <p><strong>OWNERS – IN ${originalOwnerYear} – ${originalOwner}</strong></p>
      <p><strong>CURRENT OWNERS – ${currentOwnersShort}</strong></p>
    </div>

    <div class="ref-date">
      <span>Ref: ${valuationInputs.referenceNo}</span>
      <span>Date: ${valuationInputs.valuationDate}</span>
    </div>

    <p class="section-title">GENERAL</p>
    <table class="q-table">
      <tr><td>1</td><td>Purpose for which valuation is made</td><td>${valuationInputs.purpose}${valuationInputs.bankName ? ` (${valuationInputs.bankName})` : ''}</td></tr>
      <tr><td>2</td><td>Date as on which valuation is made</td><td>${valuationInputs.valuationDate} for the date ${valuationInputs.valuationForDate}</td></tr>
      <tr><td>3</td><td>Name of owner/owners</td><td>IN ${originalOwnerYear} – ${originalOwner}<br>Current Owners – ${currentOwnersShort}</td></tr>
      <tr><td>4</td><td>If the property is under joint ownership/co-ownership, share of each owner.</td><td>Joint Ownership<br>${currentOwnersText}</td></tr>
      <tr><td>5</td><td>Brief description of property</td><td>${floorDescSentence} of the ${generalDetails.propertyType?.toLowerCase() || 'residential'} property${floors.length > 0 ? ` which consists of ${floors.map(f => f.floorName).join(', ')}` : ''}</td></tr>
      <tr><td>6</td><td>Location, street, and ward no.</td><td>${fullAddressUpper}</td></tr>
      <tr><td>7</td><td>Survey/ Plot no. of land</td><td>As above.</td></tr>
      <tr><td>8</td><td>Is the property situated in residential/ mixed area/ commercial/ industrial area?</td><td>${generalDetails.propertyType}</td></tr>
      <tr><td>9</td><td>Classification of locality- high class/ middle class/ poor class</td><td>${generalDetails.localityClass}</td></tr>
      <tr><td>10</td><td>Proximity to civic amenities</td><td>${generalDetails.proximityToCivicAmenities}</td></tr>
      <tr><td>11</td><td>Means and proximity to surface communication by which the locality is served</td><td>${generalDetails.surfaceCommunication}</td></tr>
    </table>
    ${footerHtml}
  </div>

  <!-- Page 3: Land & Improvements -->
  <div class="page">
    ${headerHtml}
    <p class="section-title">LAND</p>
    <table class="q-table">
      <tr><td>12</td><td>Area of land supported by documentary proof<br>shape, dimensions and physical features</td><td>Plot Area – ${formatNumber(valuationInputs.plotArea, 4)} Sqm<br>${generalDetails.plotShape}</td></tr>
      <tr><td>13</td><td>Road or lanes on which the land is abutting</td><td>North – ${boundaries.north}<br>South – ${boundaries.south}<br>East – ${boundaries.east}<br>West – ${boundaries.west}</td></tr>
      <tr><td>14</td><td>Is it freehold or lease-hold land?</td><td>${generalDetails.isLeasehold ? 'Leasehold' : 'Freehold'}</td></tr>
      <tr><td>15</td><td>If lease-hold, the name of lessor etc.<br>(i) initial premium<br>(ii) Ground rent payable<br>(iii) Unearned increase payable to the lessor in the event of sale or transfer</td><td>${generalDetails.isLeasehold ? generalDetails.lessorDetails || '<span class="na">N/A</span>' : '<span class="na">N/A</span>'}</td></tr>
      <tr><td>16</td><td>Are there any restrictive covenant in regard to use of land? If so, attach a copy of the covenant</td><td>${generalDetails.restrictiveCovenants}</td></tr>
      <tr><td>17</td><td>Are there any agreements of easement? If so, attach copies</td><td>${generalDetails.easementAgreements}</td></tr>
      <tr><td>18</td><td>Does the land fall in an area included in any town planning of government or any statutory body? If so, give particulars</td><td>${generalDetails.townPlanningArea}</td></tr>
      <tr><td>19</td><td>Has any contribution been made towards development or is any demand for such contribution still outstanding?</td><td>${generalDetails.developmentContribution}</td></tr>
      <tr><td>20</td><td>Has the whole or part of the land been notified for acquisition by government or any statutory body? Give date of the notification.</td><td>${generalDetails.acquisitionNotification}</td></tr>
      <tr><td>21</td><td>Attach a dimension site plan</td><td><span class="na">Owner to attach if required</span></td></tr>
    </table>

    <p class="section-title">IMPROVEMENTS</p>
    <table class="q-table">
      <tr><td>22</td><td>Attached plans and elevations of all structures standing on the land & layout plan.</td><td><span class="na">Owner to attach if required</span></td></tr>
      <tr><td>23</td><td>Furnish technical details of the building on a separate sheet</td><td>Good Specifications</td></tr>
      <tr><td>24</td><td>(I) Is the building owner occupied/ tenanted/ both<br>(ii) If partly owner occupied, specify portion & extent of area under owner occupation?</td><td>${generalDetails.buildingOccupancy}</td></tr>
      <tr><td>25</td><td>What is the floor space index permissible & Percentage actually utilized?</td><td>${generalDetails.floorSpaceIndex}</td></tr>
    </table>

    <p class="section-title">RENT</p>
    <table class="q-table">
      <tr><td>26</td><td>(I) Name of tenant/ leases/ licenses etc.<br>(ii) Portion in their occupation.<br>(iii) Monthly or annual rent/ compensation.<br>(iv) Gross amount received for the whole property</td><td><span class="na">N/A<br>N/A<br>N/A<br>N/A</span></td></tr>
      <tr><td>27</td><td>Are any of the occupants related to, or close business associates of the owner?</td><td><span class="na">N/A</span></td></tr>
    </table>
    ${footerHtml}
  </div>

  <!-- Page 4: More Details -->
  <div class="page">
    ${headerHtml}
    <p class="cont-label">RENT (Contd.)</p>
    <table class="q-table">
      <tr><td>28</td><td>Is separate amount being recovered for the use of fixtures like fans, geysers, refrigerators, cooking ranges, built in ward robes etc. or for service charges? If so, give details.</td><td><span class="na">N/A</span></td></tr>
      <tr><td>29</td><td>Give details of water and electricity charges, if any, to be borne by the owner.</td><td><span class="na">N/A</span></td></tr>
      <tr><td>30</td><td>Has the tenant to bear the whole or part of the cost of repair and maintenance? Give particulars.</td><td><span class="na">N/A</span></td></tr>
      <tr><td>31</td><td>If a lift is installed, who is to bear the cost of maintenance and operation- owner or tenant</td><td><span class="na">N/A</span></td></tr>
      <tr><td>32</td><td>If a pump is installed, who has to bear the cost of maintenance and operation- owner or tenant</td><td><span class="na">N/A</span></td></tr>
      <tr><td>33</td><td>Who has to bear the cost of electricity charges for lighting of common space like entrance hall, stairs, passage, compound wall etc.- owner or tenant?</td><td><span class="na">N/A</span></td></tr>
      <tr><td>34</td><td>What is the amount of property tax? Who is to bear it? Give details with documentary proof</td><td>${generalDetails.propertyTax}</td></tr>
      <tr><td>35</td><td>Is the building insured? If so give the policy no., amount for which it is insured and the annual premium.</td><td>${generalDetails.buildingInsurance}</td></tr>
      <tr><td>36</td><td>Is any dispute between landlord and tenant regarding rent pending in a court of law?</td><td><span class="na">N/A</span></td></tr>
      <tr><td>37</td><td>Has any standard rent been fixed for the premises under any law relating to rent control?</td><td><span class="na">N/A</span></td></tr>
    </table>

    <p class="section-title">SALE</p>
    <table class="q-table">
      <tr><td>38</td><td>Give instances of sales of immovable property in the locality on a separate sheet, indicating the name and address of the property, registration no. sale price and area of the land sold.</td><td><span class="na">Not Available</span></td></tr>
      <tr><td>39</td><td>Land rate adopted in this valuation</td><td>Rs ${valuationInputs.landRatePerSqm}/- Per Sqm</td></tr>
      <tr><td>40</td><td>If sale instances are not available or not relied upon the basis of arriving at the land rate</td><td>${valuationInputs.landRateSource}</td></tr>
    </table>

    <p class="section-title">COST OF CONSTRUCTION</p>
    <table class="q-table">
      <tr><td>41</td><td>Year of commencement of construction & year of completion</td><td>${valuationInputs.yearOfConstruction}</td></tr>
      <tr><td>42</td><td>What was the method of construction- by contract or employing labour directly/ both</td><td>Both</td></tr>
      <tr><td>43</td><td>For item of work done on contract, produce copies of agreement.</td><td><span class="na">Not Available</span></td></tr>
      <tr><td>44</td><td>For item of work done by engaging labour directly, give detail rate of materials and labour supported by documentary proof.</td><td><span class="na">Not Available</span></td></tr>
    </table>
    ${footerHtml}
  </div>

  <!-- Page 5: Building Technical Details -->
  <div class="page">
    ${headerHtml}
    <p class="part-title">PART-II</p>
    <p class="section-title">BUILDING – TECHNICAL DETAILS</p>
    <table class="q-table">
      <tr><td>1</td><td>No. of floors and height of each floor</td><td>${technicalDetails.heightOfFloors}</td></tr>
      <tr><td>2</td><td>Total Covered area on all Floors</td><td>${technicalDetails.totalCoveredArea}</td></tr>
      <tr><td>3</td><td>Year of construction</td><td>${technicalDetails.yearOfConstruction}</td></tr>
      <tr><td>4</td><td>Estimated total life of building</td><td>${technicalDetails.estimatedLife}</td></tr>
      <tr><td>5</td><td>Type of Construction – Load Bearing Walls / RCC Frame / Steel Frame</td><td>${technicalDetails.constructionType}</td></tr>
      <tr><td>6</td><td>Type of foundation</td><td>${technicalDetails.foundationType}</td></tr>
      <tr><td>7</td><td>Walls<br>(a) Ground Floor</td><td>Brick walls</td></tr>
      <tr><td>8</td><td>Partitions</td><td>${technicalDetails.partitions}</td></tr>
      <tr><td>9</td><td>Doors and windows (Floor wise)<br>(a) Ground Floor</td><td>${floors[0]?.doorsWindows || 'Teak Wood'}</td></tr>
      <tr><td>10</td><td>Flooring (Floor Wise)<br>(a) Ground Floor</td><td>${buildingSpecs.flooring}</td></tr>
      <tr><td>11</td><td>Finishing (Floor Wise)<br>(a) Ground Floor<br>(b) First Floor<br>(c) Second Floor</td><td>Cement sand plaster with POP and Paint finish</td></tr>
      <tr><td>12</td><td>Roofing &amp; Terracing</td><td>${technicalDetails.roofingTerracing}</td></tr>
      <tr><td>13</td><td>Special Architectural decorative features, if any</td><td>${technicalDetails.architecturalFeatures || buildingSpecs.exterior}</td></tr>
      <tr><td>14</td><td>(a) Internal wiring – surface or conduit<br>(b) Class of fittings – superior / ordinary / poor</td><td>${technicalDetails.internalWiring}, ${technicalDetails.fittingsClass}</td></tr>
      <tr><td>15</td><td>Sanitary installations<br>(a) No. of water closets<br>&nbsp;&nbsp;&nbsp;&nbsp;No. of sinks<br>(b) Class of fittings – superior coloured / superior white / ordinary</td><td>${technicalDetails.noOfWaterClosets}<br>${technicalDetails.noOfSinks}<br>${technicalDetails.sanitaryFittingsClass}</td></tr>
      <tr><td>16</td><td>Compound wall:<br>(a) Height and length<br>(b) Type of construction</td><td>${technicalDetails.compoundWallHeight}<br>${technicalDetails.compoundWallType}</td></tr>
      <tr><td>17</td><td>No of Lifts and capacity</td><td>${technicalDetails.noOfLifts}</td></tr>
      <tr><td>18</td><td>Underground pump – capacity &amp; type of construction</td><td>${technicalDetails.undergroundPump}</td></tr>
      <tr><td>19</td><td>Overhead water tank – type and capacity</td><td>${technicalDetails.overheadTank}</td></tr>
    </table>
    ${footerHtml}
  </div>

  <!-- Page 6: More Technical & Declaration -->
  <div class="page">
    ${headerHtml}
    <table class="q-table">
      <tr><td>20</td><td>No of pumps and their horse power</td><td>${technicalDetails.noOfPumps}</td></tr>
      <tr><td>21</td><td>Roads and paving within the compound – approx. area and type of paving</td><td>${technicalDetails.roadsPaving}</td></tr>
      <tr><td>22</td><td>Sewer disposal – whether connected to public sewer; if septic tank provided, no. and capacity</td><td>${technicalDetails.sewerDisposal}</td></tr>
    </table>

    <div class="declaration">
      <p class="section-title">DECLARATION</p>
      <p>I hereby declare that:</p>
      <p style="margin: 10px 0;">(a) The information furnished in Part-I is true and correct to the best of my knowledge and belief.</p>
      <p>(b) I have no direct or indirect interest in the property valued.</p>

      <div class="signature">
        <div class="sig-block">
          <div class="sig-line">Date: ${valuationInputs.valuationDate}</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">Signature of Govt. Registered Valuer</div>
        </div>
      </div>
    </div>
    ${footerHtml}
  </div>

  <!-- Page 7: Valuation Calculation -->
  <div class="page">
    ${headerHtml}

    <div class="ref-date">
      <span>Ref: ${valuationInputs.referenceNo}</span>
      <span>Date: ${valuationInputs.valuationDate}</span>
    </div>

    <div class="title">
      VALUATION REPORT FOR THE FAIR MARKET VALUE OF ${floorDescUpper} IMMOVABLE PROPERTY SITUATED AT – ${fullAddressUpper}
    </div>

    <p>This valuation report is based on the information and documents provided by the owner. This valuation report is prepared <strong>FOR THE FAIR MARKET VALUE OF ${floorDescUpper} IMMOVABLE PROPERTY SITUATED AT – ${fullAddressUpper}</strong></p>

    <p style="margin: 15px 0;">The details are furnished with this report. This valuation report is prepared on ${valuationInputs.valuationDate}. The Area of the plot is ${formatNumber(valuationInputs.plotArea, 4)} Sqm. This valuation report is prepared for ${floorListSentence} of the building${floors.length > 0 ? ` which consists of ${floors.map(f => f.floorName).join(', ')}` : ''}.</p>

    <p class="section-title">Specification of Construction</p>
    <table class="specs-table">
      <tr><td>Roof</td><td>${buildingSpecs.roof}</td></tr>
      <tr><td>Brickwork</td><td>${buildingSpecs.brickwork}</td></tr>
      <tr><td>Flooring</td><td>${buildingSpecs.flooring}</td></tr>
      <tr><td>Tiles</td><td>${buildingSpecs.tiles}</td></tr>
      <tr><td>Electrical</td><td>${buildingSpecs.electrical}</td></tr>
      <tr><td>Switches</td><td>${buildingSpecs.electricalSwitches}</td></tr>
      <tr><td>Sanitary</td><td>${buildingSpecs.sanitaryFixtures}</td></tr>
      <tr><td>Woodwork</td><td>${buildingSpecs.woodwork}</td></tr>
      <tr><td>Exterior</td><td>${buildingSpecs.exterior}</td></tr>
    </table>

    <p>On the basis of above specification, I assess the cost of construction on covered area basis.</p>
    ${footerHtml}
  </div>

  <!-- Page 8: Calculations -->
  <div class="page">
    ${headerHtml}
    <p class="section-title">CALCULATION OF VALUE OF CONSTRUCTION</p>
    <p>As per Plinth Area Rates [PAR] 1.1.92 with base as 100</p>
    <p>Cost index as on ${valuationInputs.valuationForDate} = ${valuationInputs.costIndex}</p>

    <div class="calculation-box">
      <p class="calculation-line"><strong>1. Ground Floor</strong> (Year of construction: ${valuationInputs.yearOfConstruction})</p>
      <p class="calculation-line">Area of floor = ${formatNumber(floors[0]?.area || 0, 3)} Sqm</p>
      <p class="calculation-line">Plinth area rate (as on 1.1.92) = Rs ${valuationInputs.plinthAreaRate} per Sqm</p>
      <p class="calculation-line">Cost index as on ${valuationInputs.valuationForDate} = ${valuationInputs.costIndex}</p>
      <p class="calculation-line">Rate of construction = ${valuationInputs.plinthAreaRate} × ${valuationInputs.costIndex / 100} = Rs ${formatNumber(calculatedValues.rateOfConstruction, 1)} per Sqm</p>
      <p class="calculation-line">Percentage increase due to superior specifications = ${valuationInputs.specificationIncreasePercent}%</p>
      <p class="calculation-line">Net rate = ${formatNumber(1 + valuationInputs.specificationIncreasePercent / 100, 2)} × ${formatNumber(calculatedValues.rateOfConstruction, 1)} = Rs ${formatNumber(calculatedValues.netRateOfConstruction, 2)} per Sqm</p>
      <p class="calculation-line"><strong>Cost of construction = ${formatNumber(floors[0]?.area || 0, 3)} Sqm × Rs ${formatNumber(calculatedValues.netRateOfConstruction, 2)} = ${formatCurrency(calculatedValues.costOfConstruction)}</strong></p>
    </div>

    <p class="section-title">DEPRECIATION DUE TO AGE OF THE CONSTRUCTION</p>
    <table>
      <tr>
        <th>S.no</th>
        <th>Floor</th>
        <th>Year of construction</th>
        <th>Age as on ${valuationInputs.valuationForDate}</th>
        <th>Estimated life</th>
        <th>Depreciated Value</th>
      </tr>
      <tr>
        <td>1</td>
        <td>Ground Floor and First Floor</td>
        <td>${valuationInputs.yearOfConstruction}</td>
        <td>${valuationInputs.ageAtValuation} Years</td>
        <td>${valuationInputs.estimatedLifeYears} years</td>
        <td>${calculatedValues.remainingLife}/${valuationInputs.estimatedLifeYears} × ${formatCurrency(calculatedValues.costOfConstruction)}<br><strong>${formatCurrency(calculatedValues.depreciatedValue)}</strong></td>
      </tr>
      <tr class="total-row">
        <td colspan="5" style="text-align: right;"><strong>Total Depreciated value of construction</strong></td>
        <td><strong>${formatCurrency(calculatedValues.depreciatedValue)}</strong></td>
      </tr>
    </table>

    <p class="section-title">VALUE OF LAND SHARE</p>
    <div class="calculation-box">
      <p class="calculation-line">Area of plot = ${formatNumber(valuationInputs.plotArea, 4)} Sqm</p>
      <p class="calculation-line">Rate of land = Rs ${valuationInputs.landRatePerSqm} Per Sqm</p>
      <p class="calculation-line" style="margin-left: 100px;">(L and DO RATES for the comparable region)</p>
      <p class="calculation-line" style="margin-left: 100px;">(${valuationInputs.landRateSource})</p>
    </div>
    ${footerHtml}
  </div>

  <!-- Page 9: Final Calculations -->
  <div class="page">
    ${headerHtml}
    <p>Percentage increase in land rate due to location, wide roads on both sides [front and rear] and year of valuation [${valuationInputs.valuationForDate}] = ${valuationInputs.locationIncreasePercent}%</p>

    <div class="calculation-box">
      <p class="calculation-line">Net rate = ${formatNumber(1 + valuationInputs.locationIncreasePercent / 100, 1)} × ${valuationInputs.landRatePerSqm} = ${formatNumber(calculatedValues.netLandRate, 0)}/-</p>
      <p class="calculation-line">Value of land = ${formatNumber(valuationInputs.plotArea, 4)} @ Rs ${formatNumber(calculatedValues.netLandRate, 0)}/- per Sqm = ${formatCurrency(calculatedValues.totalLandValue)}</p>
      <p class="calculation-line">Share of land = <strong>${valuationInputs.landShareFraction || (valuationInputs.landShareDecimal ? valuationInputs.landShareDecimal.toString() : '1/1')}</strong></p>
      <p class="calculation-line">Value of land share = ${valuationInputs.landShareFraction || (valuationInputs.landShareDecimal ? valuationInputs.landShareDecimal.toString() : '1/1')} × ${formatCurrency(calculatedValues.totalLandValue)} = <strong>${formatCurrency(calculatedValues.landShareValue)}</strong></p>
    </div>

    <p class="section-title">VALUE OF THE PROPERTY = VALUE OF LAND SHARE + VALUE OF CONSTRUCTION</p>
    <div class="calculation-box" style="text-align: center;">
      <p class="calculation-line">= ${formatCurrency(calculatedValues.landShareValue)} + ${formatCurrency(calculatedValues.depreciatedValue)}</p>
      <p class="calculation-line">= ${formatCurrency(calculatedValues.totalPropertyValue)}</p>
      <p class="calculation-line" style="font-size: 14pt;"><strong>Say ${formatCurrency(calculatedValues.roundedValue)}</strong></p>
    </div>

    <div class="final-value">
      I assess the fair market value of the valuated property as on <strong>${valuationInputs.valuationForDate}</strong> to be <strong>Say ${formatCurrency(calculatedValues.roundedValue)}</strong>
    </div>

    <div class="value-words">
      [ ${calculatedValues.valueInWords} ]
    </div>

    <div class="valuer-signoff">
      <div class="sig-block">
        <div class="sig-line">Date: ${valuationInputs.valuationDate}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">
          ${valuerName}<br>
          ${valuerDesignation}<br>
          ${valuerCategoryNo}
        </div>
      </div>
    </div>
    ${footerHtml}
  </div>

  <!-- Template-Specific Addendum Pages -->
  ${generateAddendumPages(templateId, ext, calculatedValues, headerHtml, footerHtml, formatCurrency, isBank, isPSU, isIT)}

  <!-- Photo Pages - 6 photos per page in 2x3 grid -->
  ${(() => {
    const photosPerPage = 6;
    const totalPages = Math.ceil(photos.length / photosPerPage);
    let photoPages = '';

    for (let page = 0; page < totalPages; page++) {
      const startIdx = page * photosPerPage;
      const pagePhotos = photos.slice(startIdx, startIdx + photosPerPage);

      photoPages += `
      <div class="page">
        ${headerHtml}
        <div class="photo-page">
          <p class="photo-caption">PHOTOGRAPHS OF PROPERTY SITUATED AT ${fullAddressUpper}${totalPages > 1 ? ` (Page ${page + 1} of ${totalPages})` : ''}</p>
          <div class="photo-grid">
            ${pagePhotos.map((photo, i) => `
              <div class="photo-item">
                <img src="${photo}" alt="Property photo ${startIdx + i + 1}">
                <div class="photo-number">Photo ${startIdx + i + 1}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ${footerHtml}
      </div>
      `;
    }

    return photoPages;
  })()}

  <!-- Location Map Page -->
  ${location ? `
  <div class="page">
    ${headerHtml}

    <p class="part-title">LOCATION MAP</p>
    <p style="text-align: center; margin-bottom: 20px; font-size: 10pt;">
      Property situated at ${fullAddressUpper}
    </p>

    <div class="map-container">
      <img src="${location.mapUrl}" alt="Property Location Map" />
    </div>

    <table class="coord-table">
      <tr>
        <td>
          <strong>Latitude</strong><br>
          <span style="font-family: monospace; font-size: 14pt;">${location.lat.toFixed(6)}° N</span>
        </td>
        <td>
          <strong>Longitude</strong><br>
          <span style="font-family: monospace; font-size: 14pt;">${location.lng.toFixed(6)}° E</span>
        </td>
      </tr>
    </table>

    <p class="map-date">Location captured on ${location.capturedAt}</p>
    <p class="map-attribution">Map data &copy; Google Maps</p>

    ${footerHtml}
  </div>
  ` : ''}

${isPreview ? `<script>
document.querySelectorAll('.page').forEach(function(page, i) {
  var nums = page.querySelectorAll('.page-number');
  nums.forEach(function(n) { n.textContent = String(i + 1); });
});
</script>` : ''}
</body>
</html>
  `;
}
