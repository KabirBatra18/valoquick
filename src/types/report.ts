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
  // Property Address (single free-form field — no standard format in India)
  propertyAddress: string;
  nearbyLandmark: string;

  // Physical Characteristics
  landType: string; // Solid, Rocky, Marsh Land, Reclaimed, Water-logged, Land-locked
  accessApproach: string;
  abutingRoads: string;
  plinthArea: number;
  carpetArea: number;
  saleableArea: number;

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
  ownerPhone: string;
  currentOwners: { name: string; share: string }[];
  developerName: string;

  // Valuation Inputs
  referenceNo: string;
  bankName: string;
  inspectionDate: string;
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

  // Legal & Regulatory
  ownershipDocType: string; // Sale Deed, Gift Deed, Lease Deed
  leaseholdRestrictions: string;
  easementAgreement: string;
  acquisitionNotification: string;
  roadWideningNotification: string;
  heritageRestriction: string;
  encumbrances: string;
  buildingPlanSanction: string;
  approvalAuthority: string;
  planViolations: string;
  occupancyCertificateStatus: string;
  unauthorizedConstructions: string;
  farFsiPermitted: string;
  farFsiConsumed: string;
  groundCoverage: string;
  planningZone: string;
  zoningRegulations: string;
  surroundingLandUse: string;
  demolitionProceedings: string;
  sarfaesiCompliant: string;

  // Economic/Rental Details
  reasonableLettingValue: number;
  isOccupiedByTenant: boolean;
  numberOfTenants: number;
  tenancyDuration: string;
  tenancyStatus: string;
  monthlyRent: number;
  propertyTaxStatus: string;
  propertyInsurance: string;
  maintenanceCharges: number;
  securityCharges: number;

  // Infrastructure
  waterSupply: string;
  sewerageSystem: string;
  stormDrainage: string;
  solidWasteManagement: string;
  electricityStatus: string;
  publicTransportAccess: string;
  nearbySchool: string;
  nearbyMedical: string;
  nearbyRecreation: string;

  // Environmental
  greenBuildingFeatures: string;
  rainWaterHarvesting: string;
  solarProvision: string;
  environmentalPollution: string;

  // Engineering/Safety
  structuralSafety: string;
  earthquakeResistance: string;
  visibleDamage: string;
  airConditioningSystem: string;
  firefightingProvision: string;
  maintenanceIssues: string;
  extentOfDeterioration: string;

  // Architectural
  architecturalStyle: string;
  heritageValue: string;
  landscapeElements: string;

  // Marketability
  locationAttributes: string;
  scarcityValue: string;
  demandSupplyComment: string;
  comparableSalePrices: string;
  lastTwoTransactions: string;

  // Valuation Summary
  guidelineValueLand: number;
  guidelineValueBuilding: number;
  marketRateTrend: string;
  forcedSaleValue: number;
  insuranceValue: number;
  valuationMethodology: string;
  variationJustification: string;

  // Photos
  photos: string[];

  // Location
  locationLat: number | null;
  locationLng: number | null;
  locationCapturedAt: string;
  locationMapUrl: string;

  // Hidden fields tracking (for swipe-to-hide feature)
  hiddenFields: string[];
}

// Default empty form data
export const DEFAULT_FORM_DATA: ReportFormData = {
  propertyAddress: '',
  nearbyLandmark: '',
  landType: '',
  accessApproach: '',
  abutingRoads: '',
  plinthArea: 0,
  carpetArea: 0,
  saleableArea: 0,
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
  ownerPhone: '',
  currentOwners: [{ name: '', share: '' }],
  developerName: '',
  referenceNo: '',
  bankName: '',
  inspectionDate: '',
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
  // Legal & Regulatory
  ownershipDocType: '',
  leaseholdRestrictions: '',
  easementAgreement: '',
  acquisitionNotification: '',
  roadWideningNotification: '',
  heritageRestriction: '',
  encumbrances: '',
  buildingPlanSanction: '',
  approvalAuthority: '',
  planViolations: '',
  occupancyCertificateStatus: '',
  unauthorizedConstructions: '',
  farFsiPermitted: '',
  farFsiConsumed: '',
  groundCoverage: '',
  planningZone: '',
  zoningRegulations: '',
  surroundingLandUse: '',
  demolitionProceedings: '',
  sarfaesiCompliant: '',
  // Economic/Rental
  reasonableLettingValue: 0,
  isOccupiedByTenant: false,
  numberOfTenants: 0,
  tenancyDuration: '',
  tenancyStatus: '',
  monthlyRent: 0,
  propertyTaxStatus: '',
  propertyInsurance: '',
  maintenanceCharges: 0,
  securityCharges: 0,
  // Infrastructure
  waterSupply: '',
  sewerageSystem: '',
  stormDrainage: '',
  solidWasteManagement: '',
  electricityStatus: '',
  publicTransportAccess: '',
  nearbySchool: '',
  nearbyMedical: '',
  nearbyRecreation: '',
  // Environmental
  greenBuildingFeatures: '',
  rainWaterHarvesting: '',
  solarProvision: '',
  environmentalPollution: '',
  // Engineering/Safety
  structuralSafety: '',
  earthquakeResistance: '',
  visibleDamage: '',
  airConditioningSystem: '',
  firefightingProvision: '',
  maintenanceIssues: '',
  extentOfDeterioration: '',
  // Architectural
  architecturalStyle: '',
  heritageValue: '',
  landscapeElements: '',
  // Marketability
  locationAttributes: '',
  scarcityValue: '',
  demandSupplyComment: '',
  comparableSalePrices: '',
  lastTwoTransactions: '',
  // Valuation Summary
  guidelineValueLand: 0,
  guidelineValueBuilding: 0,
  marketRateTrend: '',
  forcedSaleValue: 0,
  insuranceValue: 0,
  valuationMethodology: '',
  variationJustification: '',
  // Photos & Location
  photos: [],
  locationLat: null,
  locationLng: null,
  locationCapturedAt: '',
  locationMapUrl: '',
  hiddenFields: [],
};

/** Fields that carry over when creating a new report from a previous one.
 *  These are typically the same across reports for the same firm/area. */
export const CARRYOVER_FIELDS: (keyof ReportFormData)[] = [
  'purpose', 'bankName', 'landRateSource', 'costIndex',
  'constructionType', 'foundationType', 'roofingTerracing',
  'waterSupply', 'sewerageSystem', 'stormDrainage', 'solidWasteManagement',
  'electricityStatus', 'publicTransportAccess',
  'sarfaesiCompliant', 'valuationMethodology',
];

/** Create form data pre-filled from a previous report's reusable fields */
export function prefillFromReport(source: ReportFormData): Partial<ReportFormData> {
  const prefilled: Partial<ReportFormData> = {};
  for (const key of CARRYOVER_FIELDS) {
    const value = source[key];
    if (value !== '' && value !== 0 && value !== null && value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prefilled as any)[key] = value;
    }
  }
  return prefilled;
}

// Calculate completion percentage
export function calculateCompletionPercentage(data: ReportFormData): number {
  const fields = [
    data.propertyAddress,
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
