import { describe, expect, it } from 'vitest';
import { isKnown } from '../provenance';
import { calculateRevenue, compareScenarios, nightsNeededToMatch } from '../revenue';
import type { CostInputs, Figure, Scenario } from '../types';
import { TODAY } from './fixtures';

const COSTS: CostInputs = {
  cleaningPerStayUsd: 100,
  avgStayNights: 4,
  utilitiesMonthlyUsd: 300,
  maintenanceMonthlyUsd: 100,
  mortgageOrFixedMonthlyUsd: 2000,
  platformFeePct: 3,
};

const scenario = (nightlyPriceUsd: number, assumedBookedNights: number, overrides: Partial<Scenario> = {}): Scenario => ({
  id: `s${nightlyPriceUsd}`,
  label: `$${nightlyPriceUsd}`,
  nightlyPriceUsd,
  assumedBookedNights,
  periodNights: 30,
  ...overrides,
});

const value = (f: Figure) => (isKnown(f) ? f.value : null);

describe('calculateRevenue', () => {
  it('matches a hand-calculated month', () => {
    // Gross 250 x 20 = 5000. Stays 5, cleaning 500. Fixed 2400. Fee 3% = 150. Net 1950.
    const r = calculateRevenue(COSTS, scenario(250, 20), TODAY);
    expect(value(r.gross)).toBe(5000);
    expect(value(r.platformFees)).toBe(150);
    expect(value(r.operatingExpenses)).toBe(3050);
    expect(value(r.net)).toBe(1950);
    expect(value(r.netPerBookedNight)).toBe(97.5);
    expect(r.stays).toBe(5);
  });

  it('computes break-even nights', () => {
    // Each night clears 250 x 0.97 - 25 = 217.50. 2400 / 217.50 = 11.03, so 12.
    expect(value(calculateRevenue(COSTS, scenario(250, 20), TODAY).breakEvenNights)).toBe(12);
  });

  it('rounds partial stays up', () => {
    expect(calculateRevenue(COSTS, scenario(250, 21), TODAY).stays).toBe(6);
  });

  it('still charges fixed costs with no bookings', () => {
    const r = calculateRevenue(COSTS, scenario(250, 0), TODAY);
    expect(value(r.gross)).toBe(0);
    expect(value(r.net)).toBe(-2400);
    expect(r.netPerBookedNight.provenance).toBe('unavailable');
  });

  it('prorates monthly costs to the period', () => {
    expect(value(calculateRevenue(COSTS, scenario(250, 0, { periodNights: 15 }), TODAY).net)).toBe(-1200);
  });

  it('stays exact in cents', () => {
    const costs = { ...COSTS, cleaningPerStayUsd: 0, utilitiesMonthlyUsd: 0, maintenanceMonthlyUsd: 0, mortgageOrFixedMonthlyUsd: 0, platformFeePct: 0 };
    expect(value(calculateRevenue(costs, scenario(19.99, 3), TODAY).gross)).toBe(59.97);
  });

  it('labels every result as an estimate', () => {
    expect(calculateRevenue(COSTS, scenario(250, 20), TODAY).net.provenance).toBe('estimate');
  });

  it('warns when assumed nights exceed the period', () => {
    expect(calculateRevenue(COSTS, scenario(250, 31), TODAY).warnings).toContain('booked-exceeds-period');
  });

  it('warns when a price cannot cover cleaning and fees', () => {
    const r = calculateRevenue({ ...COSTS, cleaningPerStayUsd: 400, avgStayNights: 1 }, scenario(100, 5), TODAY);
    expect(r.warnings).toContain('cannot-break-even');
    expect(r.breakEvenNights.provenance).toBe('unavailable');
  });
});

describe('scenarios', () => {
  it('gives zero delta for identical scenarios', () => {
    const [, second] = compareScenarios(COSTS, [scenario(250, 20), scenario(250, 20)], TODAY);
    expect(value(second.netDelta)).toBe(0);
  });

  it('compares a proposed price against the first, using each stated assumption', () => {
    const [, second] = compareScenarios(COSTS, [scenario(250, 20), scenario(200, 20)], TODAY);
    // Same nights: gross falls 1000 and the fee falls 30.
    expect(value(second.netDelta)).toBe(-970);
  });

  it('does not change booked nights when the price changes', () => {
    const [first, second] = compareScenarios(COSTS, [scenario(250, 20), scenario(150, 20)], TODAY);
    expect(first.result.stays).toBe(second.result.stays);
  });

  it('returns nothing for an empty list', () => {
    expect(compareScenarios(COSTS, [], TODAY)).toEqual([]);
  });

  it('works out nights needed for a lower price to earn the same', () => {
    // Each night clears 200 x 0.97 - 25 = 169. (1950 + 2400) / 169 = 25.74, so 26.
    expect(value(nightsNeededToMatch(COSTS, 1950, 200, 30, TODAY))).toBe(26);
  });
});
