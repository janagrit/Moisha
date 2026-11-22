import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createInitialHouses, INITIAL_RULES } from '../constants';
import {
  evaluatePropertyPricing,
  getEffectiveFloorPrice,
  generateLocalChatReply,
  daysBetweenIso,
} from '../services/pricingEngine';
import {
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
} from '../services/storageService';
import { PropertyHouse, PricingRule } from '../types';

describe('Moisha deterministic pricing engine', () => {
  const houses = createInitialHouses(new Date('2026-11-21T12:00:00Z'));

  it('flags neighbor undercutting on House 1 and recommends competitive rate above floor', () => {
    const decision = evaluatePropertyPricing(houses[0], INITIAL_RULES, '08:00 AM');
    expect(decision.status).toBe('ALERT');
    expect(decision.direction).toBe('drop');
    expect(decision.recommendedPrice).toBeGreaterThanOrEqual(houses[0].floorPrice);
    expect(decision.recommendedPrice).toBeLessThan(houses[0].currentPrice);
    expect(decision.recommendedPromotions.length).toBeGreaterThan(0);
    expect(
      decision.projectedBookingProbability.atRecommendedPrice,
    ).toBeGreaterThan(decision.projectedBookingProbability.atCurrentPrice);
  });

  it('detects underpriced revenue upside on House 3 (Dupont Circle)', () => {
    const decision = evaluatePropertyPricing(houses[2], INITIAL_RULES, '08:00 AM');
    expect(decision.status).toBe('UPSIDE');
    expect(decision.direction).toBe('raise');
    expect(decision.recommendedPrice).toBeGreaterThan(houses[2].currentPrice);
    expect(decision.priceDelta).toBe(decision.recommendedPrice - houses[2].currentPrice);
    expect(decision.recommendedPromotions).toHaveLength(0);
  });

  it('returns OK and zero risk when property calendar window is booked', () => {
    const bookedHouse: PropertyHouse = { ...houses[0], isBooked: true };
    const decision = evaluatePropertyPricing(bookedHouse, INITIAL_RULES);
    expect(decision.status).toBe('OK');
    expect(decision.direction).toBe('hold');
    expect(decision.revenueProjection.atRiskGross).toBe(0);
    expect(decision.recommendedPromotions).toHaveLength(0);
  });

  it('enforces safety floor + cushion even when neighbors drop far below floor', () => {
    const extremeHouse: PropertyHouse = {
      ...houses[0],
      currentPrice: 240,
      floorPrice: 200,
      comps: houses[0].comps.map((c) => ({ ...c, currentPrice: 120, isBooked: false })),
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
            ...houses[0],
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

  it('generates contextual local chat replies for promos, margins, and comps', () => {
    const decision = evaluatePropertyPricing(houses[0], INITIAL_RULES);
    const promoReply = generateLocalChatReply(houses[0], 'Should I run a promo badge?', decision);
    expect(promoReply.text).toContain(houses[0].nickname);
    expect(promoReply.action?.type).toBe('run_promo');

    const profitReply = generateLocalChatReply(houses[0], 'What is my net profit after cleaning?', decision);
    expect(profitReply.text).toContain('cleaning');
  });

  it('computes ISO date gaps safely', () => {
    expect(daysBetweenIso('2026-11-21', '2026-11-26')).toBe(5);
    expect(daysBetweenIso('2026-11-26', '2026-11-21')).toBe(0);
    expect(daysBetweenIso('invalid', '2026-11-26')).toBe(0);
  });
});

describe('Portfolio localStorage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves, reloads, and gracefully recovers from corrupted storage', () => {
    const initial = loadPersistedState();
    expect(initial.houses.length).toBeGreaterThanOrEqual(3);

    const modifiedHouses = initial.houses.map((h, i) =>
      i === 0 ? { ...h, currentPrice: 233 } : h,
    );
    savePersistedState({
      ...initial,
      houses: modifiedHouses,
      selectedHouseId: initial.houses[1].id,
    });

    const reloaded = loadPersistedState();
    expect(reloaded.houses[0].currentPrice).toBe(233);
    expect(reloaded.selectedHouseId).toBe(initial.houses[1].id);

    window.localStorage.setItem('moisha_pocket_state_v1', '{not-valid-json');
    const recovered = loadPersistedState();
    expect(recovered.houses.length).toBeGreaterThanOrEqual(3);

    const reset = clearPersistedState();
    expect(reset.houses[0].currentPrice).toBe(285);
  });
});
