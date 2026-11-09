import type { CostInputs, PricingRules, Thresholds } from './types';

/** Starting defaults. Not validated against real pricing outcomes, so review them over time. */
export const DEFAULT_THRESHOLDS: Thresholds = {
  freshDays: 7,
  staleDays: 21,
  minCompsGood: 5,
  minCompsOk: 3,
  minCompsLow: 2,
  highConfidenceMaxMedianAgeDays: 3,
  disagreePct: 30,
  inLinePct: 5,
  wellOffPct: 15,
  wideSpreadRatio: 2.5,
  gapOrphanMaxNights: 2,
  compChangeWindowDays: 7,
  compChangeMinPct: 5,
  compChangeMinUsd: 10,
  calendarStaleDays: 3,
};

export const DEFAULT_RULES: PricingRules = {
  minPriceUsd: null,
  positioningPct: 0,
  maxStepPct: 20,
};

export const DEFAULT_HORIZON_DAYS = 30;

export const EMPTY_COSTS: CostInputs = {
  cleaningPerStayUsd: 0,
  avgStayNights: 3,
  utilitiesMonthlyUsd: 0,
  maintenanceMonthlyUsd: 0,
  mortgageOrFixedMonthlyUsd: 0,
  platformFeePct: 0,
};
