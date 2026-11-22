import {
  MonitoringState,
  CompetitorListing,
  PropertyType,
  PriceChangeEvent,
} from '../types';
import { recordPriceCheck } from './monitoringService';

export function createPrototypeMonitoringState(): MonitoringState {
  const now = new Date();
  const checkedTodayIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const checkedYesterdayIso = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();
  const twoDaysAgoIso = new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString();

  const competitors: CompetitorListing[] = [
    {
      id: 'proto-h-st-firepit',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      airbnbRoomId: null,
      name: 'Row home with a fire pit near H St',
      propertyType: 'entire_home',
      bedrooms: 3,
      bathrooms: 2.5,
      guestCapacity: 8,
      nightlyPrice: 183,
      previousPrice: 220,
      photoUrl:
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=480&q=80',
      locationNote: '0.2 mi · Near H St NE',
      amenities: ['wifi', 'kitchen', 'patio', 'washer_dryer'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [
        { price: 220, recordedAt: twoDaysAgoIso },
        { price: 183, recordedAt: checkedTodayIso },
      ],
    },
    {
      id: 'proto-g-st-capitol',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      airbnbRoomId: null,
      name: 'G St NE Classic Capitol Rowhouse',
      propertyType: 'entire_home',
      bedrooms: 3,
      bathrooms: 2,
      guestCapacity: 6,
      nightlyPrice: 206,
      previousPrice: 225,
      photoUrl:
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=480&q=80',
      locationNote: '0.4 mi · G St NE',
      amenities: ['wifi', 'kitchen', 'workspace'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [
        { price: 225, recordedAt: twoDaysAgoIso },
        { price: 206, recordedAt: checkedTodayIso },
      ],
    },
    {
      id: 'proto-union-market-3br',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      airbnbRoomId: null,
      name: 'Union Market Modern 3BR Townhome',
      propertyType: 'entire_home',
      bedrooms: 3,
      bathrooms: 2.5,
      guestCapacity: 6,
      nightlyPrice: 229,
      previousPrice: null,
      photoUrl:
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=480&q=80',
      locationNote: '0.3 mi · Morse St NE',
      amenities: ['wifi', 'kitchen', 'free_parking', 'washer_dryer'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [{ price: 229, recordedAt: checkedYesterdayIso }],
    },
    {
      id: 'proto-atlas-3br',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      airbnbRoomId: null,
      name: 'Atlas District Renovated 3BR Home',
      propertyType: 'entire_home',
      bedrooms: 3,
      bathrooms: 3,
      guestCapacity: 7,
      nightlyPrice: 243,
      previousPrice: null,
      photoUrl:
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=480&q=80',
      locationNote: '0.4 mi · Maryland Ave NE',
      amenities: ['wifi', 'kitchen', 'patio', 'washer_dryer'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [{ price: 243, recordedAt: checkedYesterdayIso }],
    },
    {
      id: 'proto-15th-st-corner',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      airbnbRoomId: null,
      name: '15th St NE Corner Rowhouse w/ Patio',
      propertyType: 'entire_home',
      bedrooms: 3,
      bathrooms: 2.5,
      guestCapacity: 6,
      nightlyPrice: 247,
      previousPrice: 232,
      photoUrl:
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=480&q=80',
      locationNote: '0.3 mi · 15th & Benning NE',
      amenities: ['wifi', 'kitchen', 'free_parking', 'patio'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [
        { price: 232, recordedAt: twoDaysAgoIso },
        { price: 247, recordedAt: checkedTodayIso },
      ],
    },
    {
      id: 'proto-secondary-2br',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes',
      airbnbRoomId: null,
      name: 'Trinidad 2BR Brick Rowhome + Den',
      propertyType: 'entire_home',
      bedrooms: 2,
      bathrooms: 2,
      guestCapacity: 5,
      nightlyPrice: 192,
      previousPrice: null,
      photoUrl: null,
      locationNote: '0.2 mi · Penn St NE',
      amenities: ['wifi', 'kitchen'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [{ price: 192, recordedAt: checkedYesterdayIso }],
    },
    {
      id: 'proto-excluded-1br-union',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes',
      airbnbRoomId: null,
      name: 'Renovated garden-level near Union Market',
      propertyType: 'entire_home',
      bedrooms: 1,
      bathrooms: 1,
      guestCapacity: 2,
      nightlyPrice: 166,
      previousPrice: null,
      photoUrl: null,
      locationNote: '1BR basement unit on Airbnb map',
      amenities: ['wifi', 'kitchen'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [{ price: 166, recordedAt: checkedYesterdayIso }],
    },
    {
      id: 'proto-excluded-studio',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes',
      airbnbRoomId: null,
      name: 'Queen St NE Sunny Garden Studio',
      propertyType: 'studio',
      bedrooms: 0,
      bathrooms: 1,
      guestCapacity: 2,
      nightlyPrice: 138,
      previousPrice: null,
      photoUrl: null,
      locationNote: 'Studio on Airbnb map',
      amenities: ['wifi'],
      lastCheckedAt: checkedTodayIso,
      priceHistory: [{ price: 138, recordedAt: checkedYesterdayIso }],
    },
  ];

  const priceChanges: PriceChangeEvent[] = [
    {
      id: 'proto-chg-1',
      competitorId: 'proto-h-st-firepit',
      competitorName: 'Row home with a fire pit near H St',
      competitorPhotoUrl:
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=480&q=80',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      bedrooms: 3,
      propertyType: 'entire_home',
      previousPrice: 220,
      newPrice: 183,
      deltaAmount: -37,
      percentChange: -16.8,
      changedAt: checkedTodayIso,
    },
    {
      id: 'proto-chg-2',
      competitorId: 'proto-g-st-capitol',
      competitorName: 'G St NE Classic Capitol Rowhouse',
      competitorPhotoUrl:
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=480&q=80',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      bedrooms: 3,
      propertyType: 'entire_home',
      previousPrice: 225,
      newPrice: 206,
      deltaAmount: -19,
      percentChange: -8.4,
      changedAt: checkedTodayIso,
    },
    {
      id: 'proto-chg-3',
      competitorId: 'proto-15th-st-corner',
      competitorName: '15th St NE Corner Rowhouse w/ Patio',
      competitorPhotoUrl:
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=480&q=80',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      bedrooms: 3,
      propertyType: 'entire_home',
      previousPrice: 232,
      newPrice: 247,
      deltaAmount: 15,
      percentChange: 6.5,
      changedAt: checkedYesterdayIso,
    },
  ];

  return {
    isPrototype: true,
    property: {
      id: 'proto-host-dc-20002',
      airbnbUrl: 'https://www.airbnb.com/s/20002--Washington--DC/homes?min_bedrooms=3&max_bedrooms=3',
      airbnbRoomId: null,
      name: 'H St Corridor Brick Rowhouse',
      address: '1114 Florida Ave NE, Washington, DC 20002',
      city: 'Washington',
      state: 'DC',
      zipCode: '20002',
      neighborhood: 'H St / Near Northeast, DC',
      latitude: 38.9036,
      longitude: -76.9905,
      propertyType: 'entire_home',
      bedrooms: 3,
      bathrooms: 2.5,
      guestCapacity: 6,
      nightlyPrice: 245,
      photoUrl:
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=480&q=80',
      amenities: ['wifi', 'kitchen', 'washer_dryer', 'patio', 'workspace'],
      createdAt: twoDaysAgoIso,
    },
    competitors,
    priceChanges,
    lastCheckedAt: checkedTodayIso,
    previousCheckAt: checkedYesterdayIso,
    lastCheckChangesCount: 2,
    emailConfig: {
      email: 'host@example.com',
      enabled: true,
    },
  };
}

/**
 * Simulates a new daily monitoring check on the current competitor list so a user
 * exploring the prototype can see price detection, metric updates, and email alerts live.
 */
export function simulateDailyMonitoringRun(state: MonitoringState): {
  nextState: MonitoringState;
  detectedChanges: PriceChangeEvent[];
} {
  const primaryThreeBeds = state.competitors.filter(
    (c) =>
      state.property &&
      c.propertyType === state.property.propertyType &&
      c.bedrooms === state.property.bedrooms,
  );
  const targets = primaryThreeBeds.length > 0 ? primaryThreeBeds : state.competitors;
  if (targets.length === 0) {
    return { nextState: state, detectedChanges: [] };
  }

  const observed: Record<string, number> = {};
  // Pick 2 listings to shift realistically (one drop, one adjustment)
  const first = targets[Math.min(2, targets.length - 1)];
  const second = targets[0];

  const dropDelta = first.nightlyPrice > 195 ? -22 : 18;
  observed[first.id] = Math.max(95, first.nightlyPrice + dropDelta);

  if (second.id !== first.id) {
    const secondDelta = second.nightlyPrice < 190 ? 14 : -15;
    observed[second.id] = Math.max(95, second.nightlyPrice + secondDelta);
  }

  return recordPriceCheck(state, observed, new Date().toISOString());
}

export interface ParsedAirbnbCardCandidate {
  name: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number | null;
  nightlyPrice: number;
}

/**
 * Parses raw text copied directly from an Airbnb search results page.
 * Example snippet from Airbnb search cards:
 *   Home in Washington
 *   Row home with a fire pit near H St
 *   3 bedrooms · 4 queen beds · 2.5 baths
 *   Dec 1 – 2
 *   $183 for 1 night
 */
export function parsePastedAirbnbSearchText(rawText: string): ParsedAirbnbCardCandidate[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results: ParsedAirbnbCardCandidate[] = [];
  const priceLineRegex = /\$([\d,]+)\s*(?:for\s*(\d+)\s*nights?|\/\s*night|per\s*night|night|total)?/i;
  let lastPriceLineIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // Must contain a dollar amount and look like an Airbnb price line
    if (!/\$\d/.test(line)) continue;
    const priceMatch = line.match(priceLineRegex);
    if (!priceMatch) continue;

    const rawDollar = Number(priceMatch[1].replace(/,/g, ''));
    const nightsCount = priceMatch[2] ? Math.max(1, Number(priceMatch[2])) : 1;
    if (!Number.isFinite(rawDollar) || rawDollar < 25 || rawDollar > 25000) continue;

    const nightlyPrice = Math.round(rawDollar / nightsCount);

    // Look back up to 6 lines without crossing an earlier listing's price line
    const windowStart = Math.max(lastPriceLineIndex + 1, i - 6);
    const contextLines = lines.slice(windowStart, i);
    lastPriceLineIndex = i;

    let bedrooms: number | null = null;
    let bathrooms: number | null = null;
    let propertyType: PropertyType = 'entire_home';
    let name = '';

    for (const cl of contextLines) {
      if (/\bprivate room\b|\broom in\b/i.test(cl)) {
        propertyType = 'private_room';
      } else if (/\bshared room\b/i.test(cl)) {
        propertyType = 'shared_room';
      } else if (/\bstudio\b/i.test(cl)) {
        propertyType = 'studio';
        bedrooms = 0;
      }

      const bedMatch = cl.match(/(\d+)\s*bedrooms?/i) || cl.match(/(\d+)\s*br\b/i);
      if (bedMatch) {
        bedrooms = Number(bedMatch[1]);
      }

      const bathMatch = cl.match(/(\d+(?:\.\d+)?)\s*(?:shared\s+|private\s+)?baths?\b/i);
      if (bathMatch) {
        bathrooms = Number(bathMatch[1]);
      }
    }

    // Pick best descriptive name line (skipping ratings, badges, dates, and room count lines)
    for (const cl of contextLines) {
      if (/^(superhost|guest favorite|new|plus)$/i.test(cl)) continue;
      if (/^\d+\.\d+\s*\(\d+\)/.test(cl) || /★/.test(cl)) continue;
      if (/\b(bedrooms?|beds?|baths?|studio)\b/i.test(cl) && cl.includes('·')) continue;
      if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d/i.test(cl)) continue;
      if (/^(home|apartment|townhouse|condo|loft|guesthouse|villa|cabin|bungalow|place|room|unit)\s+in\s+/i.test(cl)) {
        if (!name) name = cl;
        continue;
      }
      name = cl;
      break;
    }

    if (bedrooms === null) {
      bedrooms = propertyType === 'studio' ? 0 : 1;
    }

    if (!name) {
      name =
        propertyType === 'studio'
          ? `Nearby Studio ($${nightlyPrice}/nt)`
          : `${bedrooms}-Bedroom Listing ($${nightlyPrice}/nt)`;
    }

    // Avoid duplicate consecutive matches from "$183 for 1 night" followed by "Show price breakdown"
    const isDuplicate = results.some(
      (r) => r.name === name && r.nightlyPrice === nightlyPrice && r.bedrooms === bedrooms,
    );
    if (!isDuplicate) {
      results.push({
        name,
        propertyType,
        bedrooms,
        bathrooms,
        nightlyPrice,
      });
    }
  }

  return results;
}
