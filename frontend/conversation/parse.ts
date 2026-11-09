import { isoFromParts, isValidISODate } from '../domain/dates';
import type { ISODate } from '../domain/types';

const MAX_MONEY = 100_000;

/** Reads "$1,250", "215 a night" or "215". Returns null if there is no usable amount. */
export function parseMoney(raw: string, options: { allowZero?: boolean } = {}): number | null {
  const match = raw.replace(/,/g, '').match(/\d+(\.\d{1,2})?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (value > MAX_MONEY) return null;
  if (value === 0 && !options.allowZero) return null;
  return value;
}

/** A whole number within a range, or null. */
export function parseWhole(raw: string, min: number, max: number): number | null {
  const match = raw.match(/\d+/);
  if (!match) return null;
  const value = Number(match[0]);
  return value >= min && value <= max ? value : null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Reads 2026-11-12, 11/12 or "Nov 12". Dates without a year mean the next time it comes around. */
export function parseDate(raw: string, today: ISODate): ISODate | null {
  const text = raw.trim().toLowerCase();
  if (isValidISODate(text)) return text;

  const numeric = text.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (numeric) return isoFromParts(Number(numeric[1]), Number(numeric[2]), today);

  const named = text.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})$/);
  if (named) {
    const month = MONTHS.indexOf(named[1]);
    if (month >= 0) return isoFromParts(month + 1, Number(named[2]), today);
  }
  return null;
}
