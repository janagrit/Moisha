import {
  MonitoringState,
  MonitoringStateSchema,
  CompetitorListing,
  PriceChangeEvent,
} from '../types';
import { createPrototypeMonitoringState } from './prototypeData';

const STORAGE_KEY = 'moisha_competitor_monitor_v2';

export function createInitialMonitoringState(): MonitoringState {
  return {
    isPrototype: false,
    property: null,
    competitors: [],
    priceChanges: [],
    lastCheckedAt: null,
    previousCheckAt: null,
    lastCheckChangesCount: 0,
    emailConfig: {
      email: '',
      enabled: false,
    },
  };
}

export function loadMonitoringState(): MonitoringState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createPrototypeMonitoringState();
    const parsed = MonitoringStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : createPrototypeMonitoringState();
  } catch {
    return createPrototypeMonitoringState();
  }
}

export function saveMonitoringState(state: MonitoringState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function clearMonitoringState(): MonitoringState {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage restrictions
  }
  return createInitialMonitoringState();
}

export function isDailyCheckDue(lastCheckedAt: string | null, now = new Date()): boolean {
  if (!lastCheckedAt) return true;
  const last = new Date(lastCheckedAt);
  if (Number.isNaN(last.getTime())) return true;
  const hoursElapsed = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  return hoursElapsed >= 24;
}

export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return 'Not checked yet';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Not checked yet';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Records a competitor price check across one or more monitored listings.
 * Every observed price difference creates an immutable PriceChangeEvent with previousPrice,
 * newPrice, percentage delta, and timestamp.
 */
export function recordPriceCheck(
  state: MonitoringState,
  observedPricesById: Record<string, number>,
  checkedAtIso = new Date().toISOString(),
): {
  nextState: MonitoringState;
  detectedChanges: PriceChangeEvent[];
} {
  const detectedChanges: PriceChangeEvent[] = [];

  const updatedCompetitors: CompetitorListing[] = state.competitors.map((comp) => {
    const rawObserved = observedPricesById[comp.id];
    const nextPrice =
      typeof rawObserved === 'number' && Number.isFinite(rawObserved) && rawObserved > 0
        ? Math.round(rawObserved)
        : comp.nightlyPrice;

    if (nextPrice !== comp.nightlyPrice) {
      const deltaAmount = nextPrice - comp.nightlyPrice;
      const percentChange = Number(((deltaAmount / comp.nightlyPrice) * 100).toFixed(1));

      detectedChanges.push({
        id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        competitorId: comp.id,
        competitorName: comp.name,
        competitorPhotoUrl: comp.photoUrl ?? null,
        airbnbUrl: comp.airbnbUrl,
        bedrooms: comp.bedrooms,
        propertyType: comp.propertyType,
        previousPrice: comp.nightlyPrice,
        newPrice: nextPrice,
        deltaAmount,
        percentChange,
        changedAt: checkedAtIso,
      });

      return {
        ...comp,
        previousPrice: comp.nightlyPrice,
        nightlyPrice: nextPrice,
        lastCheckedAt: checkedAtIso,
        priceHistory: [
          ...comp.priceHistory,
          { price: nextPrice, recordedAt: checkedAtIso },
        ].slice(-60),
      };
    }

    return {
      ...comp,
      lastCheckedAt: checkedAtIso,
    };
  });

  const nextState: MonitoringState = {
    ...state,
    competitors: updatedCompetitors,
    priceChanges: [...detectedChanges, ...state.priceChanges].slice(0, 200),
    previousCheckAt: state.lastCheckedAt,
    lastCheckedAt: checkedAtIso,
    lastCheckChangesCount: detectedChanges.length,
  };

  return { nextState, detectedChanges };
}

export function buildPriceChangeMailtoHref(
  recipientEmail: string,
  propertyName: string,
  changes: PriceChangeEvent[],
): string {
  const subject = `Moisha Price Alert: ${changes.length} competitor ${changes.length === 1 ? 'change' : 'changes'} near ${propertyName}`;
  const lines = changes.map((c) => {
    const sign = c.deltaAmount > 0 ? '+' : '';
    return `• ${c.competitorName} (${c.bedrooms} bd): $${c.previousPrice} → $${c.newPrice}/night (${sign}${c.percentChange}%) — ${c.airbnbUrl}`;
  });

  const body = [
    `Competitor price changes detected for ${propertyName}:`,
    '',
    ...lines,
    '',
    `Checked at: ${formatTimestamp(changes[0]?.changedAt ?? new Date().toISOString())}`,
  ].join('\n');

  return `mailto:${encodeURIComponent(recipientEmail.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
