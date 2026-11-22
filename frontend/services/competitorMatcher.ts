import {
  HostProperty,
  CompetitorListing,
  EvaluatedCompetitor,
  MarketOverviewStats,
  PriceChangeEvent,
  PROPERTY_TYPE_LABELS,
} from '../types';

/**
 * Evaluates whether a candidate Airbnb listing is genuinely comparable to the host's property.
 *
 * Rules:
 * - Studios, private rooms, and shared rooms are NEVER mixed into an entire-home comparison (and vice versa).
 * - Primary matches must match propertyType AND exact bedroom count.
 * - Secondary matches share propertyType === 'entire_home' and are within ±1 bedroom (excluding 0BR studios).
 * - Location, guest capacity, bathrooms, and shared amenities refine the match score within each tier.
 */
export function evaluateCompetitorMatch(
  myProperty: HostProperty,
  competitor: CompetitorListing,
): EvaluatedCompetitor {
  const priceDiffFromMine =
    myProperty.nightlyPrice !== null
      ? competitor.nightlyPrice - myProperty.nightlyPrice
      : null;
  const percentDiffFromMine =
    myProperty.nightlyPrice !== null && myProperty.nightlyPrice > 0
      ? Number((((competitor.nightlyPrice - myProperty.nightlyPrice) / myProperty.nightlyPrice) * 100).toFixed(1))
      : null;

  // 1. Property type isolation: never mix studios/private rooms/shared rooms with entire homes
  if (myProperty.propertyType === 'entire_home' && competitor.propertyType !== 'entire_home') {
    return {
      listing: competitor,
      tier: 'excluded',
      matchScore: 0,
      matchReason: `Excluded: ${PROPERTY_TYPE_LABELS[competitor.propertyType]} (your listing is an entire home)`,
      priceDiffFromMine,
      percentDiffFromMine,
    };
  }

  if (myProperty.propertyType !== 'entire_home' && competitor.propertyType !== myProperty.propertyType) {
    return {
      listing: competitor,
      tier: 'excluded',
      matchScore: 0,
      matchReason: `Excluded: ${PROPERTY_TYPE_LABELS[competitor.propertyType]} does not match ${PROPERTY_TYPE_LABELS[myProperty.propertyType]}`,
      priceDiffFromMine,
      percentDiffFromMine,
    };
  }

  // If my property has >=1 bedroom entire home, 0-bedroom listings are studios and excluded
  if (myProperty.bedrooms > 0 && competitor.bedrooms === 0) {
    return {
      listing: competitor,
      tier: 'excluded',
      matchScore: 0,
      matchReason: 'Excluded: Studio / 0 bedrooms',
      priceDiffFromMine,
      percentDiffFromMine,
    };
  }

  const bedroomGap = Math.abs(competitor.bedrooms - myProperty.bedrooms);
  if (bedroomGap >= 2) {
    return {
      listing: competitor,
      tier: 'excluded',
      matchScore: 0,
      matchReason: `Excluded: ${competitor.bedrooms} bedrooms vs. your ${myProperty.bedrooms} bedrooms`,
      priceDiffFromMine,
      percentDiffFromMine,
    };
  }

  // Compute secondary similarity signals (bathrooms, guest capacity, shared amenities)
  let score = bedroomGap === 0 ? 75 : 45;
  const notes: string[] = [
    bedroomGap === 0
      ? `${competitor.bedrooms}-bed ${PROPERTY_TYPE_LABELS[competitor.propertyType].toLowerCase()}`
      : `${competitor.bedrooms}-bed (±1 bedroom)`,
  ];

  if (myProperty.bathrooms !== null && competitor.bathrooms !== null) {
    const bathDiff = Math.abs(competitor.bathrooms - myProperty.bathrooms);
    if (bathDiff <= 0.5) {
      score += 10;
    } else if (bathDiff <= 1) {
      score += 5;
    }
  }

  if (myProperty.guestCapacity !== null && competitor.guestCapacity !== null) {
    const guestDiff = Math.abs(competitor.guestCapacity - myProperty.guestCapacity);
    if (guestDiff <= 2) {
      score += 8;
      notes.push('similar capacity');
    }
  }

  if (myProperty.amenities.length > 0 && competitor.amenities.length > 0) {
    const mySet = new Set(myProperty.amenities);
    const sharedCount = competitor.amenities.filter((a) => mySet.has(a)).length;
    if (sharedCount > 0) {
      score += Math.min(12, sharedCount * 4);
      notes.push(`${sharedCount} shared ${sharedCount === 1 ? 'amenity' : 'amenities'}`);
    }
  }

  return {
    listing: competitor,
    tier: bedroomGap === 0 ? 'primary' : 'secondary',
    matchScore: Math.min(100, score),
    matchReason: notes.join(' · '),
    priceDiffFromMine,
    percentDiffFromMine,
  };
}

