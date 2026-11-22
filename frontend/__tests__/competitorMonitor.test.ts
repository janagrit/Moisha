import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  HostProperty,
  CompetitorListing,
  PropertyType,
  AMENITY_OPTIONS,
} from '../types';
import {
  US_ONLY_ERROR_MESSAGE,
  parseAirbnbListingUrl,
  checkOfflineUsAddressHeuristic,
} from '../services/usLocationService';
import {
  evaluateCompetitorMatch,
  partitionCompetitors,
  computeMarketOverview,
} from '../services/competitorMatcher';
import {
  createInitialMonitoringState,
  recordPriceCheck,
  loadMonitoringState,
  saveMonitoringState,
} from '../services/monitoringService';

const baseHost3BR: HostProperty = {
  id: 'host-1',
  airbnbUrl: 'https://www.airbnb.com/rooms/11111111',
  airbnbRoomId: '11111111',
  name: 'Austin 3BR Home',
  address: '1500 S Congress Ave, Austin, TX 78704',
  city: 'Austin',
  state: 'TX',
  zipCode: '78704',
  neighborhood: 'South Congress, TX',
  latitude: 30.248,
  longitude: -97.75,
  propertyType: 'entire_home',
  bedrooms: 3,
  bathrooms: 2,
  guestCapacity: 6,
  nightlyPrice: 280,
  photoUrl: null,
  amenities: ['wifi', 'kitchen', 'free_parking'],
  createdAt: '2026-11-22T12:00:00.000Z',
};

function makeComp(overrides: Partial<CompetitorListing>): CompetitorListing {
  return {
    id: overrides.id || 'comp-1',
    airbnbUrl: 'https://www.airbnb.com/rooms/22222222',
    airbnbRoomId: '22222222',
    name: 'Comparable Home',
    propertyType: 'entire_home',
    bedrooms: 3,
    bathrooms: 2,
    guestCapacity: 6,
    nightlyPrice: 250,
    previousPrice: null,
    photoUrl: null,
    locationNote: null,
    amenities: ['wifi', 'kitchen'],
    lastCheckedAt: '2026-11-22T12:00:00.000Z',
    priceHistory: [{ price: 250, recordedAt: '2026-11-22T12:00:00.000Z' }],
    ...overrides,
  };
}

describe('US location & Airbnb URL validation', () => {
  it('parses valid Airbnb room URLs and rejects non-Airbnb or unsafe URLs', () => {
    const parsed = parseAirbnbListingUrl('https://www.airbnb.com/rooms/98765432?adults=2');
    expect(parsed).toEqual({
      normalizedUrl: 'https://www.airbnb.com/rooms/98765432',
      roomId: '98765432',
    });
    expect(parseAirbnbListingUrl('https://example.com/rooms/123')).toBeNull();
    expect(parseAirbnbListingUrl('javascript:alert(1)')).toBeNull();
  });

  it('validates US ZIP codes and US states while rejecting non-US addresses', () => {
    expect(checkOfflineUsAddressHeuristic('78704').valid).toBe(true);
    expect(checkOfflineUsAddressHeuristic('1500 S Congress Ave, Austin, TX').valid).toBe(true);
    expect(checkOfflineUsAddressHeuristic('Austin, tx').valid).toBe(true);
    expect(checkOfflineUsAddressHeuristic('Toronto, ON M5V 2T6').valid).toBe(false);
    expect(checkOfflineUsAddressHeuristic('10 Downing St, London SW1A 2AA, UK').valid).toBe(false);
    expect(checkOfflineUsAddressHeuristic('Paris, France').valid).toBe(false);
    expect(checkOfflineUsAddressHeuristic('Villa in Bogota, Colombia').valid).toBe(false);
    expect(checkOfflineUsAddressHeuristic('Villa in Quito, Ecuador').valid).toBe(false);
    expect(US_ONLY_ERROR_MESSAGE).toBe(
      'Sorry, Moisha currently supports Airbnb properties located in the United States only. Please enter a valid US property address or ZIP code.',
    );
  });
});

