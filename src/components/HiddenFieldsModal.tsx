'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Field labels organized by section
const FIELD_SECTIONS: Record<string, Record<string, string>> = {
  'Property Address': {
    propertyNo: 'Property No.',
    block: 'Block',
    area: 'Area',
    city: 'City',
    wardVillageTaluka: 'Ward/Village/Taluka',
    subRegistryBlock: 'Sub-Registry/Block',
    district: 'District',
    nearbyLandmark: 'Nearby Landmark',
  },
  'Physical Characteristics': {
    landType: 'Land Type',
    accessApproach: 'Access/Approach',
    abutingRoads: 'Abutting Roads',
    plinthArea: 'Plinth Area',
    carpetArea: 'Carpet Area',
    saleableArea: 'Saleable Area',
  },
  'Boundaries': {
    northBoundary: 'North',
    southBoundary: 'South',
    eastBoundary: 'East',
    westBoundary: 'West',
    northEastBoundary: 'North-East',
    northWestBoundary: 'North-West',
    southEastBoundary: 'South-East',
    southWestBoundary: 'South-West',
  },
  'Property Classification': {
    propertyType: 'Property Type',
    localityClass: 'Locality Class',
    plotShape: 'Plot Shape',
    isLeasehold: 'Freehold/Leasehold',
    buildingOccupancy: 'Building Occupancy',
  },
  'Owner Details': {
    originalOwner: 'Original Owner',
    originalOwnerYear: 'Year of Ownership',
    ownerPhone: 'Phone Number',
    developerName: 'Developer Name',
    currentOwners: 'Current Owners',
  },
  'Valuation Parameters': {
    referenceNo: 'Reference No.',
    inspectionDate: 'Inspection Date',
    valuationDate: 'Valuation Date',
    valuationForDate: 'Valuation For Date',
    purpose: 'Purpose',
    plotArea: 'Plot Area',
    landRatePerSqm: 'Land Rate',
    landRateSource: 'Land Rate Source',
    locationIncreasePercent: 'Location Increase %',
    landShareFraction: 'Land Share Fraction',
    landShareDecimal: 'Land Share Decimal',
    floorArea: 'Floor Area',
    plinthAreaRate: 'Plinth Area Rate',
    costIndex: 'Cost Index',
    specificationIncreasePercent: 'Specification Increase %',
    yearOfConstruction: 'Year of Construction',
    estimatedLifeYears: 'Estimated Life',
    ageAtValuation: 'Age at Valuation',
  },
  'Building Specifications': {
    roof: 'Roof',
    brickwork: 'Brickwork',
    flooring: 'Flooring',
    tiles: 'Tiles',
    electrical: 'Electrical',
    electricalSwitches: 'Electrical Switches',
    sanitaryFixtures: 'Sanitary Fixtures',
    woodwork: 'Woodwork',
    exterior: 'Exterior',
  },
  'Technical Details': {
    floorHeight: 'Floor Height',
    constructionType: 'Construction Type',
    foundationType: 'Foundation Type',
    partitions: 'Partitions',
    roofingTerracing: 'Roofing & Terracing',
    architecturalFeatures: 'Architectural Features',
    noOfWaterClosets: 'No. of Water Closets',
    noOfSinks: 'No. of Sinks',
    sanitaryFittingsClass: 'Sanitary Fittings Class',
    compoundWallHeight: 'Compound Wall Height',
    compoundWallType: 'Compound Wall Type',
    overheadTank: 'Overhead Tank',
    noOfPumps: 'No. of Pumps',
    sewerDisposal: 'Sewer Disposal',
  },
  'Legal & Regulatory': {
    ownershipDocType: 'Ownership Document Type',
    occupancyCertificateStatus: 'OC Status',
    buildingPlanSanction: 'Building Plan Sanction',
    approvalAuthority: 'Approval Authority',
    planViolations: 'Plan Violations',
    unauthorizedConstructions: 'Unauthorized Constructions',
    farFsiPermitted: 'FAR/FSI Permitted',
    farFsiConsumed: 'FAR/FSI Consumed',
    groundCoverage: 'Ground Coverage',
    sarfaesiCompliant: 'SARFAESI Compliant',
    encumbrances: 'Encumbrances',
    heritageRestriction: 'Heritage Restriction',
  },
  'Infrastructure & Utilities': {
    waterSupply: 'Water Supply',
    sewerageSystem: 'Sewerage System',
    stormDrainage: 'Storm Drainage',
    solidWasteManagement: 'Solid Waste Management',
    electricityStatus: 'Electricity Status',
    publicTransportAccess: 'Public Transport Access',
  },
  'Environmental & Safety': {
    rainWaterHarvesting: 'Rain Water Harvesting',
    solarProvision: 'Solar Provision',
    greenBuildingFeatures: 'Green Building Features',
    environmentalPollution: 'Environmental Pollution',
    structuralSafety: 'Structural Safety',
    earthquakeResistance: 'Earthquake Resistance',
    visibleDamage: 'Visible Damage',
    firefightingProvision: 'Firefighting Provision',
    maintenanceIssues: 'Maintenance Issues',
    extentOfDeterioration: 'Extent of Deterioration',
  },
  'Economic & Rental': {
    reasonableLettingValue: 'Reasonable Letting Value',
    isOccupiedByTenant: 'Occupied by Tenant',
    numberOfTenants: 'Number of Tenants',
    tenancyDuration: 'Tenancy Duration',
    tenancyStatus: 'Tenancy Status',
    monthlyRent: 'Monthly Rent',
    propertyTaxStatus: 'Property Tax Status',
    propertyInsurance: 'Property Insurance',
    maintenanceCharges: 'Maintenance Charges',
    securityCharges: 'Security Charges',
  },
  'Marketability': {
    locationAttributes: 'Location Attributes',
    scarcityValue: 'Scarcity Value',
    demandSupplyComment: 'Demand & Supply',
    comparableSalePrices: 'Comparable Sale Prices',
    lastTwoTransactions: 'Last Two Transactions',
  },
  'Valuation Summary': {
    guidelineValueLand: 'Guideline Value - Land',
    guidelineValueBuilding: 'Guideline Value - Building',
    marketRateTrend: 'Market Rate Trend',
    forcedSaleValue: 'Forced Sale Value',
    insuranceValue: 'Insurance Value',
    valuationMethodology: 'Valuation Methodology',
    variationJustification: 'Variation Justification',
  },
};

