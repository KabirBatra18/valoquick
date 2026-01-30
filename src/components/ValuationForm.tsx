'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ValuationReport,
  Owner,
  DEFAULT_COMPANY_DETAILS,
  calculateValues,
} from '@/types/valuation';

interface ValuationFormProps {
  onGenerate: (data: ValuationReport) => void;
  isGenerating: boolean;
  activeSection: number;
  setActiveSection: (section: number) => void;
}

// Reusable Input Component
const FormInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input className="form-input" {...props} />
  </div>
);

// Reusable Select Component
const FormSelect = ({ label, options, ...props }: {
  label: string;
  options: { value: string; label: string }[]
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <select className="form-select" {...props}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export default function ValuationForm({ onGenerate, activeSection }: ValuationFormProps) {
  // Property Address
  const [propertyNo, setPropertyNo] = useState('');
  const [block, setBlock] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('NEW DELHI');

  // Boundaries
  const [northBoundary, setNorthBoundary] = useState('');
  const [southBoundary, setSouthBoundary] = useState('');
  const [eastBoundary, setEastBoundary] = useState('');
  const [westBoundary, setWestBoundary] = useState('');

  // Owner Details
  const [originalOwner, setOriginalOwner] = useState('');
  const [originalOwnerYear, setOriginalOwnerYear] = useState('');
  const [currentOwners, setCurrentOwners] = useState<Owner[]>([{ name: '', share: '' }]);

  // Valuation Inputs
  const [referenceNo, setReferenceNo] = useState('');
  const [valuationDate, setValuationDate] = useState('');
  const [valuationForDate, setValuationForDate] = useState('');
  const [purpose, setPurpose] = useState('To assess Fair Market Value of the property for property gain purpose');

  // Land Details
  const [plotArea, setPlotArea] = useState<number>(0);
  const [landRatePerSqm, setLandRatePerSqm] = useState<number>(0);
  const [landRateSource, setLandRateSource] = useState('');
  const [locationIncreasePercent, setLocationIncreasePercent] = useState<number>(10);
  const [landShareFraction, setLandShareFraction] = useState('1/3');
  const [landShareDecimal, setLandShareDecimal] = useState<number>(0.333);

  // Construction Details
  const [floorArea, setFloorArea] = useState<number>(0);
  const [plinthAreaRate, setPlinthAreaRate] = useState<number>(2810);
  const [costIndex, setCostIndex] = useState<number>(166);
  const [specificationIncreasePercent, setSpecificationIncreasePercent] = useState<number>(35);

  // Depreciation
  const [yearOfConstruction, setYearOfConstruction] = useState('');
  const [estimatedLifeYears, setEstimatedLifeYears] = useState<number>(80);
  const [ageAtValuation, setAgeAtValuation] = useState<number>(0);

  // Building Specifications
  const [roof, setRoof] = useState('R.C.C');
  const [brickwork, setBrickwork] = useState('9" thick brick masonry');
  const [flooring, setFlooring] = useState('Marble');
  const [tiles, setTiles] = useState('Glazed tiles in bathroom');
  const [electrical, setElectrical] = useState('Internal conduit');
  const [electricalSwitches, setElectricalSwitches] = useState('Good quality');
  const [sanitaryFixtures, setSanitaryFixtures] = useState('White');
  const [woodwork, setWoodwork] = useState('Doors & windows are of Teak wood');
  const [exterior, setExterior] = useState('');

  // Technical Details
  const [floorHeight, setFloorHeight] = useState('10\'6"');
  const [constructionType, setConstructionType] = useState('Load Bearing + RCC framed');
  const [foundationType, setFoundationType] = useState('Brick / RCC');
  const [partitions, setPartitions] = useState('Brick walls');
  const [roofingTerracing, setRoofingTerracing] = useState('Mud Phuska');
  const [architecturalFeatures, setArchitecturalFeatures] = useState('');
  const [noOfWaterClosets, setNoOfWaterClosets] = useState<number>(2);
  const [noOfSinks, setNoOfSinks] = useState<number>(2);
  const [sanitaryFittingsClass, setSanitaryFittingsClass] = useState('Superior');
  const [compoundWallHeight, setCompoundWallHeight] = useState('5 ft');
  const [compoundWallType, setCompoundWallType] = useState('Brick masonry');
  const [overheadTank, setOverheadTank] = useState('');
  const [noOfPumps, setNoOfPumps] = useState('');
  const [sewerDisposal, setSewerDisposal] = useState('Public sewer');

  // General Details
  const [propertyType, setPropertyType] = useState('Residential');
  const [localityClass, setLocalityClass] = useState('Middle Class');
  const [plotShape, setPlotShape] = useState('Rectangular Plot');
  const [isLeasehold, setIsLeasehold] = useState(false);
  const [buildingOccupancy, setBuildingOccupancy] = useState('Owner occupied');

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
  });

  const addOwner = () => setCurrentOwners([...currentOwners, { name: '', share: '' }]);

  const updateOwner = (index: number, field: keyof Owner, value: string) => {
    const updated = [...currentOwners];
    updated[index][field] = value;
    setCurrentOwners(updated);
  };

  const removeOwner = (index: number) => {
    if (currentOwners.length > 1) {
      setCurrentOwners(currentOwners.filter((_, i) => i !== index));
    }
  };

  const removePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = `PROPERTY NO. ${propertyNo}, BLOCK-${block}, ${area}, ${city}`;
    const valuationInputs = {
      referenceNo, valuationDate, valuationForDate, purpose, plotArea, landRatePerSqm,
      landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal,
      plinthAreaRate, costIndex, specificationIncreasePercent, yearOfConstruction,
      estimatedLifeYears, ageAtValuation,
    };
    const calculatedValues = calculateValues(valuationInputs, floorArea);

    const reportData: ValuationReport = {
      ...DEFAULT_COMPANY_DETAILS,
      propertyAddress: { propertyNo, block, area, city, fullAddress },
      boundaries: { north: northBoundary, south: southBoundary, east: eastBoundary, west: westBoundary },
      originalOwner, originalOwnerYear, currentOwners, valuationInputs,
      floors: [{
        floorName: 'Ground Floor', area: floorArea, height: floorHeight, yearOfConstruction,
        walls: 'Brick walls', doorsWindows: woodwork.includes('Teak') ? 'Teak Wood' : woodwork,
        flooring, finishing: 'Cement sand plaster with POP and Paint finish',
      }],
      technicalDetails: {
        noOfFloors: 'Ground Floor', heightOfFloors: `Ht of Ground floor -${floorHeight}`,
        totalCoveredArea: `GF-${floorArea}Sqm`, yearOfConstruction,
        estimatedLife: `${estimatedLifeYears} years from the year of construction`,
        constructionType, foundationType, partitions, roofingTerracing, architecturalFeatures,
        internalWiring: electrical, fittingsClass: electricalSwitches, noOfWaterClosets, noOfSinks,
        sanitaryFittingsClass, compoundWallHeight, compoundWallType, noOfLifts: 'None',
        undergroundPump: 'None', overheadTank, noOfPumps, roadsPaving: 'N/A', sewerDisposal,
      },
      generalDetails: {
        propertyType, localityClass, proximityToCivicAmenities: 'All available very nearby',
        surfaceCommunication: 'By all sort of transport', plotShape, isLeasehold,
        restrictiveCovenants: 'No', easementAgreements: 'No', townPlanningArea: 'Within MC area.',
        developmentContribution: 'No', acquisitionNotification: 'No', buildingOccupancy,
        floorSpaceIndex: 'As per Building Bye-Laws', propertyTax: 'N/A', buildingInsurance: 'N/A',
      },
      buildingSpecs: { roof, brickwork, flooring, tiles, electrical, electricalSwitches, sanitaryFixtures, woodwork, exterior },
      calculatedValues, photos,
    };
    onGenerate(reportData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 0: Property Details */}
      {activeSection === 0 && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Property Address</h3>
            <div className="grid-2">
              <FormInput label="Property No." value={propertyNo} onChange={(e) => setPropertyNo(e.target.value)} placeholder="e.g., D-44" required />
              <FormInput label="Block" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="e.g., F" required />
              <FormInput label="Area / Colony" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g., TAGORE GARDEN" required />
              <FormInput label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Property Boundaries</h3>
            <div className="grid-2">
              <FormInput label="North" value={northBoundary} onChange={(e) => setNorthBoundary(e.target.value)} placeholder="e.g., 36' Road" />
              <FormInput label="South" value={southBoundary} onChange={(e) => setSouthBoundary(e.target.value)} placeholder="e.g., Road" />
              <FormInput label="East" value={eastBoundary} onChange={(e) => setEastBoundary(e.target.value)} placeholder="e.g., Plot No 43" />
              <FormInput label="West" value={westBoundary} onChange={(e) => setWestBoundary(e.target.value)} placeholder="e.g., Plot No 45" />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Property Classification</h3>
            <div className="grid-3">
              <FormSelect label="Property Type" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} options={[
                { value: 'Residential', label: 'Residential' },
                { value: 'Commercial', label: 'Commercial' },
                { value: 'Industrial', label: 'Industrial' },
                { value: 'Mixed', label: 'Mixed Use' },
              ]} />
              <FormSelect label="Locality Class" value={localityClass} onChange={(e) => setLocalityClass(e.target.value)} options={[
                { value: 'High Class', label: 'High Class' },
                { value: 'Middle Class', label: 'Middle Class' },
                { value: 'Poor Class', label: 'Poor Class' },
              ]} />
              <FormSelect label="Plot Shape" value={plotShape} onChange={(e) => setPlotShape(e.target.value)} options={[
                { value: 'Rectangular Plot', label: 'Rectangular' },
                { value: 'Square Plot', label: 'Square' },
                { value: 'Irregular Plot', label: 'Irregular' },
              ]} />
              <FormSelect label="Land Type" value={isLeasehold ? 'leasehold' : 'freehold'} onChange={(e) => setIsLeasehold(e.target.value === 'leasehold')} options={[
                { value: 'freehold', label: 'Freehold' },
                { value: 'leasehold', label: 'Leasehold' },
              ]} />
              <FormSelect label="Building Occupancy" value={buildingOccupancy} onChange={(e) => setBuildingOccupancy(e.target.value)} options={[
                { value: 'Owner occupied', label: 'Owner Occupied' },
                { value: 'Tenanted', label: 'Tenanted' },
                { value: 'Both', label: 'Both' },
              ]} />
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Owner Information */}
      {activeSection === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Original Owner</h3>
            <div className="grid-2">
              <FormInput label="Owner Name" value={originalOwner} onChange={(e) => setOriginalOwner(e.target.value)} placeholder="e.g., SMT RAJ KHURANA" required />
              <FormInput label="Year of Ownership" value={originalOwnerYear} onChange={(e) => setOriginalOwnerYear(e.target.value)} placeholder="e.g., 2001" required />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Current Owners</h3>
            <div className="space-y-4">
              {currentOwners.map((owner, index) => (
                <div key={index} className="owner-card">
                  <div className="flex-1">
                    <label className="form-label">Owner Name</label>
                    <input
                      className="form-input"
                      type="text"
                      value={owner.name}
                      onChange={(e) => updateOwner(index, 'name', e.target.value)}
                      placeholder="e.g., Mrs Renu Khurana"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="form-label">Share</label>
                    <input
                      className="form-input"
                      type="text"
                      value={owner.share}
                      onChange={(e) => updateOwner(index, 'share', e.target.value)}
                      placeholder="e.g., 1/4th"
                      required
                    />
                  </div>
                  {currentOwners.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOwner(index)}
                      className="btn btn-danger self-end"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOwner} className="btn btn-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Another Owner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Valuation Parameters */}
      {activeSection === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Reference Details</h3>
            <div className="grid-3">
              <FormInput label="Reference No." value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g., 19/2025" required />
              <FormInput label="Valuation Date" value={valuationDate} onChange={(e) => setValuationDate(e.target.value)} placeholder="e.g., 15-11-2025" required />
              <FormInput label="Valuation For Date" value={valuationForDate} onChange={(e) => setValuationForDate(e.target.value)} placeholder="e.g., 1-4-2001" required />
            </div>
            <div className="mt-4">
              <FormInput label="Purpose of Valuation" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Land Details</h3>
            <div className="grid-2">
              <FormInput label="Plot Area (Sqm)" type="number" step="0.0001" value={plotArea || ''} onChange={(e) => setPlotArea(parseFloat(e.target.value) || 0)} required />
              <FormInput label="Land Rate (Rs/Sqm)" type="number" value={landRatePerSqm || ''} onChange={(e) => setLandRatePerSqm(parseFloat(e.target.value) || 0)} required />
              <FormInput label="Land Rate Source" value={landRateSource} onChange={(e) => setLandRateSource(e.target.value)} placeholder="e.g., L&DO rates from 1-4-1998" />
              <FormInput label="Location Increase (%)" type="number" value={locationIncreasePercent} onChange={(e) => setLocationIncreasePercent(parseFloat(e.target.value) || 0)} />
              <FormInput label="Land Share Fraction" value={landShareFraction} onChange={(e) => setLandShareFraction(e.target.value)} placeholder="e.g., 1/3" />
              <FormInput label="Land Share Decimal" type="number" step="0.001" value={landShareDecimal} onChange={(e) => setLandShareDecimal(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Construction Details</h3>
            <div className="grid-2">
              <FormInput label="Floor Area (Sqm)" type="number" step="0.001" value={floorArea || ''} onChange={(e) => setFloorArea(parseFloat(e.target.value) || 0)} required />
              <FormInput label="Plinth Area Rate (as on 1.1.92)" type="number" value={plinthAreaRate} onChange={(e) => setPlinthAreaRate(parseFloat(e.target.value) || 0)} />
              <FormInput label="Cost Index" type="number" value={costIndex} onChange={(e) => setCostIndex(parseFloat(e.target.value) || 0)} />
              <FormInput label="Specification Increase (%)" type="number" value={specificationIncreasePercent} onChange={(e) => setSpecificationIncreasePercent(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Depreciation</h3>
            <div className="grid-3">
              <FormInput label="Year of Construction" value={yearOfConstruction} onChange={(e) => setYearOfConstruction(e.target.value)} placeholder="e.g., 1968-69" required />
              <FormInput label="Estimated Life (Years)" type="number" value={estimatedLifeYears} onChange={(e) => setEstimatedLifeYears(parseInt(e.target.value) || 0)} />
              <FormInput label="Age at Valuation (Years)" type="number" value={ageAtValuation} onChange={(e) => setAgeAtValuation(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Live Calculation Preview */}
          {plotArea > 0 && floorArea > 0 && landRatePerSqm > 0 && (
            <div className="calc-preview">
              <h3 className="glass-card-title text-brand">Live Calculation Preview</h3>
              {(() => {
                const calc = calculateValues(
                  { referenceNo, valuationDate, valuationForDate, purpose, plotArea, landRatePerSqm, landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal, plinthAreaRate, costIndex, specificationIncreasePercent, yearOfConstruction, estimatedLifeYears, ageAtValuation },
                  floorArea
                );
                return (
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div>
                      <p className="calc-label">Net Land Rate</p>
                      <p className="calc-value">Rs {calc.netLandRate.toFixed(2)}/Sqm</p>
                    </div>
                    <div>
                      <p className="calc-label">Land Share Value</p>
                      <p className="calc-value">Rs {calc.landShareValue.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="calc-label">Construction Cost</p>
                      <p className="calc-value">Rs {calc.costOfConstruction.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="calc-label">Depreciated Value</p>
                      <p className="calc-value">Rs {calc.depreciatedValue.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-2 pt-5 mt-2 border-t border-[rgba(255,255,255,0.06)]">
                      <p className="calc-label">Total Property Value</p>
                      <p className="calc-total">Rs {calc.roundedValue.toLocaleString('en-IN')}/-</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Building Specifications */}
      {activeSection === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Building Specifications</h3>
            <div className="grid-2">
              <FormInput label="Roof" value={roof} onChange={(e) => setRoof(e.target.value)} />
              <FormInput label="Brickwork" value={brickwork} onChange={(e) => setBrickwork(e.target.value)} />
              <FormInput label="Flooring" value={flooring} onChange={(e) => setFlooring(e.target.value)} />
              <FormInput label="Tiles" value={tiles} onChange={(e) => setTiles(e.target.value)} />
              <FormInput label="Electrical" value={electrical} onChange={(e) => setElectrical(e.target.value)} />
              <FormInput label="Electrical Switches" value={electricalSwitches} onChange={(e) => setElectricalSwitches(e.target.value)} />
              <FormInput label="Sanitary Fixtures" value={sanitaryFixtures} onChange={(e) => setSanitaryFixtures(e.target.value)} />
              <FormInput label="Woodwork" value={woodwork} onChange={(e) => setWoodwork(e.target.value)} />
            </div>
            <div className="mt-4">
              <FormInput label="Exterior Finish" value={exterior} onChange={(e) => setExterior(e.target.value)} placeholder="e.g., Exterior is of stone with stone railings" />
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Technical Details */}
      {activeSection === 4 && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Construction Details</h3>
            <div className="grid-2">
              <FormInput label="Floor Height" value={floorHeight} onChange={(e) => setFloorHeight(e.target.value)} />
              <FormSelect label="Construction Type" value={constructionType} onChange={(e) => setConstructionType(e.target.value)} options={[
                { value: 'Load Bearing', label: 'Load Bearing' },
                { value: 'RCC Frame', label: 'RCC Frame' },
                { value: 'Steel Frame', label: 'Steel Frame' },
                { value: 'Load Bearing + RCC framed', label: 'Load Bearing + RCC Framed' },
              ]} />
              <FormInput label="Foundation Type" value={foundationType} onChange={(e) => setFoundationType(e.target.value)} />
              <FormInput label="Partitions" value={partitions} onChange={(e) => setPartitions(e.target.value)} />
              <FormInput label="Roofing & Terracing" value={roofingTerracing} onChange={(e) => setRoofingTerracing(e.target.value)} />
              <FormInput label="Architectural Features" value={architecturalFeatures} onChange={(e) => setArchitecturalFeatures(e.target.value)} placeholder="e.g., Stone exterior with railing" />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Sanitary & Utilities</h3>
            <div className="grid-2">
              <FormInput label="No. of Water Closets" type="number" value={noOfWaterClosets} onChange={(e) => setNoOfWaterClosets(parseInt(e.target.value) || 0)} />
              <FormInput label="No. of Sinks" type="number" value={noOfSinks} onChange={(e) => setNoOfSinks(parseInt(e.target.value) || 0)} />
              <FormSelect label="Sanitary Fittings Class" value={sanitaryFittingsClass} onChange={(e) => setSanitaryFittingsClass(e.target.value)} options={[
                { value: 'Superior coloured', label: 'Superior Coloured' },
                { value: 'Superior white', label: 'Superior White' },
                { value: 'Superior', label: 'Superior' },
                { value: 'Ordinary', label: 'Ordinary' },
              ]} />
              <FormInput label="Overhead Tank" value={overheadTank} onChange={(e) => setOverheadTank(e.target.value)} placeholder="e.g., 2 tanks of 500L each" />
              <FormInput label="No. of Pumps" value={noOfPumps} onChange={(e) => setNoOfPumps(e.target.value)} placeholder="e.g., 1, 1HP" />
              <FormInput label="Sewer Disposal" value={sewerDisposal} onChange={(e) => setSewerDisposal(e.target.value)} />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Compound Wall</h3>
            <div className="grid-2">
              <FormInput label="Height" value={compoundWallHeight} onChange={(e) => setCompoundWallHeight(e.target.value)} />
              <FormInput label="Type" value={compoundWallType} onChange={(e) => setCompoundWallType(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Photos */}
      {activeSection === 5 && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Property Photos</h3>

            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-icon">
                <svg className="w-7 h-7 text-[rgba(255,255,255,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="dropzone-text">
                {isDragActive ? 'Drop photos here...' : 'Drag & drop photos here'}
              </p>
              <p className="dropzone-subtext">or click to browse</p>
              <p className="dropzone-subtext mt-2 text-xs opacity-70">Supports: JPG, PNG, WEBP</p>
            </div>

            {photos.length > 0 && (
              <div className="mt-6">
                <p className="text-sm mb-4 text-text-muted">{photos.length} photo(s) added</p>
                <div className="photo-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      <img src={photo} alt={`Property ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="delete-btn"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
