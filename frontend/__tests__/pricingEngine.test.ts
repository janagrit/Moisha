import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { INITIAL_RULES } from '../constants';
import {
  evaluatePropertyPricing,
  getEffectiveFloorPrice,
  generateLocalChatReply,
  daysBetweenIso,
  computeQuantile,
} from '../services/pricingEngine';
import {
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
} from '../services/storageService';
import { buildPropertyFromAnyAddress } from '../services/addressService';
import { PropertyHouse, PricingRule, sanitizeExternalUrl } from '../types';

function makeUndercutFixture(): PropertyHouse {
  const base = buildPropertyFromAnyAddress({
    rawAddress: 'Test Property A',
    bedrooms: 3,
    currentPrice: 285,
    floorPrice: 195,
    unbookedNights: 5,
    baseDate: new Date('2026-11-21T12:00:00Z'),
  });
  return {
    ...base,
    comps: base.comps.map((c, idx) => ({
      ...c,
      currentPrice: idx === 0 ? 210 : idx === 1 ? 225 : 310,
      isBooked: idx === 2,
    })),
  };
}

function makeUpsideFixture(): PropertyHouse {
  const base = buildPropertyFromAnyAddress({
    rawAddress: 'Test Property B',
    bedrooms: 2,
    currentPrice: 220,
    floorPrice: 175,
    unbookedNights: 4,
    baseDate: new Date('2026-11-21T12:00:00Z'),
  });
  return {
    ...base,
    comps: base.comps.map((c, idx) => ({
      ...c,
      currentPrice: idx === 0 ? 275 : idx === 1 ? 295 : 320,
      isBooked: idx !== 0,
    })),
  };
}

