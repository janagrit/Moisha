import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS } from '../config';
import { addDays, dayTypeOf, diffDays, isoFromParts, todayAt } from '../dates';
import { findVacancyGaps } from '../vacancy';
import { makeProperty, TODAY } from './fixtures';

const find = (overrides: Parameters<typeof makeProperty>[0], horizon = 14) =>
  findVacancyGaps(makeProperty({ calendarUpdatedOn: TODAY, ...overrides }), TODAY, horizon, DEFAULT_THRESHOLDS);

function gaps(result: ReturnType<typeof find>) {
  if (result.status !== 'ok') throw new Error('expected calendar');
  return result.gaps;
}

describe('findVacancyGaps', () => {
  it('distinguishes no calendar from no gaps', () => {
    const result = findVacancyGaps(makeProperty(), TODAY, 14, DEFAULT_THRESHOLDS);
    expect(result).toEqual({ status: 'no-calendar' });
  });

  it('treats an entered, empty calendar as one long gap', () => {
    expect(gaps(find({}))).toMatchObject([{ start: TODAY, nights: 14 }]);
  });

  it('treats checkout day as an open night', () => {
    const booked = [{ start: TODAY, end: addDays(TODAY, 3) }];
    expect(gaps(find({ booked }))[0].start).toBe(addDays(TODAY, 3));
  });

  it('counts blocked nights as not vacant', () => {
    const blocked = [{ start: addDays(TODAY, 2), end: addDays(TODAY, 14) }];
    expect(gaps(find({ blocked }))).toMatchObject([{ start: TODAY, nights: 2 }]);
  });

  it('merges overlapping ranges', () => {
    const booked = [
      { start: TODAY, end: addDays(TODAY, 5) },
      { start: addDays(TODAY, 3), end: addDays(TODAY, 14) },
    ];
    expect(gaps(find({ booked }))).toEqual([]);
  });

  it('flags a short gap between two stays as an orphan', () => {
    const booked = [
      { start: TODAY, end: addDays(TODAY, 3) },
      { start: addDays(TODAY, 5), end: addDays(TODAY, 8) },
    ];
    const [first, second] = gaps(find({ booked }));
    expect(first).toMatchObject({ nights: 2, isOrphan: true });
    expect(second.isOrphan).toBe(false);
  });

  it('notes when a gap includes a weekend', () => {
    const blocked = [{ start: addDays(TODAY, 4), end: addDays(TODAY, 14) }];
    expect(gaps(find({ blocked }))[0].includesWeekend).toBe(false);
    expect(gaps(find({}))[0].includesWeekend).toBe(true);
  });

  it('flags an out-of-date calendar', () => {
    const result = find({ calendarUpdatedOn: addDays(TODAY, -4) });
    expect(result).toMatchObject({ calendarStale: true });
  });
});

describe('dates', () => {
  it('crosses month ends, leap days and clock changes', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(diffDays('2026-03-09', '2026-03-07')).toBe(2);
  });

  it('calls Friday and Saturday nights the weekend', () => {
    expect(dayTypeOf('2026-11-13')).toBe('weekend');
    expect(dayTypeOf('2026-11-14')).toBe('weekend');
    expect(dayTypeOf('2026-11-15')).toBe('weekday');
  });

  it('uses the date at the property, not the phone', () => {
    expect(todayAt(new Date('2026-11-10T02:00:00Z'), 'America/New_York')).toBe('2026-11-09');
  });

  it('turns month and day into the next upcoming date', () => {
    expect(isoFromParts(11, 12, TODAY)).toBe('2026-11-12');
    expect(isoFromParts(1, 5, TODAY)).toBe('2027-01-05');
    expect(isoFromParts(2, 31, TODAY)).toBeNull();
  });
});
