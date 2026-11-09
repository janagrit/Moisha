/**
 * The formulas Moisha used before the redesign, moved out of the UI unchanged.
 * Each one is locked by a test using the original app's own inputs.
 */

export interface PricedComp {
  priceUsd: number;
  isBooked: boolean;
}

export function vacantComps<T extends PricedComp>(comps: T[]): T[] {
  return comps.filter((c) => !c.isBooked);
}

/** Cheapest open neighbor. Falls back to the first comp when nothing is open. */
export function cheapestNeighbor<T extends PricedComp>(comps: T[]): T | undefined {
  const vacant = vacantComps(comps);
  return vacant.reduce<T | undefined>((min, c) => (min === undefined || c.priceUsd < min.priceUsd ? c : min), vacant[0] ?? comps[0]);
}

/** max(minimum, cheapest open neighbor). Uses the current price if there are no comps. */
export function matchCheapestPrice(floorUsd: number, comps: PricedComp[], currentUsd: number): number {
  const cheapest = cheapestNeighbor(comps);
  return Math.max(floorUsd, cheapest ? cheapest.priceUsd : currentUsd);
}

export function averageVacantPrice(comps: PricedComp[], currentUsd: number): number {
  const vacant = vacantComps(comps);
  if (vacant.length === 0) return currentUsd;
  return Math.round(vacant.reduce((sum, c) => sum + c.priceUsd, 0) / vacant.length);
}

export function undercuttingCount(comps: PricedComp[], currentUsd: number): number {
  return vacantComps(comps).filter((c) => c.priceUsd < currentUsd).length;
}

export function priceDelta(targetUsd: number, currentUsd: number): number {
  return targetUsd - currentUsd;
}

/** Discounted price, never under the minimum. */
export function promotionPrice(floorUsd: number, currentUsd: number, discountPercent: number): number {
  return Math.max(floorUsd, Math.round(currentUsd * (1 - discountPercent / 100)));
}

export function promotionSavingsPerNight(currentUsd: number, effectiveUsd: number): number {
  return currentUsd - effectiveUsd;
}

export function promotionWindowRevenue(effectiveUsd: number, nights: number): number {
  return effectiveUsd * nights;
}

/** The most those empty nights could earn at today's price. Not a forecast. */
export function vacancyValueAtRisk(currentUsd: number, emptyNights: number): number {
  return currentUsd * emptyNights;
}

/** Positive when the neighbor is more expensive than you. */
export function compDeltaVsMine(compUsd: number, myUsd: number): number {
  return compUsd - myUsd;
}