describe('Moisha deterministic pricing engine', () => {
  const undercutHouse = makeUndercutFixture();
  const upsideHouse = makeUpsideFixture();

  it('flags neighbor undercutting and recommends competitive rate above floor', () => {
    const decision = evaluatePropertyPricing(undercutHouse, INITIAL_RULES, '08:00 AM');
    expect(decision.status).toBe('ALERT');
    expect(decision.direction).toBe('drop');
    expect(decision.recommendedPrice).toBeGreaterThanOrEqual(undercutHouse.floorPrice);
    expect(decision.recommendedPrice).toBeLessThan(undercutHouse.currentPrice);
    expect(decision.recommendedPromotions.length).toBeGreaterThan(0);
    expect(
      decision.projectedBookingProbability.atRecommendedPrice,
    ).toBeGreaterThan(decision.projectedBookingProbability.atCurrentPrice);
  });

  it('detects underpriced revenue upside when comps are higher', () => {
    const decision = evaluatePropertyPricing(upsideHouse, INITIAL_RULES, '08:00 AM');
    expect(decision.status).toBe('UPSIDE');
    expect(decision.direction).toBe('raise');
    expect(decision.recommendedPrice).toBeGreaterThan(upsideHouse.currentPrice);
    expect(decision.priceDelta).toBe(decision.recommendedPrice - upsideHouse.currentPrice);
    expect(decision.recommendedPromotions).toHaveLength(0);
  });

  it('returns OK and zero risk when property calendar window is booked', () => {
    const bookedHouse: PropertyHouse = { ...undercutHouse, isBooked: true };
    const decision = evaluatePropertyPricing(bookedHouse, INITIAL_RULES);
    expect(decision.status).toBe('OK');
    expect(decision.direction).toBe('hold');
    expect(decision.revenueProjection.atRiskGross).toBe(0);
    expect(decision.recommendedPromotions).toHaveLength(0);
  });

  it('enforces safety floor + cushion even when neighbors drop far below floor', () => {
    const extremeHouse: PropertyHouse = {
      ...undercutHouse,
      currentPrice: 240,
      floorPrice: 200,
      comps: undercutHouse.comps.map((c) => ({ ...c, currentPrice: 120, isBooked: false })),
    };
    const rulesWithCushion: PricingRule[] = INITIAL_RULES.map((r) =>
      r.kind === 'safety_floor' ? { ...r, enabled: true, parameterValue: 15 } : r,
    );

    const decision = evaluatePropertyPricing(extremeHouse, rulesWithCushion);
    expect(decision.effectiveFloorPrice).toBe(215);
    expect(decision.recommendedPrice).toBeGreaterThanOrEqual(215);
    for (const promo of decision.recommendedPromotions) {
      expect(promo.effectivePrice).toBeGreaterThanOrEqual(215);
    }
  });

  it('satisfies floor, delta, and probability invariants across arbitrary inputs (fast-check)', () => {
    const compArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      address: fc.string({ maxLength: 25 }),
      airbnbUrl: fc.constant('https://www.airbnb.com'),
      bedrooms: fc.integer({ min: 1, max: 6 }),
      bathrooms: fc.integer({ min: 1, max: 4 }),
      rating: fc.double({ min: 3.5, max: 5.0, noNaN: true }),
      reviewsCount: fc.integer({ min: 0, max: 500 }),
      currentPrice: fc.integer({ min: 70, max: 800 }),
      originalPrice: fc.integer({ min: 70, max: 800 }),
      isBooked: fc.boolean(),
      distanceMiles: fc.double({ min: 0.01, max: 2.0, noNaN: true }),
      superhost: fc.boolean(),
      isVerified: fc.boolean(),
      priceHistory: fc.constant([{ date: 'Today', price: 200 }] as { date: string; price: number }[]),
    });

    fc.assert(
      fc.property(
        fc.integer({ min: 80, max: 600 }),
        fc.integer({ min: 60, max: 400 }),
        fc.integer({ min: 0, max: 14 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 50 }),
        fc.array(compArb, { minLength: 0, maxLength: 8 }),
        (currentPrice, floorPrice, unbookedDaysCount, isBooked, floorCushion, comps) => {
          const house: PropertyHouse = {
            ...undercutHouse,
            currentPrice,
            floorPrice,
            unbookedDaysCount,
            isBooked,
            comps,
          };
          const rules = INITIAL_RULES.map((r) =>
            r.kind === 'safety_floor' ? { ...r, enabled: true, parameterValue: floorCushion } : r,
          );

          const expectedFloor = getEffectiveFloorPrice(house, rules);
          const decision = evaluatePropertyPricing(house, rules);

          expect(decision.effectiveFloorPrice).toBe(expectedFloor);
          expect(decision.recommendedPrice).toBeGreaterThanOrEqual(expectedFloor);
          expect(decision.priceDelta).toBe(decision.recommendedPrice - house.currentPrice);
          expect(decision.projectedBookingProbability.atCurrentPrice).toBeGreaterThanOrEqual(8);
          expect(decision.projectedBookingProbability.atCurrentPrice).toBeLessThanOrEqual(100);
          expect(decision.projectedBookingProbability.atRecommendedPrice).toBeGreaterThanOrEqual(8);
          expect(decision.projectedBookingProbability.atRecommendedPrice).toBeLessThanOrEqual(100);

          for (const promo of decision.recommendedPromotions) {
            expect(promo.effectivePrice).toBeGreaterThanOrEqual(expectedFloor);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('generates contextual local chat replies for promos and margins', () => {
    const decision = evaluatePropertyPricing(undercutHouse, INITIAL_RULES);
    const promoReply = generateLocalChatReply(undercutHouse, 'Should I run a promo badge?', decision);
    expect(promoReply.text).toContain(undercutHouse.nickname);
    expect(promoReply.action?.type).toBe('run_promo');

    const profitReply = generateLocalChatReply(undercutHouse, 'What is my net profit after cleaning?', decision);
    expect(profitReply.text).toContain('cleaning');
  });

  it('computes ISO date gaps, sanitizes URLs, and clamps quantile bounds safely', () => {
    expect(daysBetweenIso('2026-11-21', '2026-11-26')).toBe(5);
    expect(daysBetweenIso('2026-11-26', '2026-11-21')).toBe(0);
    expect(daysBetweenIso('invalid', '2026-11-26')).toBe(0);
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBe('https://www.airbnb.com');
    expect(sanitizeExternalUrl('data:text/html,hi')).toBe('https://www.airbnb.com');
    expect(computeQuantile([200, 250, 300], -1)).toBe(200);
    expect(computeQuantile([200, 250, 300], 5)).toBe(300);
  });
});

describe('Portfolio localStorage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty with zero default addresses, saves user properties, and recovers from bad JSON', () => {
    const initial = loadPersistedState();
    expect(initial.houses).toHaveLength(0);
    expect(initial.selectedHouseId).toBe('');

    const custom = buildPropertyFromAnyAddress({
      rawAddress: '100 Main St',
      bedrooms: 2,
      currentPrice: 250,
      floorPrice: 180,
      unbookedNights: 3,
    });
    savePersistedState({
      ...initial,
      houses: [custom],
      selectedHouseId: custom.id,
    });

    const reloaded = loadPersistedState();
    expect(reloaded.houses).toHaveLength(1);
    expect(reloaded.houses[0].address).toBe('100 Main St');

    window.localStorage.setItem('moisha_pocket_state_v4', '{not-valid-json');
    const recovered = loadPersistedState();
    expect(recovered.houses).toHaveLength(0);

    const reset = clearPersistedState();
    expect(reset.houses).toHaveLength(0);
  });
});
