import { DEFAULT_HORIZON_DAYS, DEFAULT_RULES, DEFAULT_THRESHOLDS, EMPTY_COSTS } from '../config';
import type { RecommendInput } from '../recommend';
import type { BaselineRef, Property, UserComp } from '../types';

/** A Monday. */
export const TODAY = '2026-11-09';

export function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'p1',
    nickname: 'Test house',
    address: '',
    bedrooms: 3,
    rules: { ...DEFAULT_RULES, minPriceUsd: 150 },
    currentPrice: { weekday: 240, weekend: null },
    priceUpdatedOn: TODAY,
    booked: [],
    blocked: [],
    costs: EMPTY_COSTS,
    createdAt: `${TODAY}T12:00:00.000Z`,
    ...overrides,
  };
}

let counter = 0;
export function makeComp(priceUsd: number, overrides: Partial<UserComp> = {}): UserComp {
  counter += 1;
  return {
    id: `c${counter}`,
    propertyId: 'p1',
    label: `Comp ${counter}`,
    bedrooms: 3,
    priceUsd,
    appliesTo: 'any',
    availability: 'vacant',
    enteredOn: TODAY,
    priceHistory: [],
    ...overrides,
  };
}

export function makeInput(overrides: Partial<RecommendInput> = {}): RecommendInput {
  return {
    today: TODAY,
    property: makeProperty(),
    comps: [],
    baseline: null,
    thresholds: DEFAULT_THRESHOLDS,
    horizonDays: DEFAULT_HORIZON_DAYS,
    ...overrides,
  };
}

export const BASELINE: BaselineRef = {
  medianUsd: 260,
  n: 40,
  label: 'Test area, 3BR',
  snapshotDate: '2026-09-19',
  stale: false,
};