export function partitionCompetitors(
  myProperty: HostProperty,
  competitors: CompetitorListing[],
): {
  primary: EvaluatedCompetitor[];
  secondary: EvaluatedCompetitor[];
  excluded: EvaluatedCompetitor[];
} {
  const primary: EvaluatedCompetitor[] = [];
  const secondary: EvaluatedCompetitor[] = [];
  const excluded: EvaluatedCompetitor[] = [];

  for (const comp of competitors) {
    const evaluated = evaluateCompetitorMatch(myProperty, comp);
    if (evaluated.tier === 'primary') {
      primary.push(evaluated);
    } else if (evaluated.tier === 'secondary') {
      secondary.push(evaluated);
    } else {
      excluded.push(evaluated);
    }
  }

  primary.sort((a, b) => b.matchScore - a.matchScore);
  secondary.sort((a, b) => b.matchScore - a.matchScore);

  return { primary, secondary, excluded };
}

export function computeMarketOverview(
  myProperty: HostProperty,
  primaryMatches: EvaluatedCompetitor[],
  priceChanges: PriceChangeEvent[],
  previousCheckAt: string | null,
  lastCheckChangesCount: number,
): MarketOverviewStats {
  const comparableCount = primaryMatches.length;

  // Count changes from primary comparable competitors since previous check
  const primaryIds = new Set(primaryMatches.map((m) => m.listing.id));
  const recentPrimaryChanges = previousCheckAt
    ? priceChanges.filter(
        (ev) => primaryIds.has(ev.competitorId) && ev.changedAt > previousCheckAt,
      ).length
    : lastCheckChangesCount;

  if (comparableCount === 0) {
    return {
      comparableCount: 0,
      competitorAveragePrice: null,
      myPriceVsAverageDollar: null,
      myPriceVsAveragePercent: null,
      cheapestComparable: null,
      mostExpensiveComparable: null,
      changesSinceLastCheck: recentPrimaryChanges,
      actionState: 'incomplete',
      actionSummary: `Add ${myProperty.bedrooms}-bedroom entire-home competitors nearby to benchmark your price.`,
    };
  }

  const listings = primaryMatches.map((m) => m.listing);
  const sum = listings.reduce((acc, item) => acc + item.nightlyPrice, 0);
  const competitorAveragePrice = Math.round(sum / listings.length);

  const cheapestComparable = listings.reduce(
    (min, item) => (item.nightlyPrice < min.nightlyPrice ? item : min),
    listings[0],
  );
  const mostExpensiveComparable = listings.reduce(
    (max, item) => (item.nightlyPrice > max.nightlyPrice ? item : max),
    listings[0],
  );

  if (myProperty.nightlyPrice === null) {
    return {
      comparableCount,
      competitorAveragePrice,
      myPriceVsAverageDollar: null,
      myPriceVsAveragePercent: null,
      cheapestComparable,
      mostExpensiveComparable,
      changesSinceLastCheck: recentPrimaryChanges,
      actionState: 'incomplete',
      actionSummary: `Competitor average is $${competitorAveragePrice}/night. Add your current nightly price to compare.`,
    };
  }

  const myPriceVsAverageDollar = myProperty.nightlyPrice - competitorAveragePrice;
  const myPriceVsAveragePercent =
    competitorAveragePrice > 0
      ? Number(((myPriceVsAverageDollar / competitorAveragePrice) * 100).toFixed(1))
      : 0;

  let actionState: MarketOverviewStats['actionState'] = 'aligned';
  let actionSummary = `Your $${myProperty.nightlyPrice}/night rate is in line with the $${competitorAveragePrice}/night neighborhood average.`;

  if (myPriceVsAveragePercent > 12) {
    actionState = 'needs_attention';
    actionSummary = `Your property is priced $${myPriceVsAverageDollar}/night (+${myPriceVsAveragePercent}%) above comparable ${myProperty.bedrooms}-bedroom listings ($${competitorAveragePrice} avg). Review recent competitor drops.`;
  } else if (myPriceVsAveragePercent < -12) {
    actionState = 'opportunity';
    actionSummary = `Your property is priced $${Math.abs(myPriceVsAverageDollar)}/night (${Math.abs(myPriceVsAveragePercent)}%) below comparable ${myProperty.bedrooms}-bedroom listings ($${competitorAveragePrice} avg). You may have room to raise your rate.`;
  }

  return {
    comparableCount,
    competitorAveragePrice,
    myPriceVsAverageDollar,
    myPriceVsAveragePercent,
    cheapestComparable,
    mostExpensiveComparable,
    changesSinceLastCheck: recentPrimaryChanges,
    actionState,
    actionSummary,
  };
}
