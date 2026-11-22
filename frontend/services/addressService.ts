import { PropertyHouse } from '../types';
import { addDaysIso } from '../constants';

interface BuildFromAddressParams {
  rawAddress: string;
  bedrooms: number;
  currentPrice: number;
  floorPrice: number;
  unbookedNights: number;
  baseDate?: Date;
}

const HIGH_DEMAND_MARKETS = [
  'miami',
  'new york',
  'nyc',
  'manhattan',
  'brooklyn',
  'san francisco',
  'los angeles',
  'santa monica',
  'malibu',
  'san diego',
  'boston',
  'honolulu',
  'maui',
  'aspen',
  'scottsdale',
  'nashville',
  'london',
  'paris',
];

const MID_HIGH_MARKETS = [
  'austin',
  'washington',
  'seattle',
  'chicago',
  'denver',
  'charleston',
  'savannah',
  'new orleans',
  'orlando',
  'tampa',
  'portland',
  'atlanta',
  'dallas',
  'toronto',
];

export function parseFreeformAddress(raw: string): {
  nickname: string;
  street: string;
  neighborhood: string;
  zipCode: string;
} {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zipCode = zipMatch ? zipMatch[1] : 'Local';

  const parts = cleaned
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const street = parts[0] || cleaned || 'My Rental';
  const cityPart = parts[1] || (parts.length === 1 ? cleaned : 'Local Submarket');
  const regionPart = parts[2] ? parts[2].replace(/\b\d{5}(?:-\d{4})?\b/, '').trim() : '';

  const neighborhood = regionPart ? `${cityPart}, ${regionPart}` : cityPart;
  const nickname = street.length > 28 ? `${street.slice(0, 26)}…` : street;

  return {
    nickname,
    street: cleaned,
    neighborhood,
    zipCode,
  };
}

function estimateMarketBasePerBedroom(addressLower: string, bedrooms: number): number {
  const safeBeds = Math.max(1, bedrooms);
  let baseOneBed = 145;

  if (HIGH_DEMAND_MARKETS.some((m) => addressLower.includes(m))) {
    baseOneBed = 210;
  } else if (MID_HIGH_MARKETS.some((m) => addressLower.includes(m))) {
    baseOneBed = 175;
  }

  return Math.round(baseOneBed + (safeBeds - 1) * 55);
}

export function buildPropertyFromAnyAddress({
  rawAddress,
  bedrooms,
  currentPrice,
  floorPrice,
  unbookedNights,
  baseDate = new Date(),
}: BuildFromAddressParams): PropertyHouse {
  const parsed = parseFreeformAddress(rawAddress);
  const safeBeds = Math.max(0, Math.round(bedrooms));
  const baths = Math.max(1, safeBeds >= 3 ? 2 : 1.5);
  const safePrice = Math.max(40, Math.round(currentPrice));
  const safeFloor = Math.max(35, Math.min(safePrice, Math.round(floorPrice)));
  const safeNights = Math.max(1, Math.min(30, Math.round(unbookedNights)));

  const estimatedMarketMedian = estimateMarketBasePerBedroom(rawAddress.toLowerCase(), safeBeds);
  // Blend market estimate with user's price tier so luxury/budget properties get plausible comps
  const anchor = Math.round(estimatedMarketMedian * 0.6 + safePrice * 0.4);
  const compLow = Math.max(55, Math.round(anchor * 0.88));
  const compMid = Math.max(60, anchor);
  const compHigh = Math.max(70, Math.round(anchor * 1.14));

  const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(rawAddress.trim())}/homes`;
  const id = `house-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const startDate = addDaysIso(baseDate, 2);
  const endDate = addDaysIso(baseDate, 2 + safeNights);
  const cleanFee = Math.round(75 + Math.max(1, safeBeds) * 25);

  return {
    id,
    nickname: parsed.nickname,
    title: `${safeBeds || 1}BR Short-Term Rental · ${parsed.neighborhood}`,
    address: parsed.street,
    neighborhood: parsed.neighborhood,
    zipCode: parsed.zipCode,
    bedrooms: safeBeds,
    bathrooms: baths,
    currentPrice: safePrice,
    floorPrice: safeFloor,
    cleaningFee: cleanFee,
    cleaningCost: Math.round(cleanFee * 0.88),
    nightlyFixedCost: Math.round(safeFloor * 0.65),
    hostServiceFeePercent: 3,
    unbookedDaysCount: safeNights,
    unbookedStartDate: startDate,
    unbookedEndDate: endDate,
    isBooked: false,
    propertyManagerName: 'Host',
    managerPhone: 'Team Alert',
    activePromotion: null,
    comps: [
      {
        id: `comp-${id}-1`,
        name: `Nearby ${safeBeds || 1}BR Comp (Lower Range)`,
        address: `0.1 mi from ${parsed.nickname}`,
        airbnbUrl: searchUrl,
        bedrooms: safeBeds,
        bathrooms: baths,
        rating: 4.89,
        reviewsCount: 74,
        currentPrice: compLow,
        originalPrice: compMid,
        isBooked: false,
        distanceMiles: 0.1,
        superhost: true,
        priceHistory: [{ date: 'Today', price: compLow }],
      },
      {
        id: `comp-${id}-2`,
        name: `Similar ${safeBeds || 1}BR Listing (Submarket Avg)`,
        address: `0.2 mi · ${parsed.neighborhood}`,
        airbnbUrl: searchUrl,
        bedrooms: safeBeds,
        bathrooms: baths,
        rating: 4.92,
        reviewsCount: 112,
        currentPrice: compMid,
        originalPrice: compMid,
        isBooked: false,
        distanceMiles: 0.2,
        superhost: false,
        priceHistory: [{ date: 'Today', price: compMid }],
      },
      {
        id: `comp-${id}-3`,
        name: `Top-Rated ${safeBeds || 1}BR Superhost`,
        address: `0.3 mi · ${parsed.neighborhood}`,
        airbnbUrl: searchUrl,
        bedrooms: safeBeds,
        bathrooms: baths,
        rating: 4.97,
        reviewsCount: 196,
        currentPrice: compHigh,
        originalPrice: compHigh,
        isBooked: true,
        distanceMiles: 0.3,
        superhost: true,
        priceHistory: [{ date: 'Today', price: compHigh }],
      },
    ],
  };
}
