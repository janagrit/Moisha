import { diffDays } from './dates';
import { known, unavailable } from './provenance';
import type { BaselineRef, DayType, Figure, ISODate, Property, Thresholds, UserComp } from './types';

export type PositionBand = 'well-below' | 'below' | 'in-line' | 'above' | 'well-above';

export interface MarketPosition {
  band: PositionBand | null;
  percent: Figure;
  against: 'comps' | 'baseline' | null;
}

export interface CompChange {
  compId: string;
  label: string;
  fromUsd: number;
  toUsd: number;
  enteredOn: ISODate;
}

export interface MarketComparison {
  dayType: DayType;
  current: Figure;
  average: Figure;
  median: Figure;
  low: Figure;
  high: Figure;
  lowLabel?: string;
  highLabel?: string;
  baseline: Figure;
  position: MarketPosition;
  counts: { fresh: number; stale: number; expired: number; vacant: number; booked: number; otherBedrooms: number };
  bookedPricedHigher: boolean;
  recentChanges: CompChange[];
}

export interface MarketInput {
  today: ISODate;
  property: Property;
  comps: UserComp[];
  baseline: BaselineRef | null;
  thresholds: Thresholds;
  dayType: DayType;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export type Freshness = 'fresh' | 'stale' | 'expired';

export function compFreshness(comp: UserComp, today: ISODate, t: Thresholds): Freshness {
  const age = Math.max(0, diffDays(today, comp.enteredOn));
  if (age <= t.freshDays) return 'fresh';
  return age <= t.staleDays ? 'stale' : 'expired';
}

/** Comps comparable to this property for a day type, of any freshness. */
export function comparableComps(comps: UserComp[], property: Property, dayType: DayType): UserComp[] {
  return comps.filter(
    (c) =>
      c.propertyId === property.id &&
      c.bedrooms === property.bedrooms &&
      c.priceUsd > 0 &&
      (c.appliesTo === dayType || c.appliesTo === 'any'),
  );
}

export function currentPriceFor(property: Property, dayType: DayType): number | null {
  if (dayType === 'weekend' && property.currentPrice.weekend !== null) return property.currentPrice.weekend;
  return property.currentPrice.weekday;
}

function newestDate(comps: UserComp[]): ISODate {
  return comps.reduce((latest, c) => (c.enteredOn > latest ? c.enteredOn : latest), comps[0].enteredOn);
}

function findRecentChanges(i: MarketInput): CompChange[] {
  const t = i.thresholds;
  return i.comps
    .filter((c) => c.propertyId === i.property.id && c.priceHistory.length > 0)
    .flatMap((c) => {
      const previous = c.priceHistory[c.priceHistory.length - 1];
      if (diffDays(i.today, c.enteredOn) > t.compChangeWindowDays) return [];
      const delta = Math.abs(c.priceUsd - previous.priceUsd);
      const pct = previous.priceUsd > 0 ? (delta / previous.priceUsd) * 100 : 0;
      if (pct < t.compChangeMinPct && delta < t.compChangeMinUsd) return [];
      return [{ compId: c.id, label: c.label, fromUsd: previous.priceUsd, toUsd: c.priceUsd, enteredOn: c.enteredOn }];
    });
}

function bandFor(pct: number, t: Thresholds): PositionBand {
  if (Math.abs(pct) <= t.inLinePct) return 'in-line';
  if (pct > 0) return pct > t.wellOffPct ? 'well-above' : 'above';
  return pct < -t.wellOffPct ? 'well-below' : 'below';
}

export function compareMarket(i: MarketInput): MarketComparison {
  const t = i.thresholds;
  const all = comparableComps(i.comps, i.property, i.dayType);
  const fresh = all.filter((c) => compFreshness(c, i.today, t) === 'fresh');
  const stale = all.filter((c) => compFreshness(c, i.today, t) === 'stale');
  const expired = all.filter((c) => compFreshness(c, i.today, t) === 'expired');
  const n = fresh.length;
  const prices = fresh.map((c) => c.priceUsd);

  const missing = unavailable(all.length > 0 ? 'all-stale' : 'no-comps');
  const fromComps = (value: number): Figure =>
    known('user-entered', value, 'usd', newestDate(fresh), `Your ${n} ${n === 1 ? 'comp' : 'comps'}`, {
      sampleSize: n,
      caveat: n < t.minCompsOk ? `Only ${n} ${n === 1 ? 'comp' : 'comps'}` : undefined,
    });

  const lowComp = n > 0 ? fresh.reduce((a, b) => (b.priceUsd < a.priceUsd ? b : a)) : undefined;
  const highComp = n > 0 ? fresh.reduce((a, b) => (b.priceUsd > a.priceUsd ? b : a)) : undefined;
  const compMedian = n > 0 ? median(prices) : null;

  const baseline: Figure = i.baseline
    ? known('verified-public', i.baseline.medianUsd, 'usd', i.baseline.snapshotDate, `Inside Airbnb, ${i.baseline.label}`, {
        sampleSize: i.baseline.n,
        stale: i.baseline.stale,
        caveat: 'Median asking price, not what guests paid',
      })
    : unavailable('no-baseline');

  const currentUsd = currentPriceFor(i.property, i.dayType);
  const current: Figure =
    currentUsd !== null
      ? known('user-entered', currentUsd, 'usd', i.property.priceUpdatedOn ?? i.today, 'Your price')
      : unavailable('no-current-price');

  const useComps = n >= t.minCompsOk && compMedian !== null;
  const ref = useComps ? compMedian : i.baseline ? i.baseline.medianUsd : null;
  let position: MarketPosition;
  if (currentUsd === null) {
    position = { band: null, percent: unavailable('no-current-price'), against: null };
  } else if (ref === null) {
    position = { band: null, percent: unavailable(n > 0 ? 'too-few-comps' : missing.reason), against: null };
  } else {
    const pct = ((currentUsd - ref) / ref) * 100;
    position = {
      band: bandFor(pct, t),
      percent: useComps
        ? known('user-entered', pct, 'pct', newestDate(fresh), `Against your ${n} comps`, { sampleSize: n })
        : known('estimate', pct, 'pct', i.baseline!.snapshotDate, `Against Inside Airbnb, ${i.baseline!.label}`, {
            sampleSize: i.baseline!.n,
            stale: i.baseline!.stale,
          }),
      against: useComps ? 'comps' : 'baseline',
    };
  }

  const vacantPrices = fresh.filter((c) => c.availability === 'vacant').map((c) => c.priceUsd);
  const bookedPrices = fresh.filter((c) => c.availability === 'booked').map((c) => c.priceUsd);
  const bookedPricedHigher =
    vacantPrices.length >= 2 && bookedPrices.length >= 2 && median(bookedPrices) > median(vacantPrices) * 1.05;

  return {
    dayType: i.dayType,
    current,
    average: n > 0 ? fromComps(Math.round(prices.reduce((a, b) => a + b, 0) / n)) : missing,
    median: compMedian !== null ? fromComps(compMedian) : missing,
    low: lowComp ? fromComps(lowComp.priceUsd) : missing,
    high: highComp ? fromComps(highComp.priceUsd) : missing,
    lowLabel: lowComp?.label,
    highLabel: highComp?.label,
    baseline,
    position,
    counts: {
      fresh: n,
      stale: stale.length,
      expired: expired.length,
      vacant: vacantPrices.length,
      booked: bookedPrices.length,
      otherBedrooms: i.comps.filter((c) => c.propertyId === i.property.id && c.bedrooms !== i.property.bedrooms).length,
    },
    bookedPricedHigher,
    recentChanges: findRecentChanges(i),
  };
}
