// Report metadata and storage types

export interface ReportMetadata {
  id: string;
  title: string;
  propertyAddress: string;
  status: 'active' | 'concluded';
  createdAt: string;
  updatedAt: string;
  completionPercentage: number;
}

export interface SavedReport {
  metadata: ReportMetadata;
  formData: ReportFormData;
}

export interface ReportFormData {
  // Property Address
  propertyNo: string;
  block: string;
  area: string;
  city: string;

  // Boundaries
  northBoundary: string;
  southBoundary: string;
  eastBoundary: string;
  westBoundary: string;
  northEastBoundary: string;
  northWestBoundary: string;
  southEastBoundary: string;
  southWestBoundary: string;

  // Owner Details
  originalOwner: string;
  originalOwnerYear: string;
  currentOwners: { name: string; share: string }[];

  // Valuation Inputs
  referenceNo: string;
  valuationDate: string;
  valuationForDate: string;
  purpose: string;

  // Land Details
  plotArea: number;
  landRatePerSqm: number;
  landRateSource: string;
  locationIncreasePercent: number;
  landShareFraction: string;
  landShareDecimal: number;

  // Construction Details
  floorArea: number;
  plinthAreaRate: number;
  costIndex: number;
  specificationIncreasePercent: number;

  // Depreciation
  yearOfConstruction: string;
  estimatedLifeYears: number;
  ageAtValuation: number;

  // Building Specifications
  roof: string;
  brickwork: string;
  flooring: string;
  tiles: string;
  electrical: string;
  electricalSwitches: string;
  sanitaryFixtures: string;
  woodwork: string;
  exterior: string;

  // Technical Details
  floorHeight: string;
  constructionType: string;
  foundationType: string;
  partitions: string;
  roofingTerracing: string;
  architecturalFeatures: string;
  noOfWaterClosets: number;
  noOfSinks: number;
  sanitaryFittingsClass: string;
  compoundWallHeight: string;
  compoundWallType: string;
  overheadTank: string;
  noOfPumps: string;
  sewerDisposal: string;

  // General Details
  propertyType: string;
  localityClass: string;
  plotShape: string;
  isLeasehold: boolean;
  buildingOccupancy: string;
  civicAmenities: string[];

  // Photos
  photos: string[];

  // Location
  locationLat: number | null;
  locationLng: number | null;
  locationCapturedAt: string;
  locationMapUrl: string;
}

// Default empty form data
export const DEFAULT_FORM_DATA: ReportFormData = {
  propertyNo: '',
  block: '',
  area: '',
  city: '',
  northBoundary: '',
  southBoundary: '',
  eastBoundary: '',
  westBoundary: '',
  northEastBoundary: '',
  northWestBoundary: '',
  southEastBoundary: '',
  southWestBoundary: '',
  originalOwner: '',
  originalOwnerYear: '',
  currentOwners: [{ name: '', share: '' }],
  referenceNo: '',
  valuationDate: '',
  valuationForDate: '',
  purpose: '',
  plotArea: 0,
  landRatePerSqm: 0,
  landRateSource: '',
  locationIncreasePercent: 0,
  landShareFraction: '',
  landShareDecimal: 0,
  floorArea: 0,
  plinthAreaRate: 0,
  costIndex: 0,
  specificationIncreasePercent: 0,
  yearOfConstruction: '',
  estimatedLifeYears: 0,
  ageAtValuation: 0,
  roof: '',
  brickwork: '',
  flooring: '',
  tiles: '',
  electrical: '',
  electricalSwitches: '',
  sanitaryFixtures: '',
  woodwork: '',
  exterior: '',
  floorHeight: '',
  constructionType: '',
  foundationType: '',
  partitions: '',
  roofingTerracing: '',
  architecturalFeatures: '',
  noOfWaterClosets: 0,
  noOfSinks: 0,
  sanitaryFittingsClass: '',
  compoundWallHeight: '',
  compoundWallType: '',
  overheadTank: '',
  noOfPumps: '',
  sewerDisposal: '',
  propertyType: '',
  localityClass: '',
  plotShape: '',
  isLeasehold: false,
  buildingOccupancy: '',
  civicAmenities: [],
  photos: [],
  locationLat: null,
  locationLng: null,
  locationCapturedAt: '',
  locationMapUrl: '',
};

// Calculate completion percentage
export function calculateCompletionPercentage(data: ReportFormData): number {
  const fields = [
    data.propertyNo,
    data.block,
    data.area,
    data.city,
    data.originalOwner,
    data.originalOwnerYear,
    data.referenceNo,
    data.valuationDate,
    data.valuationForDate,
    data.purpose,
    data.plotArea > 0,
    data.landRatePerSqm > 0,
    data.floorArea > 0,
    data.yearOfConstruction,
    data.roof,
    data.flooring,
    data.propertyType,
  ];

  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
}
