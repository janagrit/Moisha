import { formatShortDate } from './dates';
import type { Figure, FigureUnit, ISODate, KnownFigure, UnavailableFigure, UnavailableReason } from './types';

export function known(
  provenance: KnownFigure['provenance'],
  value: number,
  unit: FigureUnit,
  asOf: ISODate,
  source: string,
  extras: Pick<KnownFigure, 'sampleSize' | 'stale' | 'caveat'> = {},
): KnownFigure {
  return { provenance, value, unit, asOf, source, ...extras };
}

export function unavailable(reason: UnavailableReason): UnavailableFigure {
  return { provenance: 'unavailable', reason };
}

export function isKnown(figure: Figure): figure is KnownFigure {
  return figure.provenance !== 'unavailable';
}

export function formatUsd(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
}

/** The only way to turn a market figure into display text. */
export function formatFigure(figure: Figure): string {
  if (!isKnown(figure)) return 'Not available';
  switch (figure.unit) {
    case 'usd':
      return formatUsd(figure.value);
    case 'pct':
      return `${Math.round(figure.value)}%`;
    case 'nights':
      return `${figure.value} ${figure.value === 1 ? 'night' : 'nights'}`;
    case 'count':
      return String(figure.value);
  }
}

const REASON_TEXT: Record<UnavailableReason, string> = {
  'no-comps': 'Add nearby prices to see this',
  'too-few-comps': 'Not enough comps yet',
  'all-stale': 'Your comps are out of date',
  'no-baseline': 'No public baseline loaded',
  'no-minimum-set': 'Set your minimum price first',
  'no-current-price': 'Enter your current price',
  'no-calendar': 'Enter your calendar to see this',
  'no-open-nights': 'No open nights in this window',
  'no-booked-nights': 'Needs at least one booked night',
};

export function reasonText(reason: UnavailableReason): string {
  return REASON_TEXT[reason];
}

/** Short label shown beside every figure, e.g. "You entered, Nov 9". */
export function provenanceLabel(figure: Figure): string {
  if (!isKnown(figure)) return reasonText(figure.reason);
  const date = formatShortDate(figure.asOf);
  switch (figure.provenance) {
    case 'verified-public':
      return `Public data, ${date}`;
    case 'user-entered':
      return `You entered, ${date}`;
    case 'estimate':
      return 'Estimate';
  }
}
