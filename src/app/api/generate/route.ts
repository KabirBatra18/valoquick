import { NextRequest, NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { ValuationReport } from '@/types/valuation';

// Configure for serverless
export const maxDuration = 60;

async function getBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    // Running on Vercel/serverless - use puppeteer-core with @sparticuz/chromium
    const executablePath = await chromium.executablePath();
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath,
      headless: true,
    });
  } else {
    // Running locally or on Railway - use regular puppeteer
    return puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: ValuationReport = await request.json();

    // Generate HTML content for PDF
    const htmlContent = generateHTML(data);

    // Generate PDF using Puppeteer
    const browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      printBackground: true,
    });

    await browser.close();

    // Convert to base64
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

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

function generateHTML(data: ValuationReport): string {
  const {
    companyName,
    companySubtitle,
    companyAddress,
    companyContact,
    companyEmail,
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
  } = data;

  const currentOwnersText = currentOwners.map(o => `${o.name} -${o.share} Share`).join('<br>');
  const currentOwnersShort = currentOwners.map(o => o.name).join(' & ');
  const fullAddressUpper = propertyAddress.fullAddress.toUpperCase();

  // Format numbers for display
  const formatCurrency = (num: number) => `Rs${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}/-`;
  const formatNumber = (num: number, decimals = 2) => num.toFixed(decimals);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }
    .page {
      page-break-after: always;
      padding: 10mm;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header-left {
      color: #1a5276;
    }
    .header-left h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .header-left p {
      font-size: 10pt;
      margin: 1px 0;
    }
    .header-right {
      text-align: right;
    }
    .header-right p {
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

    /* Prevent orphaned headings and awkward page breaks */
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

    .keep-together {
      page-break-inside: avoid;
    }

    .section-block {
      page-break-inside: avoid;
    }

    .part-header {
      page-break-after: avoid;
      page-break-inside: avoid;
    }

    p + table, .section-title + table, strong + table {
      page-break-before: avoid;
    }

    /* Ensure parts start cleanly */
    .new-section {
      page-break-before: always;
    }

    /* Keep section title with following content */
    .section-title + table,
    .section-title + .specs-list,
    .section-title + .calculation-box,
    .section-title + p {
      page-break-before: avoid;
    }

    /* Prevent awkward breaks inside calculation boxes */
    .calculation-box {
      page-break-inside: avoid;
    }

    .specs-list {
      page-break-inside: avoid;
    }

    .declaration {
      page-break-inside: avoid;
    }
    .calculation-box {
      margin: 15px 0;
      padding: 10px;
    }
    .calculation-line {
      margin: 5px 0;
    }
    .final-value {
      font-weight: bold;
      font-size: 14pt;
      text-align: center;
      margin: 20px 0;
      padding: 10px;
      border: 2px solid #000;
    }
    .value-words {
      text-align: center;
      font-weight: bold;
      margin: 10px 0;
    }
    .declaration {
      margin-top: 30px;
    }
    .signature {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 12px;
      margin: 15px 0;
      height: calc(100% - 60px);
    }
    .photo-item {
      aspect-ratio: 1;
      overflow: hidden;
      border: 2px solid #333;
      border-radius: 8px;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-caption {
      text-align: center;
      font-weight: bold;
      font-size: 11pt;
      margin: 10px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }
    .photo-page {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .cover-photo {
      text-align: center;
      margin: 30px 0;
    }
    .cover-photo img {
      max-width: 80%;
      max-height: 400px;
      object-fit: contain;
    }
    .specs-list {
      margin: 15px 0;
    }
    .specs-list p {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <!-- Page 1: Cover Page -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>${companyName}</h1>
        <p>${companySubtitle}</p>
        <p>${companyAddress}</p>
        <p>${companyContact} ${companyEmail}</p>
      </div>
      <div class="header-right">
        <p><strong>${valuerName}</strong></p>
        <p>${valuerQualification}</p>
        <p>${valuerDesignation}</p>
        <p>${valuerCategoryNo}</p>
      </div>
    </div>

    <div class="title">
      VALUATION REPORT FOR THE FAIR MARKET VALUE OF GROUND FLOOR OF THE<br>
      IMMOVABLE PROPERTY SITUATED AT – ${fullAddressUpper}
    </div>

    <div class="owners">
      <p><strong>OWNERS- IN ${originalOwnerYear} ${originalOwner}</strong></p>
      <p><strong>CURRENT OWNERS-${currentOwnersShort}</strong></p>
    </div>

    <p><strong>ON BEHALF OF OWNERS</strong></p>

    <div class="ref-date">
      <span>Ref : ${valuationInputs.referenceNo}</span>
      <span>Date :- ${valuationInputs.valuationDate}</span>
    </div>

    ${photos.length > 0 ? `
    <div class="cover-photo">
      <img src="${photos[0]}" alt="Property Photo">
    </div>
    ` : ''}

    <div class="ref-date" style="margin-top: auto;">
      <span>Ref : ${valuationInputs.referenceNo}</span>
      <span>Date :- ${valuationInputs.valuationDate}</span>
    </div>
  </div>

  <!-- Page 2: General Details -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>${companyName}</h1>
        <p>${companySubtitle}</p>
        <p>${companyAddress}</p>
        <p>${companyContact} ${companyEmail}</p>
      </div>
      <div class="header-right">
        <p><strong>${valuerName}</strong></p>
        <p>${valuerQualification}</p>
        <p>${valuerDesignation}</p>
        <p>${valuerCategoryNo}</p>
      </div>
    </div>

    <div class="title">
      VALUATION REPORT FOR THE FAIR MARKET VALUE OF GROUND FLOOR OF THE<br>
      IMMOVABLE PROPERTY SITUATED AT – ${fullAddressUpper}
    </div>

    <div class="owners">
      <p><strong>OWNERS- IN ${originalOwnerYear}-${originalOwner}</strong></p>
      <p><strong>CURRENT OWNERS-${currentOwnersShort}</strong></p>
    </div>

    <div class="ref-date">
      <span>Ref : ${valuationInputs.referenceNo}</span>
      <span>Dated: ${valuationInputs.valuationDate}</span>
    </div>

    <p class="section-title">GENERAL:</p>
    <table>
      <tr><td>1</td><td>Purpose for which valuation is made</td><td>${valuationInputs.purpose}</td></tr>
      <tr><td>2</td><td>Date as on which valuation is made</td><td>${valuationInputs.valuationDate} for the date ${valuationInputs.valuationForDate}</td></tr>
      <tr><td>3</td><td>Name of owner/owners</td><td>IN ${originalOwnerYear}- ${originalOwner}<br>Current Owners-${currentOwnersShort}</td></tr>
      <tr><td>4</td><td>If the property is under joint ownership/co-ownership, share of each owner.</td><td>Joint Ownership<br>${currentOwnersText}</td></tr>
      <tr><td>5</td><td>Brief description of property</td><td>Ground floor of the residential property which consist of GF, FF, and SF</td></tr>
      <tr><td>6</td><td>Location, street, and ward no.</td><td>${fullAddressUpper}</td></tr>
      <tr><td>7</td><td>Survey/ Plot no. of land</td><td>As above.</td></tr>
      <tr><td>8</td><td>Is the property situated in residential/ mixed area/ commercial/ industrial area?</td><td>${generalDetails.propertyType}</td></tr>
      <tr><td>9</td><td>Classification of locality- high class/ middle class/ poor class</td><td>${generalDetails.localityClass}</td></tr>
      <tr><td>10</td><td>Proximity to civic amenities</td><td>${generalDetails.proximityToCivicAmenities}</td></tr>
      <tr><td>11</td><td>Means and proximity to surface communication by which the locality is served</td><td>${generalDetails.surfaceCommunication}</td></tr>
    </table>
  </div>

  <!-- Page 3: Land & Improvements -->
  <div class="page">
    <p class="section-title">LAND:</p>
    <table>
      <tr><td>12</td><td>Area of land supported by documentary proof<br>shape, dimensions and physical features</td><td>Plot Area – ${formatNumber(valuationInputs.plotArea, 4)}Sqm<br>${generalDetails.plotShape}</td></tr>
      <tr><td>13</td><td>Road or lanes on which the land is abutting</td><td>North – ${boundaries.north}<br>South – ${boundaries.south}<br>East – ${boundaries.east}<br>West – ${boundaries.west}</td></tr>
      <tr><td>14</td><td>Is it freehold or lease-hold land?</td><td>${generalDetails.isLeasehold ? 'Leasehold' : 'Freehold'}</td></tr>
      <tr><td>15</td><td>If lease-hold, the name of lessor etc.<br>(i) initial premium<br>(ii) Ground rent payable<br>(iii) Unearned increase payable to the lessor in the event of sale or transfer</td><td>${generalDetails.isLeasehold ? generalDetails.lessorDetails || 'NA' : 'NA'}</td></tr>
      <tr><td>16</td><td>Are there any restrictive covenant in regard to use of land? If so, attach a copy of the covenant</td><td>${generalDetails.restrictiveCovenants}</td></tr>
      <tr><td>17</td><td>Are there any agreements of easement? If so, attach copies</td><td>${generalDetails.easementAgreements}</td></tr>
      <tr><td>18</td><td>Does the land fall in an area included in any town planning of government or any statutory body? If so, give particulars</td><td>${generalDetails.townPlanningArea}</td></tr>
      <tr><td>19</td><td>Has any contribution been made towards development or is any demand for such contribution still outstanding?</td><td>${generalDetails.developmentContribution}</td></tr>
      <tr><td>20</td><td>Has the whole or part of the land been notified for acquisition by government or any statutory body? Give date of the notification.</td><td>${generalDetails.acquisitionNotification}</td></tr>
      <tr><td>21</td><td>Attach a dimension site plan</td><td>Owner to attach if required</td></tr>
    </table>

    <p class="section-title">IMPROVEMENTS:</p>
    <table>
      <tr><td>22</td><td>Attached plans and elevations of all structures standing on the land & layout plan.</td><td>Owner to attach if required.</td></tr>
      <tr><td>23</td><td>Furnish technical details of the building on a separate sheet</td><td>Good Specifications</td></tr>
      <tr><td>24</td><td>(I) Is the building owner occupied/ tenanted/ both<br>(ii) If partly owner occupied, specify portion & extent of area under owner occupation?</td><td>${generalDetails.buildingOccupancy}</td></tr>
      <tr><td>25</td><td>What is the floor space index permissible & Percentage actually utilized?</td><td>${generalDetails.floorSpaceIndex}</td></tr>
    </table>

    <p class="section-title">RENT:</p>
    <table>
      <tr><td>26</td><td>(I) Name of tenant/ leases/ licenses etc.<br>(ii) Portion in their occupation.<br>(iii) Monthly or annual rent/ compensation.<br>(iv) Gross amount received for the whole property</td><td>N/A<br>N/A<br>N/A<br>N/A</td></tr>
      <tr><td>27</td><td>Are any of the occupants related to, or close business associates of the owner?</td><td>N/A</td></tr>
    </table>
  </div>

  <!-- Page 4: More Details -->
  <div class="page">
    <table>
      <tr><td>28</td><td>Is separate amount being recovered for the use of fixtures like fans, geysers, refrigerators, cooking ranges, built in ward robes etc. or for service charges? If so, give details.</td><td>N/A</td></tr>
      <tr><td>29</td><td>Give details of water and electricity charges, if any, to be borne by the owner.</td><td>N/A</td></tr>
      <tr><td>30</td><td>Has the tenant to bear the whole or part of the cost of repair and maintenance? Give particulars.</td><td>N/A</td></tr>
      <tr><td>31</td><td>If a lift is installed, who is to bear the cost of maintenance and operation- owner or tenant</td><td>N/A</td></tr>
      <tr><td>32</td><td>If a pump is installed, who has to bear the cost of maintenance and operation- owner or tenant</td><td>N/A</td></tr>
      <tr><td>33</td><td>Who has to bear the cost of electricity charges for lighting of common space like entrance hall, stairs, passage, compound wall etc.- owner or tenant?</td><td>N/A</td></tr>
      <tr><td>34</td><td>What is the amount of property tax? Who is to bear it? Give details with documentary proof</td><td>${generalDetails.propertyTax}</td></tr>
      <tr><td>35</td><td>Is the building insured? If so give the policy no., amount for which it is insured and the annual premium.</td><td>${generalDetails.buildingInsurance}</td></tr>
      <tr><td>36</td><td>Is any dispute between landlord and tenant regarding rent pending in a court of law?</td><td>N/A</td></tr>
      <tr><td>37</td><td>Has any standard rent been fixed for the premises under any law relating to rent control?</td><td>N/A</td></tr>
    </table>

    <p class="section-title">SALE:</p>
    <table>
      <tr><td>38</td><td>Give instances of sales of immovable property in the locality on a separate sheet, indicating the name and address of the property, registration no. sale price and area of the land sold.</td><td>Not Available</td></tr>
      <tr><td>39</td><td>Land rate adopted in this valuation</td><td>Rs${valuationInputs.landRatePerSqm}- Per Sqm</td></tr>
      <tr><td>40</td><td>If sale instances are not available or not relied upon the basis of arriving at the land rate</td><td>${valuationInputs.landRateSource}</td></tr>
    </table>

    <p class="section-title">COST OF CONSTRUCTION:</p>
    <table>
      <tr><td>41</td><td>Year of commencement of construction & year of completion</td><td>${valuationInputs.yearOfConstruction}</td></tr>
      <tr><td>42</td><td>What was the method of construction- by contract or employing labour directly/ both</td><td>Both</td></tr>
      <tr><td>43</td><td>For item of work done on contract, produce copies of agreement.</td><td>Not Available</td></tr>
      <tr><td>44</td><td>For item of work done by engaging labour directly, give detail rate of materials and labour supported by documentary proof.</td><td>Not available</td></tr>
    </table>
  </div>

  <!-- Page 5: Building Technical Details -->
  <div class="page">
    <p class="section-title" style="text-decoration: none; margin-bottom: 5px;">PART-II</p>
    <p class="section-title">BUILDING - TECHNICAL DETAILS</p>
    <table>
      <tr><td>1</td><td>No. of floors and height of each floor</td><td>${technicalDetails.heightOfFloors}</td></tr>
      <tr><td>2</td><td>Total Covered area on all Floors</td><td>${technicalDetails.totalCoveredArea}</td></tr>
      <tr><td>3</td><td>Year of construction</td><td>${technicalDetails.yearOfConstruction}</td></tr>
      <tr><td>4</td><td>Estimated total life of building</td><td>${technicalDetails.estimatedLife}</td></tr>
      <tr><td>5</td><td>Type of Construction – Load Bearing Walls / RCC Frame / Steel Frame</td><td>${technicalDetails.constructionType}</td></tr>
      <tr><td>6</td><td>Type of foundation</td><td>${technicalDetails.foundationType}</td></tr>
      <tr><td>7</td><td>Walls<br>(a)Ground Floor</td><td>Brick walls</td></tr>
      <tr><td>8</td><td>Partitions</td><td>${technicalDetails.partitions}</td></tr>
      <tr><td>9</td><td>Doors and windows (Floor wise)<br>(a) Ground Floor</td><td>${floors[0]?.doorsWindows || 'Teak Wood'}</td></tr>
      <tr><td>10</td><td>Flooring (Floor Wise)<br>(a) Ground Floor</td><td>${buildingSpecs.flooring}</td></tr>
      <tr><td>11</td><td>Finishing (Floor Wise)<br>(a) Ground Floor<br>(b) First Floor<br>(c) Second Floor</td><td>Cement sand plaster with POP and Paint finish</td></tr>
      <tr><td>12</td><td>Roofing & Terracing</td><td>${technicalDetails.roofingTerracing}</td></tr>
      <tr><td>13</td><td>Special Architectural decorative features, if any.</td><td>${technicalDetails.architecturalFeatures || buildingSpecs.exterior}</td></tr>
      <tr><td>14</td><td>(a) Internal wiring - surface or conduit<br>(b) Class of fittings – superior / ordinary / poor</td><td>${technicalDetails.internalWiring}, ${technicalDetails.fittingsClass}</td></tr>
      <tr><td>15</td><td>Sanitary installations<br>(a) No. of water closets<br>    No. of sinks<br>(b) Class of fittings – superior coloured / superior white / ordinary</td><td>${technicalDetails.noOfWaterClosets}<br>${technicalDetails.noOfSinks}<br>${technicalDetails.sanitaryFittingsClass}</td></tr>
      <tr><td>16</td><td>Compound wall:<br>(a) Height and length<br>(b) Type of construction</td><td>${technicalDetails.compoundWallHeight}<br>${technicalDetails.compoundWallType}</td></tr>
      <tr><td>17</td><td>No of Lifts and capacity</td><td>${technicalDetails.noOfLifts}</td></tr>
      <tr><td>18</td><td>Underground pump – capacity & type of construction</td><td>${technicalDetails.undergroundPump}</td></tr>
      <tr><td>19</td><td>Overhead water tank – type and capacity</td><td>${technicalDetails.overheadTank}</td></tr>
    </table>
  </div>

  <!-- Page 6: More Technical & Declaration -->
  <div class="page">
    <table>
      <tr><td>20</td><td>No of pumps and their horse power</td><td>${technicalDetails.noOfPumps}</td></tr>
      <tr><td>21</td><td>Roads and paving within the compound – approx. area and type of paving</td><td>${technicalDetails.roadsPaving}</td></tr>
      <tr><td>22</td><td>Sewer disposal – whether connected to public sewer; if septic tank provided, no. and capacity</td><td>${technicalDetails.sewerDisposal}</td></tr>
    </table>

    <div class="declaration">
      <p class="section-title">DECLARATION</p>
      <p>I hereby declare that :</p>
      <p style="margin: 10px 0;">(a) The information furnished in Part-1 is true and correct to the best of my knowledge and belief.</p>
      <p>(b) I have no direct or indirect interest in the property valued.</p>

      <div class="signature">
        <span>Date :- ${valuationInputs.valuationDate}</span>
        <span>Signature of Govt. Registered Valuer</span>
      </div>
    </div>
  </div>

  <!-- Page 7: Valuation Calculation -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>${companyName}</h1>
        <p>${companySubtitle}</p>
        <p>${companyAddress}</p>
        <p>${companyContact} ${companyEmail}</p>
      </div>
      <div class="header-right">
        <p><strong>${valuerName}</strong></p>
        <p>${valuerQualification}</p>
        <p>${valuerDesignation}</p>
        <p>${valuerCategoryNo}</p>
      </div>
    </div>

    <div class="ref-date">
      <span>Ref : ${valuationInputs.referenceNo}</span>
      <span>Dated ${valuationInputs.valuationDate}</span>
    </div>

    <div class="title">
      VALUATION REPORT FOR THE FAIR MARKET VALUE OF GROUND FLOOR OF THE<br>
      IMMOVABLE PROPERTY SITUATED AT – ${fullAddressUpper}
    </div>

    <p>This valuation report is based on the information and documents provided by the owner. This valuation report is prepared <strong>FOR THE FAIR MARKET VALUE OF GROUND FLOOR OF THE IMMOVABLE PROPERTY SITUATED AT–${fullAddressUpper}</strong></p>

    <p style="margin: 15px 0;">The details are furnished with this report. This valuation report is prepared on ${valuationInputs.valuationDate}. The Area of the plot is ${formatNumber(valuationInputs.plotArea, 4)} Sqm. This valuation report is prepared for the ground floor of the building which consist of three floors {Ground floor, First floor, and Second floor}</p>

    <p class="section-title">Specification of Construction</p>
    <div class="specs-list">
      <p>Roof - ${buildingSpecs.roof}</p>
      <p>Brickwork - ${buildingSpecs.brickwork}</p>
      <p>Flooring - ${buildingSpecs.flooring}</p>
      <p>Tiles - ${buildingSpecs.tiles}</p>
      <p>Electrical - ${buildingSpecs.electrical}</p>
      <p>Electrical switches – ${buildingSpecs.electricalSwitches}</p>
      <p>Sanitary fixtures - ${buildingSpecs.sanitaryFixtures}</p>
      <p>Wood work - ${buildingSpecs.woodwork}</p>
      <p>Exterior - ${buildingSpecs.exterior}</p>
    </div>

    <p>On the basis of above specification. I assess the cost of construction on covered area basis.</p>
  </div>

  <!-- Page 8: Calculations -->
  <div class="page">
    <p class="section-title">CALCULATION OF VALUE OF CONSTRUCTION</p>
    <p>As per Plinth Area Rates [PAR] 1.1.92 with base as 100</p>
    <p>Cost index as on ${valuationInputs.valuationForDate}=${valuationInputs.costIndex}</p>

    <table style="margin: 20px 0;">
      <tr>
        <th>S.no</th>
        <th>Floor and Year of construction</th>
        <th>Area of floors</th>
        <th>Plinth area rate as on 1.1.92</th>
        <th>Cost index on ${valuationInputs.valuationForDate}</th>
        <th>Rate of construction for the year</th>
        <th>Percentage increase in cost of construction due to superior services and specifications</th>
        <th>Cost of construction</th>
      </tr>
      <tr>
        <td>1</td>
        <td>Ground floor</td>
        <td>${formatNumber(floors[0]?.area || 0, 3)}Sqm</td>
        <td>Rs ${valuationInputs.plinthAreaRate} per Sqm</td>
        <td>${valuationInputs.costIndex}</td>
        <td>${valuationInputs.plinthAreaRate}x${valuationInputs.costIndex / 100}=Rs ${formatNumber(calculatedValues.rateOfConstruction, 1)} per Sqm</td>
        <td>${valuationInputs.specificationIncreasePercent}%<br>Net rate of construction =${formatNumber(1 + valuationInputs.specificationIncreasePercent / 100, 2)}x${formatNumber(calculatedValues.rateOfConstruction, 1)}=Rs ${formatNumber(calculatedValues.netRateOfConstruction, 2)}per Sqm</td>
        <td>${formatNumber(floors[0]?.area || 0, 3)}Sqmx${formatNumber(calculatedValues.netRateOfConstruction, 2)}=<br>${formatCurrency(calculatedValues.costOfConstruction)}</td>
      </tr>
    </table>

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
        <td>${calculatedValues.remainingLife}/${valuationInputs.estimatedLifeYears}x ${formatCurrency(calculatedValues.costOfConstruction)}<br><strong>${formatCurrency(calculatedValues.depreciatedValue)}</strong></td>
      </tr>
      <tr>
        <td colspan="5" style="text-align: right;"><strong>Total Depreciated value of construction</strong></td>
        <td><strong>${formatCurrency(calculatedValues.depreciatedValue)}</strong></td>
      </tr>
    </table>

    <p class="section-title">VALUE OF LAND SHARE</p>
    <div class="calculation-box">
      <p class="calculation-line">Area of plot = ${formatNumber(valuationInputs.plotArea, 4)} Sqm</p>
      <p class="calculation-line">Rate of land = Rs${valuationInputs.landRatePerSqm} Per Sq mtrs</p>
      <p class="calculation-line" style="margin-left: 100px;">(L and DO RATES for the comparable region)</p>
      <p class="calculation-line" style="margin-left: 100px;">(${valuationInputs.landRateSource})</p>
    </div>
  </div>

  <!-- Page 9: Final Calculations -->
  <div class="page">
    <p>Percentage increase in land rate due to location, wide roads on both sides[ front and rear] and year of valuation[${valuationInputs.valuationForDate}] =${valuationInputs.locationIncreasePercent} %</p>

    <div class="calculation-box">
      <p class="calculation-line">Net rate =${formatNumber(1 + valuationInputs.locationIncreasePercent / 100, 1)}x${valuationInputs.landRatePerSqm}=${formatNumber(calculatedValues.netLandRate, 0)}/-</p>
      <p class="calculation-line">Value of land = ${formatNumber(valuationInputs.plotArea, 4)}@Rs${formatNumber(calculatedValues.netLandRate, 0)}/- per Sqm = ${formatCurrency(calculatedValues.totalLandValue)}</p>
      <p class="calculation-line">Share of land = <strong>${valuationInputs.landShareFraction}</strong></p>
      <p class="calculation-line">Value of land share =${valuationInputs.landShareFraction}x ${formatCurrency(calculatedValues.totalLandValue)}= <strong>${formatCurrency(calculatedValues.landShareValue)}</strong></p>
    </div>

    <p class="section-title">VALUE OF THE PROPERTY= VALUE OF LAND SHARE + VALUE OF CONSTRUCTION</p>
    <div class="calculation-box" style="text-align: center;">
      <p class="calculation-line">= ${formatCurrency(calculatedValues.landShareValue)} + ${formatCurrency(calculatedValues.depreciatedValue)}</p>
      <p class="calculation-line">= ${formatCurrency(calculatedValues.totalPropertyValue)}</p>
      <p class="calculation-line" style="font-size: 14pt;"><strong>Say${formatCurrency(calculatedValues.roundedValue)}</strong></p>
    </div>

    <div class="final-value">
      I assess the fair market value of the valuated property as on <strong>${valuationInputs.valuationForDate}</strong> to be <strong>Say${formatCurrency(calculatedValues.roundedValue)}</strong>
    </div>

    <div class="value-words">
      [ ${calculatedValues.valueInWords} ]
    </div>
  </div>

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
        <div class="photo-page">
          <p class="photo-caption">PHOTOGRAPHS OF PROPERTY SITUATED AT ${fullAddressUpper}${totalPages > 1 ? ` (Page ${page + 1} of ${totalPages})` : ''}</p>
          <div class="photo-grid">
            ${pagePhotos.map((photo, i) => `
              <div class="photo-item">
                <img src="${photo}" alt="Property photo ${startIdx + i + 1}">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      `;
    }

    return photoPages;
  })()}

</body>
</html>
  `;
}
