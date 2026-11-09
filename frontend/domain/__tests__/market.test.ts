import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS } from '../config';
import { addDays } from '../dates';
import { compareMarket, median, type MarketInput } from '../market';
import { formatFigure, isKnown, provenanceLabel } from '../provenance';
import type { Figure } from '../types';
import { BASELINE, makeComp, makeProperty, TODAY } from './fixtures';

const input = (overrides: Partial<MarketInput> = {}): MarketInput => ({
  today: TODAY,
  property: makeProperty(),
  comps: [],
  baseline: null,
  thresholds: DEFAULT_THRESHOLDS,
  dayType: 'weekday',
  ...overrides,
});

const value = (f: Figure) => (isKnown(f) ? f.value : null);

describe('median', () => {
  it('handles odd and even lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('compareMarket', () => {
  it('computes average, low and high from fresh comps', () => {
    const m = compareMarket(input({ comps: [makeComp(219, { label: 'Cheap' }), makeComp(260), makeComp(325, { label: 'Dear' })] }));
    expect(value(m.average)).toBeCloseTo(268);
    expect(value(m.low)).toBe(219);
    expect(value(m.high)).toBe(325);
    expect(m.lowLabel).toBe('Cheap');
    expect(m.highLabel).toBe('Dear');
    expect(m.average.provenance).toBe('user-entered');
  });

  it('rounds the average to a whole dollar', () => {
    expect(value(compareMarket(input({ comps: [makeComp(225), makeComp(262), makeComp(295)] })).average)).toBe(261);
  });

  it('reports no comps as unavailable, not zero', () => {
    const m = compareMarket(input());
    expect(m.average).toEqual({ provenance: 'unavailable', reason: 'no-comps' });
    expect(formatFigure(m.average)).not.toMatch(/\d/);
    expect(m.position.band).toBeNull();
  });

  it('counts stale and expired comps but leaves them out of the numbers', () => {
    const comps = [
      makeComp(250),
      makeComp(900, { enteredOn: addDays(TODAY, -10) }),
      makeComp(900, { enteredOn: addDays(TODAY, -30) }),
    ];
    const m = compareMarket(input({ comps }));
    expect(m.counts).toMatchObject({ fresh: 1, stale: 1, expired: 1 });
    expect(value(m.high)).toBe(250);
  });

  it('will not claim a position with fewer than three comps and no baseline', () => {
    const m = compareMarket(input({ comps: [makeComp(250), makeComp(260)] }));
    expect(m.position).toMatchObject({ band: null, against: null });
    expect(value(m.average)).toBe(255);
  });

  it.each([
    [262, 250, 'in-line'],
    [263, 250, 'above'],
    [287, 250, 'above'],
    [288, 250, 'well-above'],
    [238, 250, 'in-line'],
    [237, 250, 'below'],
    [212, 250, 'well-below'],
  ])('places a $%i price against a $%i median as %s', (current, ref, band) => {
    const property = makeProperty({ currentPrice: { weekday: current, weekend: null } });
    const m = compareMarket(input({ property, comps: [makeComp(ref), makeComp(ref), makeComp(ref)] }));
    expect(m.position.band).toBe(band);
  });

  it('falls back to the public baseline and marks the result an estimate', () => {
    const m = compareMarket(input({ baseline: BASELINE }));
    expect(m.position.against).toBe('baseline');
    expect(m.position.percent.provenance).toBe('estimate');
    expect(m.baseline.provenance).toBe('verified-public');
  });

  it('keeps the public baseline separate from the comp average', () => {
    const m = compareMarket(input({ comps: [makeComp(200)], baseline: BASELINE }));
    expect(value(m.average)).toBe(200);
    expect(value(m.baseline)).toBe(260);
  });

  it('uses the weekend price on a weekend, or the weekday price if none is set', () => {
    const both = makeProperty({ currentPrice: { weekday: 200, weekend: 300 } });
    expect(value(compareMarket(input({ property: both, dayType: 'weekend' })).current)).toBe(300);
    expect(value(compareMarket(input({ dayType: 'weekend' })).current)).toBe(240);
  });

  it('detects a recent competitor price change', () => {
    const comp = makeComp(225, { priceHistory: [{ priceUsd: 275, enteredOn: addDays(TODAY, -8) }] });
    expect(compareMarket(input({ comps: [comp] })).recentChanges).toMatchObject([{ fromUsd: 275, toUsd: 225 }]);
  });

  it('ignores a trivial price change', () => {
    const comp = makeComp(252, { priceHistory: [{ priceUsd: 250, enteredOn: addDays(TODAY, -2) }] });
    expect(compareMarket(input({ comps: [comp] })).recentChanges).toEqual([]);
  });

  it('notes booked neighbors priced above open ones only with enough of each', () => {
    const open = [makeComp(200), makeComp(210)];
    const booked = [makeComp(260, { availability: 'booked' }), makeComp(280, { availability: 'booked' })];
    expect(compareMarket(input({ comps: [...open, ...booked] })).bookedPricedHigher).toBe(true);
    expect(compareMarket(input({ comps: [...open, booked[0]] })).bookedPricedHigher).toBe(false);
  });
});

describe('figure labels', () => {
  it('names where each number came from', () => {
    const m = compareMarket(input({ comps: [makeComp(250)], baseline: BASELINE }));
    expect(provenanceLabel(m.average)).toBe('You entered, Nov 9');
    expect(provenanceLabel(m.baseline)).toBe('Public data, Sep 19');
  });
});
