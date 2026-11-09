import { dayTypeOf, diffDays } from './dates';
import { compFreshness, comparableComps, currentPriceFor, median } from './market';
import { known } from './provenance';
import type { BaselineRef, DayType, Figure, ISODate, Property, Thresholds, UnavailableReason, UserComp } from './types';
import { firstOpenNight, isNightOccupied } from './vacancy';

export type RecommendFlag = 'stale-comps-excluded' | 'baseline-stale' | 'conflict' | 'wide-spread' | 'not-day-specific';
export type Confidence = 'high' | 'medium' | 'low';

export interface RecommendationNotReady {
  state: 'not-enough-data';
  reason: UnavailableReason;
  /** Plain statement of what would unlock a recommendation. */
  needs: string;
}

export interface RecommendationReady {
  state: 'ok' | 'at-minimum' | 'booked-tonight';
  price: Figure;
  priceUsd: number;
  confidence: Confidence;
  basis: 'comps' | 'baseline' | 'comps+baseline';
  targetDate: ISODate;
  dayType: DayType;
  floorBinding: boolean;
  stepLimited: boolean;
  flags: RecommendFlag[];
  sampleSize: number;
}

export type Recommendation = RecommendationNotReady | RecommendationReady;

export interface RecommendInput {
  today: ISODate;
  property: Property;
  comps: UserComp[];
  baseline: BaselineRef | null;
  thresholds: Thresholds;
  horizonDays: number;
}

const notReady = (reason: UnavailableReason, needs: string): RecommendationNotReady => ({
  state: 'not-enough-data',
  reason,
  needs,
});

const lowerConfidence = (c: Confidence): Confidence => (c === 'high' ? 'medium' : 'low');

export function recommendPrice(i: RecommendInput): Recommendation {
  const { property, today, thresholds: t } = i;

  // Rule 1: no minimum, no number. The floor must exist before Moisha names a price.
  const floor = property.rules.minPriceUsd;
  if (floor === null) {
    return notReady('no-minimum-set', 'Set your minimum price so I can protect it.');
  }

  // Rule 2: price the next night that can actually be sold.
  const targetDate = firstOpenNight(property, today, i.horizonDays);
  if (targetDate === null) {
    return notReady('no-open-nights', `Every night in the next ${i.horizonDays} days is booked or blocked.`);
  }
  const dayType = dayTypeOf(targetDate);
  const dayLabel = dayType;

  // Rule 3: only fresh comps of the same size and day type set a price.
  const comparable = comparableComps(i.comps, property, dayType);
  const fresh = comparable.filter((c) => compFreshness(c, today, t) === 'fresh');
  const n = fresh.length;
  const flags: RecommendFlag[] = [];
  if (comparable.length > n) flags.push('stale-comps-excluded');

  const prices = fresh.map((c) => c.priceUsd);
  const compRef = n > 0 ? median(prices) : null;
  if (n > 0 && Math.max(...prices) / Math.min(...prices) > t.wideSpreadRatio) flags.push('wide-spread');

  const baselineUsd = i.baseline?.medianUsd ?? null;
  if (i.baseline?.stale) flags.push('baseline-stale');

  // Rule 4: decide what the data can support.
  let base: number;
  let basis: RecommendationReady['basis'];
  let confidence: Confidence;

  if (compRef !== null && n >= t.minCompsGood) {
    const ages = fresh.map((c) => Math.max(0, diffDays(today, c.enteredOn)));
    confidence = median(ages) <= t.highConfidenceMaxMedianAgeDays ? 'high' : 'medium';
    base = compRef;
    basis = 'comps';
  } else if (compRef !== null && n >= t.minCompsOk) {
    confidence = 'medium';
    base = compRef;
    basis = 'comps';
  } else if (compRef !== null && n >= t.minCompsLow) {
    confidence = 'low';
    base = compRef;
    basis = 'comps';
  } else if (compRef !== null && baselineUsd !== null) {
    confidence = 'low';
    base = (compRef + baselineUsd) / 2;
    basis = 'comps+baseline';
    flags.push('not-day-specific');
  } else if (compRef !== null) {
    return notReady('too-few-comps', `Add at least 1 more fresh ${dayLabel} price for a ${property.bedrooms}-bedroom nearby.`);
  } else if (baselineUsd !== null) {
    confidence = 'low';
    base = baselineUsd;
    basis = 'baseline';
    flags.push('not-day-specific');
  } else {
    return notReady(
      comparable.length > 0 ? 'all-stale' : 'no-comps',
      comparable.length > 0
        ? `Update your ${dayLabel} comps. They are more than ${t.freshDays} days old.`
        : `Add at least ${t.minCompsLow} nearby ${dayLabel} prices for ${property.bedrooms}-bedroom places.`,
    );
  }

  // A cross-check only: disagreement lowers confidence but does not move the number.
  if (n >= t.minCompsOk && compRef !== null && baselineUsd !== null) {
    if ((Math.abs(compRef - baselineUsd) / baselineUsd) * 100 > t.disagreePct) {
      flags.push('conflict');
      confidence = lowerConfidence(confidence);
    }
  }

  // Rule 5: match the market. Moisha never discounts just to fill a night.
  const positioning = Math.min(10, Math.max(-10, property.rules.positioningPct));
  let price = base * (1 + positioning / 100);

  // Rule 6: no big jumps in one move.
  const current = currentPriceFor(property, dayType);
  let stepLimited = false;
  if (current !== null && current > 0) {
    const limit = (property.rules.maxStepPct / 100) * current;
    if (Math.abs(price - current) > limit) {
      price = price > current ? current + limit : current - limit;
      stepLimited = true;
    }
  }

  // Rule 7: the floor comes last so nothing can get underneath it.
  const floorBinding = price < floor;
  const priceUsd = Math.ceil(Math.max(price, floor));

  const asOfDates = [...fresh.map((c) => c.enteredOn), ...(i.baseline && basis !== 'comps' ? [i.baseline.snapshotDate] : [])];
  const asOf = asOfDates.reduce((latest, d) => (d > latest ? d : latest), asOfDates[0]);
  const sourceText =
    basis === 'comps'
      ? `Median of your ${n} ${dayLabel} comps`
      : basis === 'baseline'
        ? `Inside Airbnb, ${i.baseline!.label}`
        : `Your 1 comp blended with Inside Airbnb, ${i.baseline!.label}`;

  return {
    state: floorBinding ? 'at-minimum' : isNightOccupied(property, today) ? 'booked-tonight' : 'ok',
    price: known('estimate', priceUsd, 'usd', asOf, sourceText, { sampleSize: n }),
    priceUsd,
    confidence,
    basis,
    targetDate,
    dayType,
    floorBinding,
    stepLimited,
    flags,
    sampleSize: n,
  };
}
