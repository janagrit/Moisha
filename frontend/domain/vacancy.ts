import { addDays, dayTypeOf, diffDays, isWithin } from './dates';
import type { ISODate, Property, Thresholds } from './types';

export interface VacancyGap {
  start: ISODate;
  /** Exclusive: the morning after the last empty night. */
  end: ISODate;
  nights: number;
  startsInDays: number;
  isOrphan: boolean;
  includesWeekend: boolean;
}

export type VacancyResult =
  | { status: 'no-calendar' }
  | { status: 'ok'; gaps: VacancyGap[]; calendarStale: boolean };

export function isNightOccupied(property: Property, night: ISODate): boolean {
  return [...property.booked, ...property.blocked].some((range) => isWithin(night, range));
}

/** First open night from `today` within the horizon, or null. */
export function firstOpenNight(property: Property, today: ISODate, horizonDays: number): ISODate | null {
  for (let i = 0; i < horizonDays; i += 1) {
    const night = addDays(today, i);
    if (!isNightOccupied(property, night)) return night;
  }
  return null;
}

/** Empty nights are always derived from what is booked or blocked, never stored. */
export function findVacancyGaps(
  property: Property,
  today: ISODate,
  horizonDays: number,
  t: Pick<Thresholds, 'gapOrphanMaxNights' | 'calendarStaleDays'>,
): VacancyResult {
  if (!property.calendarUpdatedOn) return { status: 'no-calendar' };

  const gaps: VacancyGap[] = [];
  let runStart: ISODate | null = null;

  const closeRun = (end: ISODate, boundedRight: boolean) => {
    if (runStart === null) return;
    const start: ISODate = runStart;
    const nights = diffDays(end, start);
    let includesWeekend = false;
    for (let i = 0; i < nights; i += 1) {
      if (dayTypeOf(addDays(start, i)) === 'weekend') includesWeekend = true;
    }
    gaps.push({
      start,
      end,
      nights,
      startsInDays: diffDays(start, today),
      isOrphan: isNightOccupied(property, addDays(start, -1)) && boundedRight && nights <= t.gapOrphanMaxNights,
      includesWeekend,
    });
    runStart = null;
  };

  for (let i = 0; i < horizonDays; i += 1) {
    const night = addDays(today, i);
    if (isNightOccupied(property, night)) closeRun(night, true);
    else if (runStart === null) runStart = night;
  }
  const horizonEnd = addDays(today, horizonDays);
  closeRun(horizonEnd, isNightOccupied(property, horizonEnd));

  return {
    status: 'ok',
    gaps,
    calendarStale: diffDays(today, property.calendarUpdatedOn) > t.calendarStaleDays,
  };
}
