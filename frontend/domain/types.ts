export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // UTC ISO timestamp

/** Where a number came from. Every market figure must carry one. */
export type Provenance = 'verified-public' | 'user-entered' | 'estimate' | 'unavailable';

export type FigureUnit = 'usd' | 'pct' | 'nights' | 'count';

export type UnavailableReason =
  | 'no-comps'
  | 'too-few-comps'
  | 'all-stale'
  | 'no-baseline'
  | 'no-minimum-set'
  | 'no-current-price'
  | 'no-calendar'
  | 'no-open-nights'
  | 'no-booked-nights';

export interface KnownFigure {
  provenance: Exclude<Provenance, 'unavailable'>;
  value: number;
  unit: FigureUnit;
  asOf: ISODate;
  source: string;
  sampleSize?: number;
  stale?: boolean;
  caveat?: string;
}

export interface UnavailableFigure {
  provenance: 'unavailable';
  reason: UnavailableReason;
}

export type Figure = KnownFigure | UnavailableFigure;

export type DayType = 'weekday' | 'weekend';

/** End is exclusive: it is the checkout date. */
export interface DateRange {
  start: ISODate;
  end: ISODate;
}

export interface CostInputs {
  cleaningPerStayUsd: number;
  avgStayNights: number;
  utilitiesMonthlyUsd: number;
  maintenanceMonthlyUsd: number;
  mortgageOrFixedMonthlyUsd: number;
  platformFeePct: number;
}

export interface PricingRules {
  minPriceUsd: number | null;
  /** Deliberate premium or discount to market, -10 to +10. */
  positioningPct: number;
  /** Largest single move from the current price, as a percent. */
  maxStepPct: number;
}

export interface Property {
  id: string;
  nickname: string;
  address: string;
  bedrooms: number;
  baselineNeighbourhoodId?: string;
  rules: PricingRules;
  currentPrice: { weekday: number | null; weekend: number | null };
  priceUpdatedOn?: ISODate;
  booked: DateRange[];
  blocked: DateRange[];
  calendarUpdatedOn?: ISODate;
  costs: CostInputs;
  createdAt: ISODateTime;
}

export type CompAvailability = 'vacant' | 'booked' | 'unknown';

export interface UserComp {
  id: string;
  propertyId: string;
  label: string;
  bedrooms: number;
  priceUsd: number;
  appliesTo: DayType | 'any';
  availability: CompAvailability;
  enteredOn: ISODate;
  /** Previous prices only, oldest first. */
  priceHistory: { priceUsd: number; enteredOn: ISODate }[];
}

export interface Scenario {
  id: string;
  label: string;
  nightlyPriceUsd: number;
  /** The host's own assumption. Never derived from price. */
  assumedBookedNights: number;
  periodNights: number;
}

export interface Thresholds {
  freshDays: number;
  staleDays: number;
  minCompsGood: number;
  minCompsOk: number;
  minCompsLow: number;
  highConfidenceMaxMedianAgeDays: number;
  disagreePct: number;
  inLinePct: number;
  wellOffPct: number;
  wideSpreadRatio: number;
  gapOrphanMaxNights: number;
  compChangeWindowDays: number;
  compChangeMinPct: number;
  compChangeMinUsd: number;
  calendarStaleDays: number;
}

/** A public-data reference chosen for one property. */
export interface BaselineRef {
  medianUsd: number;
  n: number;
  label: string;
  snapshotDate: ISODate;
  stale: boolean;
}
