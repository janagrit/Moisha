import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays } from '../dates';
import { recommendPrice, type RecommendationReady } from '../recommend';
import { BASELINE, makeComp, makeInput, makeProperty, TODAY } from './fixtures';

function ready(result: ReturnType<typeof recommendPrice>): RecommendationReady {
  if (result.state === 'not-enough-data') throw new Error(`expected a price, got ${result.reason}`);
  return result;
}

const staleDate = addDays(TODAY, -10);

describe('recommendPrice sufficiency', () => {
  it('refuses to name a price with no minimum set', () => {
    const property = makeProperty({ rules: { minPriceUsd: null, positioningPct: 0, maxStepPct: 20 } });
    const result = recommendPrice(makeInput({ property, comps: [makeComp(250), makeComp(260), makeComp(270)] }));
    expect(result).toMatchObject({ state: 'not-enough-data', reason: 'no-minimum-set' });
  });

  it('refuses with no comps and no baseline', () => {
    expect(recommendPrice(makeInput())).toMatchObject({ state: 'not-enough-data', reason: 'no-comps' });
  });

  it('refuses with one comp and no baseline', () => {
    expect(recommendPrice(makeInput({ comps: [makeComp(250)] }))).toMatchObject({ reason: 'too-few-comps' });
  });

  it('refuses when every comp is stale, and says so', () => {
    const comps = [makeComp(250, { enteredOn: staleDate }), makeComp(260, { enteredOn: staleDate })];
    expect(recommendPrice(makeInput({ comps }))).toMatchObject({ reason: 'all-stale' });
  });

  it('gives low confidence with two comps', () => {
    const r = ready(recommendPrice(makeInput({ comps: [makeComp(240), makeComp(260)] })));
    expect(r).toMatchObject({ priceUsd: 250, confidence: 'low', basis: 'comps' });
  });

  it('gives medium confidence with three comps, using the median', () => {
    const r = ready(recommendPrice(makeInput({ comps: [makeComp(230), makeComp(250), makeComp(280)] })));
    expect(r).toMatchObject({ priceUsd: 250, confidence: 'medium' });
  });

  it('gives high confidence with five recent comps', () => {
    const comps = [230, 240, 250, 260, 270].map((p) => makeComp(p));
    expect(ready(recommendPrice(makeInput({ comps }))).confidence).toBe('high');
  });

  it('gives medium confidence with five older comps', () => {
    const comps = [230, 240, 250, 260, 270].map((p) => makeComp(p, { enteredOn: addDays(TODAY, -5) }));
    expect(ready(recommendPrice(makeInput({ comps }))).confidence).toBe('medium');
  });

  it('blends one comp with the baseline', () => {
    const r = ready(recommendPrice(makeInput({ comps: [makeComp(240)], baseline: BASELINE })));
    expect(r).toMatchObject({ priceUsd: 250, basis: 'comps+baseline', confidence: 'low' });
  });

  it('can use the baseline alone, with low confidence', () => {
    const r = ready(recommendPrice(makeInput({ baseline: BASELINE })));
    expect(r).toMatchObject({ priceUsd: 260, basis: 'baseline', confidence: 'low' });
    expect(r.flags).toContain('not-day-specific');
  });

  it('always labels the recommendation as an estimate', () => {
    const r = ready(recommendPrice(makeInput({ comps: [makeComp(240), makeComp(260)] })));
    expect(r.price.provenance).toBe('estimate');
  });
});

describe('recommendPrice filters', () => {
  it('ignores comps with a different bedroom count', () => {
    const comps = [makeComp(900, { bedrooms: 5 }), makeComp(240), makeComp(260)];
    expect(ready(recommendPrice(makeInput({ comps }))).priceUsd).toBe(250);
  });

  it('never lets weekend-only comps set a weekday price', () => {
    const comps = [makeComp(400, { appliesTo: 'weekend' }), makeComp(240, { appliesTo: 'weekday' }), makeComp(260, { appliesTo: 'weekday' })];
    expect(ready(recommendPrice(makeInput({ comps }))).priceUsd).toBe(250);
  });

  it('flags stale comps it excluded', () => {
    const comps = [makeComp(900, { enteredOn: staleDate }), makeComp(240), makeComp(260)];
    const r = ready(recommendPrice(makeInput({ comps })));
    expect(r.priceUsd).toBe(250);
    expect(r.flags).toContain('stale-comps-excluded');
  });

  it('lowers confidence when comps and baseline disagree, without moving the price', () => {
    const comps = [makeComp(230), makeComp(240), makeComp(250)];
    const r = ready(recommendPrice(makeInput({ comps, baseline: { ...BASELINE, medianUsd: 500 } })));
    expect(r).toMatchObject({ priceUsd: 240, confidence: 'low' });
    expect(r.flags).toContain('conflict');
  });
});

describe('recommendPrice calendar', () => {
  it('moves to the next open night when tonight is booked', () => {
    const property = makeProperty({ booked: [{ start: TODAY, end: addDays(TODAY, 4) }] });
    const r = ready(recommendPrice(makeInput({ property, comps: [makeComp(240), makeComp(260)] })));
    expect(r.state).toBe('booked-tonight');
    expect(r.targetDate).toBe(addDays(TODAY, 4));
    expect(r.dayType).toBe('weekend');
  });

  it('refuses when no night is open', () => {
    const property = makeProperty({ blocked: [{ start: TODAY, end: addDays(TODAY, 60) }] });
    expect(recommendPrice(makeInput({ property }))).toMatchObject({ reason: 'no-open-nights' });
  });
});

describe('recommendPrice price protection', () => {
  it('limits a single move to the step cap', () => {
    const property = makeProperty({ currentPrice: { weekday: 200, weekend: null } });
    const r = ready(recommendPrice(makeInput({ property, comps: [makeComp(400), makeComp(400)] })));
    expect(r).toMatchObject({ priceUsd: 240, stepLimited: true });
  });

  it('holds at the minimum when the market is below it', () => {
    const property = makeProperty({
      rules: { minPriceUsd: 230, positioningPct: 0, maxStepPct: 20 },
      currentPrice: { weekday: 240, weekend: null },
    });
    const r = ready(recommendPrice(makeInput({ property, comps: [makeComp(200), makeComp(210)] })));
    expect(r).toMatchObject({ priceUsd: 230, state: 'at-minimum', floorBinding: true });
  });

  it('never goes below the minimum and always returns a whole dollar, on any path', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: 900 }),
        fc.option(fc.integer({ min: 40, max: 900 }), { nil: null }),
        fc.array(fc.integer({ min: 20, max: 1500 }), { maxLength: 8 }),
        fc.option(fc.integer({ min: 20, max: 1500 }), { nil: null }),
        fc.integer({ min: -10, max: 10 }),
        (floor, current, prices, baselineMedian, positioningPct) => {
          const property = makeProperty({
            rules: { minPriceUsd: floor, positioningPct, maxStepPct: 20 },
            currentPrice: { weekday: current, weekend: null },
          });
          const result = recommendPrice(
            makeInput({
              property,
              comps: prices.map((p) => makeComp(p)),
              baseline: baselineMedian === null ? null : { ...BASELINE, medianUsd: baselineMedian },
            }),
          );
          if (result.state !== 'not-enough-data') {
            expect(result.priceUsd).toBeGreaterThanOrEqual(floor);
            expect(Number.isInteger(result.priceUsd)).toBe(true);
          }
        },
      ),
    );
  });
});
