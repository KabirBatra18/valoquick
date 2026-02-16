// Types for the Valuation Report Generator

export interface Owner {
  name: string;
  share: string; // e.g., "1/4th", "1/12th"
}

export interface PropertyAddress {
  fullAddress: string;
}

export interface Boundaries {
  north: string;
  south: string;
  east: string;
  west: string;
  northEast?: string;
  northWest?: string;
  southEast?: string;
  southWest?: string;
}

export interface BuildingSpecifications {
  roof: string;
  brickwork: string;
  flooring: string;
  tiles: string;
  electrical: string;
  electricalSwitches: string;
  sanitaryFixtures: string;
  woodwork: string;
  exterior: string;
}

export interface FloorDetails {
  floorName: string;
  area: number; // in Sqm
  height: string;
  yearOfConstruction: string;
  walls: string;
  doorsWindows: string;
  flooring: string;
  finishing: string;
}

export interface ValuationInputs {
  // Basic Info
  referenceNo: string;
  bankName?: string; // Bank name for mortgage/loan reports
  valuationDate: string;
  valuationForDate: string; // The date for which valuation is being done (e.g., 1-4-2001)
  purpose: string;

  // Land Details
  plotArea: number; // in Sqm
  landRatePerSqm: number;
  landRateSource: string; // e.g., "L&DO rates from 1-4-1998 to 31.3.2000"
  locationIncreasePercent: number; // Percentage increase due to location
  landShareFraction: string; // e.g., "1/3"
  landShareDecimal: number; // e.g., 0.333

  // Construction Details
  plinthAreaRate: number; // Rate as on 1.1.92
  costIndex: number; // Cost index for valuation year
  specificationIncreasePercent: number; // % increase for superior specs

  // Depreciation
  yearOfConstruction: string;
  estimatedLifeYears: number;
  ageAtValuation: number; // Calculated or entered
}

export interface CalculatedValues {
  // Construction Calculations
  rateOfConstruction: number;
  netRateOfConstruction: number;
  costOfConstruction: number;
  remainingLife: number;
  depreciatedValue: number;

  // Land Calculations
  netLandRate: number;
  totalLandValue: number;
  landShareValue: number;

  // Final Value
  totalPropertyValue: number;
  roundedValue: number;
  valueInWords: string;
}

export interface TechnicalDetails {
  // Building Technical Details (Part II)
  noOfFloors: string;
  heightOfFloors: string;
  totalCoveredArea: string;
  yearOfConstruction: string;
  estimatedLife: string;
  constructionType: string; // Load Bearing / RCC Frame / Steel Frame
  foundationType: string;
  partitions: string;
  roofingTerracing: string;
  architecturalFeatures: string;
  internalWiring: string;
  fittingsClass: string;
  noOfWaterClosets: number;
  noOfSinks: number;
  sanitaryFittingsClass: string;
  compoundWallHeight: string;
  compoundWallType: string;
  noOfLifts: string;
  undergroundPump: string;
  overheadTank: string;
  noOfPumps: string;
  roadsPaving: string;
  sewerDisposal: string;
}

export interface GeneralDetails {
  // Part I - General Section
  propertyType: string; // Residential / Commercial / Industrial
  localityClass: string; // High class / Middle class / Poor class
  proximityToCivicAmenities: string;
  surfaceCommunication: string;
  plotShape: string;
  isLeasehold: boolean;
  lessorDetails?: string;
  restrictiveCovenants: string;
  easementAgreements: string;
  townPlanningArea: string;
  developmentContribution: string;
  acquisitionNotification: string;
  buildingOccupancy: string; // Owner occupied / Tenanted / Both
  floorSpaceIndex: string;
  propertyTax: string;
  buildingInsurance: string;
}

export interface ValuationReport {
  // Company Details (Fixed)
  companyName: string;
  companySubtitle: string;
  companyAddress: string;
  companyContact: string;
  companyEmail: string;
  valuerName: string;
  valuerQualification: string;
  valuerDesignation: string;
  valuerCategoryNo: string;

  // Property Details
  propertyAddress: PropertyAddress;
  boundaries: Boundaries;

  // Owner Details
  originalOwner: string;
  originalOwnerYear: string;
  currentOwners: Owner[];

  // Valuation Inputs
  valuationInputs: ValuationInputs;

  // Floor Details
  floors: FloorDetails[];

  // Technical Details
  technicalDetails: TechnicalDetails;

  // General Details
  generalDetails: GeneralDetails;

  // Building Specifications
  buildingSpecs: BuildingSpecifications;

  // Calculated Values (computed from inputs)
  calculatedValues: CalculatedValues;

  // Photos
  photos: string[]; // Base64 encoded images

  // Location
  location?: {
    lat: number;
    lng: number;
    capturedAt: string;
    mapUrl: string;
  };
}

// Default company details (fixed for Batra & Associates)
export const DEFAULT_COMPANY_DETAILS = {
  companyName: "BATRA & ASSOCIATES",
  companySubtitle: "ARCHITECTS, STRUCTURAL ENGINEERS & VALUERS",
  companyAddress: "3/5 EAST PUNJABI BAGH, NEW DELHI -110026",
  companyContact: "Mob: 9811741187",
  companyEmail: "Email Id: batra.nanu@yahoo.com",
  valuerName: "NANU BATRA",
  valuerQualification: "M Tech IIT Delhi",
  valuerDesignation: "GOVT. APPROVED VALUER",
  valuerCategoryNo: "CAT-I/625/174/2020-21",
};

// Helper function to convert number to Indian currency words
export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  // Indian numbering system
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder);

  return 'RUPEES ' + result.trim() + ' ONLY';
}

// Calculate all derived values
export function calculateValues(inputs: ValuationInputs, floorArea: number): CalculatedValues {
  // Construction calculations
  const rateOfConstruction = inputs.plinthAreaRate * (inputs.costIndex / 100);
  const netRateOfConstruction = rateOfConstruction * (1 + inputs.specificationIncreasePercent / 100);
  const costOfConstruction = floorArea * netRateOfConstruction;
  const remainingLife = inputs.estimatedLifeYears - inputs.ageAtValuation;
  const depreciatedValue = (remainingLife / inputs.estimatedLifeYears) * costOfConstruction;

  // Land calculations
  const netLandRate = inputs.landRatePerSqm * (1 + inputs.locationIncreasePercent / 100);
  const totalLandValue = inputs.plotArea * netLandRate;
  const landShareValue = totalLandValue * inputs.landShareDecimal;

  // Final value
  const totalPropertyValue = landShareValue + depreciatedValue;
  const roundedValue = Math.round(totalPropertyValue / 1000) * 1000;
  const valueInWords = numberToWords(roundedValue);

  return {
    rateOfConstruction,
    netRateOfConstruction,
    costOfConstruction,
    remainingLife,
    depreciatedValue,
    netLandRate,
    totalLandValue,
    landShareValue,
    totalPropertyValue,
    roundedValue,
    valueInWords,
  };
}
