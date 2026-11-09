import { DEFAULT_RULES } from '../domain/config';
import { addDays, todayAt } from '../domain/dates';
import type { UserComp } from '../domain/types';
import { createEmptyMemory, type Memory } from '../memory/schema';

/** Fictional data for looking around. Never saved, exported or merged with real records. */
export function buildSampleMemory(now: Date): Memory {
  const today = todayAt(now);
  const comp = (id: string, label: string, priceUsd: number, availability: UserComp['availability'], extra: Partial<UserComp> = {}): UserComp => ({
    id,
    propertyId: 'sample',
    label,
    bedrooms: 3,
    priceUsd,
    appliesTo: 'any',
    availability,
    enteredOn: today,
    priceHistory: [],
    ...extra,
  });

  return {
    ...createEmptyMemory(now),
    preferences: { hostName: 'sample host', managerName: null, soundOn: false, horizonDays: 30 },
    selectedPropertyId: 'sample',
    nextId: 100,
    properties: [
      {
        id: 'sample',
        nickname: 'Sample Rowhouse',
        address: 'Fictional address',
        bedrooms: 3,
        rules: { ...DEFAULT_RULES, minPriceUsd: 180 },
        currentPrice: { weekday: 240, weekend: 275 },
        priceUpdatedOn: today,
        booked: [
          { start: addDays(today, 3), end: addDays(today, 6) },
          { start: addDays(today, 8), end: addDays(today, 12) },
        ],
        blocked: [],
        calendarUpdatedOn: today,
        costs: {
          cleaningPerStayUsd: 120,
          avgStayNights: 3,
          utilitiesMonthlyUsd: 300,
          maintenanceMonthlyUsd: 150,
          mortgageOrFixedMonthlyUsd: 2000,
          platformFeePct: 3,
        },
        createdAt: now.toISOString(),
      },
    ],
    comps: [
      comp('s1', 'Sample comp A', 225, 'vacant', { priceHistory: [{ priceUsd: 255, enteredOn: addDays(today, -6) }] }),
      comp('s2', 'Sample comp B', 262, 'vacant'),
      comp('s3', 'Sample comp C', 270, 'vacant'),
      comp('s4', 'Sample comp D', 295, 'booked'),
      comp('s5', 'Sample comp E', 325, 'booked'),
    ],
  };
}
