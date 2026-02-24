import { describe, it, expect } from 'vitest';
import { calculateValues } from '@/types/valuation';

const baseInputs = {
  referenceNo: '19/2025',
  bankName: 'SBI',
  valuationDate: '01-01-2025',
  valuationForDate: '01-01-2025',
  purpose: 'Mortgage',
  plotArea: 200,
  landRatePerSqm: 50000,
  landRateSource: 'Circle Rate',
  locationIncreasePercent: 10,
  landShareFraction: '1/1',
  landShareDecimal: 1,
  plinthAreaRate: 1200,
  costIndex: 2800,
  specificationIncreasePercent: 15,
  yearOfConstruction: '2000',
  estimatedLifeYears: 60,
  ageAtValuation: 25,
};

describe('calculateValues', () => {
  it('calculates correct values with standard inputs', () => {
    const result = calculateValues(baseInputs, 150);

    // Construction: 1200 * (2800/100) = 33,600
    expect(result.rateOfConstruction).toBe(33600);
    // Net rate: 33600 * 1.15 = 38,640
    expect(result.netRateOfConstruction).toBe(38640);
    // Cost: 150 * 38640 = 5,796,000
    expect(result.costOfConstruction).toBe(5796000);
    // Remaining life: 60 - 25 = 35
    expect(result.remainingLife).toBe(35);
    // Depreciated: (35/60) * 5796000 = 3,381,000
    expect(result.depreciatedValue).toBeCloseTo(3381000, 0);

    // Land: 50000 * 1.10 = 55,000
    expect(result.netLandRate).toBeCloseTo(55000, 0);
    // Total land: 200 * 55000 = 11,000,000
    expect(result.totalLandValue).toBeCloseTo(11000000, 0);
    // Land share: 11000000 * 1 = 11,000,000
    expect(result.landShareValue).toBeCloseTo(11000000, 0);

    // Total: 11000000 + 3381000 = 14,381,000
    expect(result.totalPropertyValue).toBeCloseTo(14381000, 0);
    // Rounded to nearest 1000
    expect(result.roundedValue).toBe(14381000);
    expect(result.valueInWords).toBeTruthy();
  });

  it('handles zero floor area', () => {
    const result = calculateValues(baseInputs, 0);
    expect(result.costOfConstruction).toBe(0);
    expect(result.depreciatedValue).toBe(0);
    expect(result.totalPropertyValue).toBe(result.landShareValue);
  });

  it('handles zero land rate', () => {
    const result = calculateValues({ ...baseInputs, landRatePerSqm: 0 }, 150);
    expect(result.netLandRate).toBe(0);
    expect(result.totalLandValue).toBe(0);
    expect(result.landShareValue).toBe(0);
  });

  it('handles fractional land share', () => {
    const result = calculateValues({ ...baseInputs, landShareDecimal: 0.5 }, 150);
    expect(result.landShareValue).toBe(result.totalLandValue * 0.5);
  });

  it('handles zero estimated life (division by zero)', () => {
    const result = calculateValues({ ...baseInputs, estimatedLifeYears: 0 }, 150);
    // Division by zero: remainingLife = 0-25 = -25, depreciatedValue = (-25/0)*cost = -Infinity
    expect(result.depreciatedValue).toBe(-Infinity);
  });

  it('rounds to nearest thousand', () => {
    // Create inputs that produce a non-round number
    const result = calculateValues({
      ...baseInputs,
      plotArea: 100,
      landRatePerSqm: 10500,
      landShareDecimal: 1,
      locationIncreasePercent: 0,
    }, 0);
    // 100 * 10500 = 1,050,000 → rounds to 1,050,000
    expect(result.roundedValue % 1000).toBe(0);
  });
});
