import { known, unavailable } from './provenance';
import type { CostInputs, Figure, ISODate, Scenario } from './types';

const SOURCE = 'Calculated from your inputs';

export interface RevenueResult {
  gross: Figure;
  platformFees: Figure;
  operatingExpenses: Figure;
  net: Figure;
  netPerBookedNight: Figure;
  breakEvenNights: Figure;
  stays: number;
  warnings: ('booked-exceeds-period' | 'cannot-break-even')[];
}

export interface ScenarioComparison {
  scenario: Scenario;
  result: RevenueResult;
  netDelta: Figure;
  /** Booked nights this price needs to earn the same net as the first scenario. */
  nightsToMatchBaseline: Figure;
}

const toCents = (usd: number): number => Math.round((Number.isFinite(usd) ? Math.max(0, usd) : 0) * 100);
const avgStayOf = (costs: CostInputs): number => Math.max(1, costs.avgStayNights || 1);
const feeRate = (costs: CostInputs): number => Math.max(0, costs.platformFeePct) / 100;

function fixedCostsCents(costs: CostInputs, periodNights: number): number {
  const monthly =
    toCents(costs.utilitiesMonthlyUsd) + toCents(costs.maintenanceMonthlyUsd) + toCents(costs.mortgageOrFixedMonthlyUsd);
  return Math.round((monthly * periodNights) / 30);
}

function compute(costs: CostInputs, price: number, nights: number, periodNights: number) {
  const booked = Math.max(0, nights);
  const stays = booked > 0 ? Math.ceil(booked / avgStayOf(costs)) : 0;
  const grossCents = toCents(price) * booked;
  const feeCents = Math.round(grossCents * feeRate(costs));
  const fixedCents = fixedCostsCents(costs, periodNights);
  const opexCents = toCents(costs.cleaningPerStayUsd) * stays + fixedCents + feeCents;
  return { grossCents, feeCents, opexCents, netCents: grossCents - opexCents, fixedCents, stays };
}

/** Earnings per booked night after the platform fee and cleaning. */
function contributionPerNightCents(costs: CostInputs, price: number): number {
  return toCents(price) * (1 - feeRate(costs)) - toCents(costs.cleaningPerStayUsd) / avgStayOf(costs);
}

const money = (cents: number, asOf: ISODate): Figure => known('estimate', cents / 100, 'usd', asOf, SOURCE);

/** Arithmetic on the host's own assumptions. Booked nights are an input and are never inferred from price. */
export function calculateRevenue(costs: CostInputs, scenario: Scenario, asOf: ISODate): RevenueResult {
  const p = compute(costs, scenario.nightlyPriceUsd, scenario.assumedBookedNights, scenario.periodNights);
  const contribution = contributionPerNightCents(costs, scenario.nightlyPriceUsd);
  const warnings: RevenueResult['warnings'] = [];
  if (scenario.assumedBookedNights > scenario.periodNights) warnings.push('booked-exceeds-period');
  if (contribution <= 0) warnings.push('cannot-break-even');

  return {
    gross: money(p.grossCents, asOf),
    platformFees: money(p.feeCents, asOf),
    operatingExpenses: money(p.opexCents, asOf),
    net: money(p.netCents, asOf),
    netPerBookedNight:
      scenario.assumedBookedNights > 0
        ? money(Math.round(p.netCents / scenario.assumedBookedNights), asOf)
        : unavailable('no-booked-nights'),
    breakEvenNights:
      contribution > 0
        ? known('estimate', Math.ceil(p.fixedCents / contribution), 'nights', asOf, SOURCE)
        : unavailable('no-booked-nights'),
    stays: p.stays,
    warnings,
  };
}

/** How many booked nights `price` needs to reach `targetNetUsd`. Arithmetic, not a forecast. */
export function nightsNeededToMatch(
  costs: CostInputs,
  targetNetUsd: number,
  price: number,
  periodNights: number,
  asOf: ISODate,
): Figure {
  const contribution = contributionPerNightCents(costs, price);
  if (contribution <= 0) return unavailable('no-booked-nights');
  const needed = (Math.round(targetNetUsd * 100) + fixedCostsCents(costs, periodNights)) / contribution;
  return known('estimate', Math.max(0, Math.ceil(needed)), 'nights', asOf, SOURCE);
}

/** Compares each scenario against the first. */
export function compareScenarios(costs: CostInputs, scenarios: Scenario[], asOf: ISODate): ScenarioComparison[] {
  if (scenarios.length === 0) return [];
  const first = scenarios[0];
  const base = compute(costs, first.nightlyPriceUsd, first.assumedBookedNights, first.periodNights);
  return scenarios.map((scenario) => {
    const p = compute(costs, scenario.nightlyPriceUsd, scenario.assumedBookedNights, scenario.periodNights);
    return {
      scenario,
      result: calculateRevenue(costs, scenario, asOf),
      netDelta: money(p.netCents - base.netCents, asOf),
      nightsToMatchBaseline: nightsNeededToMatch(costs, base.netCents / 100, scenario.nightlyPriceUsd, scenario.periodNights, asOf),
    };
  });
}
