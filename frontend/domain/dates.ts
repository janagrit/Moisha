import type { DayType, ISODate } from './types';

const DAY_MS = 86_400_000;

export const PROPERTY_TIME_ZONE = 'America/New_York';

function toUtcMs(date: ISODate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUtcMs(toUtcMs(value)) === value;
}

/** A month and day typed by the host: the next time that date comes around. */
export function isoFromParts(month: number, day: number, today: ISODate): ISODate | null {
  const thisYear = Number(today.slice(0, 4));
  const pad = (n: number) => String(n).padStart(2, '0');
  const candidate = `${thisYear}-${pad(month)}-${pad(day)}`;
  if (!isValidISODate(candidate)) return null;
  return candidate >= today ? candidate : `${thisYear + 1}-${pad(month)}-${pad(day)}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `earlier` to `later`. */
export function diffDays(later: ISODate, earlier: ISODate): number {
  return Math.round((toUtcMs(later) - toUtcMs(earlier)) / DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(date: ISODate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

/** Friday and Saturday nights count as the weekend. */
export function dayTypeOf(date: ISODate): DayType {
  const day = dayOfWeek(date);
  return day === 5 || day === 6 ? 'weekend' : 'weekday';
}

/** Today's calendar date at the properties, whatever the phone's own time zone is. */
export function todayAt(now: Date, timeZone: string = PROPERTY_TIME_ZONE): ISODate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function formatShortDate(date: ISODate): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(toUtcMs(date)),
  );
}

export function formatDayAndDate(date: ISODate): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(toUtcMs(date)));
}

export function isWithin(date: ISODate, range: { start: ISODate; end: ISODate }): boolean {
  return date >= range.start && date < range.end;
}