describe('Strict competitor matching engine', () => {
  it('prioritizes 3BR entire homes, separates ±1BR as secondary, and excludes studios/private rooms', () => {
    const exactMatch = makeComp({
      id: 'c-exact',
      bedrooms: 3,
      propertyType: 'entire_home',
      amenities: ['wifi', 'kitchen', 'free_parking'],
    });
    const studio = makeComp({ id: 'c-studio', bedrooms: 0, propertyType: 'studio' });
    const privateRoom = makeComp({ id: 'c-private', bedrooms: 3, propertyType: 'private_room' });
    const twoBed = makeComp({ id: 'c-2br', bedrooms: 2, propertyType: 'entire_home' });
    const fiveBed = makeComp({ id: 'c-5br', bedrooms: 5, propertyType: 'entire_home' });

    const { primary, secondary, excluded } = partitionCompetitors(baseHost3BR, [
      exactMatch,
      studio,
      privateRoom,
      twoBed,
      fiveBed,
    ]);

    expect(primary.map((p) => p.listing.id)).toEqual(['c-exact']);
    expect(secondary.map((s) => s.listing.id)).toEqual(['c-2br']);
    expect(excluded.map((e) => e.listing.id).sort()).toEqual([
      'c-5br',
      'c-private',
      'c-studio',
    ]);
  });

  it('never mixes studios, private rooms, or mismatched bedroom counts into primary average (fast-check)', () => {
    const propTypeArb = fc.constantFrom<PropertyType>(
      'entire_home',
      'private_room',
      'shared_room',
      'studio',
    );
    const compArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      propertyType: propTypeArb,
      bedrooms: fc.integer({ min: 0, max: 8 }),
      nightlyPrice: fc.integer({ min: 50, max: 1200 }),
    });

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.array(compArb, { minLength: 0, maxLength: 12 }),
        (hostBeds, rawComps) => {
          const host: HostProperty = { ...baseHost3BR, bedrooms: hostBeds };
          const comps = rawComps.map((rc) =>
            makeComp({
              id: rc.id,
              name: rc.name,
              propertyType: rc.propertyType,
              bedrooms: rc.bedrooms,
              nightlyPrice: rc.nightlyPrice,
              amenities: [AMENITY_OPTIONS[0]],
            }),
          );

          const { primary } = partitionCompetitors(host, comps);
          for (const item of primary) {
            expect(item.listing.propertyType).toBe('entire_home');
            expect(item.listing.bedrooms).toBe(hostBeds);
            expect(evaluateCompetitorMatch(host, item.listing).tier).toBe('primary');
          }

          const overview = computeMarketOverview(host, primary, [], null, 0);
          expect(overview.comparableCount).toBe(primary.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Price change tracking & storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records observed competitor price drops and increases with timestamps and history', () => {
    const c1 = makeComp({ id: 'c1', name: 'Oak St 3BR', nightlyPrice: 260 });
    const c2 = makeComp({ id: 'c2', name: 'Elm St 3BR', nightlyPrice: 240 });
    const initial = {
      ...createInitialMonitoringState(),
      property: baseHost3BR,
      competitors: [c1, c2],
      lastCheckedAt: '2026-11-21T09:00:00.000Z',
    };

    const { nextState, detectedChanges } = recordPriceCheck(
      initial,
      { c1: 225, c2: 240 },
      '2026-11-22T09:00:00.000Z',
    );

    expect(detectedChanges).toHaveLength(1);
    expect(detectedChanges[0].previousPrice).toBe(260);
    expect(detectedChanges[0].newPrice).toBe(225);
    expect(detectedChanges[0].percentChange).toBe(-13.5);
    expect(nextState.competitors[0].nightlyPrice).toBe(225);
    expect(nextState.competitors[0].previousPrice).toBe(260);
    expect(nextState.lastCheckChangesCount).toBe(1);

    saveMonitoringState(nextState);
    const reloaded = loadMonitoringState();
    expect(reloaded.priceChanges).toHaveLength(1);
    expect(reloaded.competitors[0].nightlyPrice).toBe(225);
  });
});
