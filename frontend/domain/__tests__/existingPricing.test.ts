import { describe, expect, it } from 'vitest';
import {
  averageVacantPrice,
  cheapestNeighbor,
  compDeltaVsMine,
  matchCheapestPrice,
  priceDelta,
  promotionPrice,
  promotionSavingsPerNight,
  promotionWindowRevenue,
  undercuttingCount,
  vacancyValueAtRisk,
} from '../existingPricing';

// Inputs are the original app's own sample houses, used here only as test inputs.
const HOUSE_1 = {
  current: 285,
  floor: 195,
  comps: [
    { priceUsd: 215, isBooked: false },
    { priceUsd: 225, isBooked: false },
    { priceUsd: 310, isBooked: true },
    { priceUsd: 210, isBooked: false },
  ],
};
const HOUSE_2 = {
  current: 265,
  floor: 180,
  comps: [
    { priceUsd: 215, isBooked: false },
    { priceUsd: 230, isBooked: false },
    { priceUsd: 280, isBooked: true },
  ],
};

describe('formulas carried over from the original app', () => {
  it('recommends max(minimum, cheapest vacant neighbor)', () => {
    expect(matchCheapestPrice(HOUSE_1.floor, HOUSE_1.comps, HOUSE_1.current)).toBe(210);
    expect(matchCheapestPrice(HOUSE_2.floor, HOUSE_2.comps, HOUSE_2.current)).toBe(215);
  });

  it('holds at the minimum when the neighbor is cheaper than it', () => {
    expect(matchCheapestPrice(250, HOUSE_1.comps, HOUSE_1.current)).toBe(250);
  });

  it('ignores booked neighbors when finding the cheapest', () => {
    const comps = [{ priceUsd: 100, isBooked: true }, { priceUsd: 200, isBooked: false }];
    expect(cheapestNeighbor(comps)?.priceUsd).toBe(200);
  });

  it('falls back to the first comp when every neighbor is booked', () => {
    const comps = [{ priceUsd: 300, isBooked: true }, { priceUsd: 250, isBooked: true }];
    expect(cheapestNeighbor(comps)?.priceUsd).toBe(300);
  });

  it('uses the current price when there are no comps at all', () => {
    expect(matchCheapestPrice(195, [], 285)).toBe(285);
  });

  it('averages only vacant neighbors, rounded', () => {
    expect(averageVacantPrice(HOUSE_1.comps, HOUSE_1.current)).toBe(217);
    expect(averageVacantPrice(HOUSE_2.comps, HOUSE_2.current)).toBe(223);
  });

  it('returns the current price as the average when nothing is vacant', () => {
    expect(averageVacantPrice([{ priceUsd: 300, isBooked: true }], 285)).toBe(285);
  });

  it('counts vacant neighbors priced under you', () => {
    expect(undercuttingCount(HOUSE_1.comps, HOUSE_1.current)).toBe(3);
    expect(undercuttingCount(HOUSE_1.comps, 212)).toBe(1);
  });

  it('computes the promotion price, respecting the minimum', () => {
    expect(promotionPrice(HOUSE_1.floor, HOUSE_1.current, 15)).toBe(242);
    expect(promotionPrice(HOUSE_2.floor, HOUSE_2.current, 15)).toBe(225);
    expect(promotionPrice(260, 285, 15)).toBe(260);
  });

  it('computes promotion savings and window revenue', () => {
    expect(promotionSavingsPerNight(285, 242)).toBe(43);
    expect(promotionWindowRevenue(242, 5)).toBe(1210);
  });

  it('computes vacancy value, price delta and comp delta', () => {
    expect(vacancyValueAtRisk(285, 5)).toBe(1425);
    expect(priceDelta(215, 285)).toBe(-70);
    expect(compDeltaVsMine(215, 285)).toBe(-70);
  });
});