interface HiddenFieldsModalProps {
  hiddenFields: string[];
  onRestore: (fieldName: string) => void;
  onRestoreAll: () => void;
  onClose: () => void;
}

export default function HiddenFieldsModal({
  hiddenFields,
  onRestore,
  onRestoreAll,
  onClose,
}: HiddenFieldsModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get hidden fields grouped by section
  const groupedHiddenFields = useMemo(() => {
    const result: Record<string, { fieldName: string; label: string }[]> = {};

    Object.entries(FIELD_SECTIONS).forEach(([sectionName, fields]) => {
      const hiddenInSection = Object.entries(fields)
        .filter(([fieldName]) => hiddenFields.includes(fieldName))
        .filter(
          ([, label]) =>
            !searchQuery || label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(([fieldName, label]) => ({ fieldName, label }));

      if (hiddenInSection.length > 0) {
        result[sectionName] = hiddenInSection;
      }
    });

    return result;
  }, [hiddenFields, searchQuery]);

  const toggleField = (fieldName: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName) ? prev.filter((f) => f !== fieldName) : [...prev, fieldName]
    );
  };

  const restoreSelected = () => {
    selectedFields.forEach((fieldName) => onRestore(fieldName));
    setSelectedFields([]);
  };

  const selectAll = () => {
    const allHidden = Object.values(groupedHiddenFields)
      .flat()
      .map((f) => f.fieldName);
    setSelectedFields(allHidden);
  };

  const deselectAll = () => {
    setSelectedFields([]);
  };

  const totalHidden = Object.values(groupedHiddenFields).flat().length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-surface-100 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-surface-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Hidden Fields</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {totalHidden} field{totalHidden !== 1 ? 's' : ''} hidden from report
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-200 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-surface-200">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search hidden fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-200 border border-surface-300 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Field List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {totalHidden === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-sm text-text-secondary">No hidden fields</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Swipe left on any field to hide it
                </p>
              </div>
            ) : (
              Object.entries(groupedHiddenFields).map(([sectionName, fields]) => (
                <div key={sectionName}>
                  <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
                    {sectionName}
                  </h3>
                  <div className="space-y-1">
                    {fields.map(({ fieldName, label }) => (
                      <label
                        key={fieldName}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          selectedFields.includes(fieldName)
                            ? 'bg-brand/10 border border-brand/30'
                            : 'bg-surface-200/50 border border-transparent hover:bg-surface-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(fieldName)}
                          onChange={() => toggleField(fieldName)}
                          className="w-4 h-4 rounded border-surface-300"
                          style={{ accentColor: '#6366f1' }}
                        />
                        <span className="text-sm text-text-primary">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {totalHidden > 0 && (
            <div className="p-4 border-t border-surface-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">
                  {selectedFields.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-brand hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-text-tertiary">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-text-tertiary hover:text-text-secondary"
                  >
                    Deselect
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={restoreSelected}
                  disabled={selectedFields.length === 0}
                  className="flex-1 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restore Selected ({selectedFields.length})
                </button>
                <button
                  type="button"
                  onClick={onRestoreAll}
                  className="px-4 py-2.5 bg-surface-200 text-text-secondary rounded-xl text-sm font-medium hover:bg-surface-300 transition-colors"
                >
                  Restore All
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
