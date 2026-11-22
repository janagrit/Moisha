import { PropertyHouse } from '../types';
import { addDaysIso } from '../constants';

export interface GeocodedLocation {
  formattedAddress: string;
  nickname: string;
  neighborhood: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

interface BuildFromAddressParams {
  rawAddress: string;
  bedrooms: number;
  currentPrice: number;
  floorPrice: number;
  unbookedNights: number;
  geocoded?: GeocodedLocation | null;
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
  'district of columbia',
  '20001',
  '20002',
  '20003',
  '20009',
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
  const nickname = street.length > 30 ? `${street.slice(0, 28)}…` : street;

  return {
    nickname,
    street: cleaned,
    neighborhood,
    zipCode,
  };
}

interface NominatimHit {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

export async function geocodeAddressWithNominatim(
  rawAddress: string,
): Promise<GeocodedLocation | null> {
  const q = rawAddress.trim();
  if (!q) return null;

  try {
    const signal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(4_000)
        : undefined;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimHit[];
    const top = Array.isArray(data) ? data[0] : undefined;
    if (!top) return null;

    const lat = Number(top.lat);
    const lon = Number(top.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const addr = top.address || {};
    const streetLine =
      addr.house_number && addr.road
        ? `${addr.house_number} ${addr.road}`
        : addr.road || parseFreeformAddress(q).nickname;
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const subarea = addr.neighbourhood || addr.suburb || '';
    const state = addr.state || '';
    const zipCode = addr.postcode || parseFreeformAddress(q).zipCode;

    const neighborhoodParts = [subarea, city, state].filter(Boolean);
    const neighborhood =
      neighborhoodParts.length > 0 ? neighborhoodParts.slice(0, 2).join(', ') : q;
    const formattedParts = [streetLine, city, state, zipCode].filter(Boolean);

    return {
      formattedAddress: formattedParts.join(', ') || top.display_name || q,
      nickname: streetLine.length > 30 ? `${streetLine.slice(0, 28)}…` : streetLine,
      neighborhood,
      zipCode,
      latitude: lat,
      longitude: lon,
    };
  } catch {
    return null;
  }
}

export function buildAirbnbMapSearchUrl(house: {
  address: string;
  bedrooms: number;
  unbookedStartDate: string;
  unbookedEndDate: string;
  latitude?: number;
  longitude?: number;
}): string {
  const params = new URLSearchParams();
  if (house.unbookedStartDate) params.set('checkin', house.unbookedStartDate);
  if (house.unbookedEndDate) params.set('checkout', house.unbookedEndDate);
  if (house.bedrooms > 0) params.set('min_bedrooms', String(house.bedrooms));

  if (
    typeof house.latitude === 'number' &&
    typeof house.longitude === 'number' &&
    Number.isFinite(house.latitude) &&
    Number.isFinite(house.longitude)
  ) {
    // ~0.35-mile bounding box around the exact property coordinates
    const delta = 0.0055;
    params.set('ne_lat', (house.latitude + delta).toFixed(5));
    params.set('ne_lng', (house.longitude + delta).toFixed(5));
    params.set('sw_lat', (house.latitude - delta).toFixed(5));
    params.set('sw_lng', (house.longitude - delta).toFixed(5));
    params.set('search_by_map', 'true');
  }

  const slug = encodeURIComponent(house.address.trim());
  return `https://www.airbnb.com/s/${slug}/homes?${params.toString()}`;
}

export function buildVrboSearchUrl(house: {
  address: string;
  bedrooms: number;
  unbookedStartDate: string;
  unbookedEndDate: string;
}): string {
  const params = new URLSearchParams({
    destination: house.address.trim(),
    startDate: house.unbookedStartDate,
    endDate: house.unbookedEndDate,
  });
  if (house.bedrooms > 0) {
    params.set('bedrooms', String(house.bedrooms));
  }
  return `https://www.vrbo.com/search?${params.toString()}`;
}

export function buildGoogleRentalsUrl(house: { address: string; bedrooms: number }): string {
  const q = `${house.bedrooms || 1} bedroom vacation rentals near ${house.address.trim()}`;
  return `https://www.google.com/travel/search?q=${encodeURIComponent(q)}`;
}

/**
 * Independent public metro ADR baseline by market tier + bedroom count.
 * Never depends on the user's currentPrice so there is zero circular math.
 */
export function estimateIndependentMetroMedian(
  locationContextLower: string,
  bedrooms: number,
): number {
  const safeBeds = Math.max(1, bedrooms);
  let baseOneBed = 135;

  if (HIGH_DEMAND_MARKETS.some((m) => locationContextLower.includes(m))) {
    baseOneBed = 195;
  } else if (MID_HIGH_MARKETS.some((m) => locationContextLower.includes(m))) {
    baseOneBed = 160;
  }

  return Math.round(baseOneBed + (safeBeds - 1) * 55);
}

export function buildPropertyFromAnyAddress({
  rawAddress,
  bedrooms,
  currentPrice,
  floorPrice,
  unbookedNights,
  geocoded,
  baseDate = new Date(),
}: BuildFromAddressParams): PropertyHouse {
  const fallbackParsed = parseFreeformAddress(rawAddress);
  const nickname = geocoded?.nickname || fallbackParsed.nickname;
  const fullAddress = geocoded?.formattedAddress || fallbackParsed.street;
  const neighborhood = geocoded?.neighborhood || fallbackParsed.neighborhood;
  const zipCode = geocoded?.zipCode || fallbackParsed.zipCode;

  const safeBeds = Math.max(0, Math.round(bedrooms));
  const baths = Math.max(1, safeBeds >= 3 ? 2 : 1.5);
  const safePrice = Math.max(40, Math.round(currentPrice));
  const safeFloor = Math.max(35, Math.min(safePrice, Math.round(floorPrice)));
  const safeNights = Math.max(1, Math.min(30, Math.round(unbookedNights)));

  const startDate = addDaysIso(baseDate, 2);
  const endDate = addDaysIso(baseDate, 2 + safeNights);

  const locationKey = `${fullAddress} ${neighborhood} ${zipCode}`.toLowerCase();
  const metroMedian = estimateIndependentMetroMedian(locationKey, safeBeds);
  const p25 = Math.max(55, Math.round(metroMedian * 0.86));
  const p75 = Math.max(70, Math.round(metroMedian * 1.18));

  const mapProofUrl = buildAirbnbMapSearchUrl({
    address: fullAddress,
    bedrooms: safeBeds,
    unbookedStartDate: startDate,
    unbookedEndDate: endDate,
    latitude: geocoded?.latitude,
    longitude: geocoded?.longitude,
  });

  const id = `house-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const cleanFee = Math.round(75 + Math.max(1, safeBeds) * 25);

  return {
    id,
    nickname,
    title: `${safeBeds || 1}BR Short-Term Rental · ${neighborhood}`,
    address: fullAddress,
    neighborhood,
    zipCode,
    latitude: geocoded?.latitude,
    longitude: geocoded?.longitude,
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
        id: `comp-${id}-p25`,
        name: `Est. ${neighborhood} ${safeBeds || 1}BR Lower Range (P25)`,
        address: 'Regional statistical estimate · Verify on Airbnb map',
        airbnbUrl: mapProofUrl,
        bedrooms: safeBeds,
        bathrooms: baths,
        rating: 4.85,
        reviewsCount: 50,
        currentPrice: p25,
        originalPrice: metroMedian,
        isBooked: false,
        distanceMiles: 0.35,
        superhost: false,
        isVerified: false,
        priceHistory: [{ date: 'Baseline', price: p25 }],
      },
      {
        id: `comp-${id}-p50`,
        name: `Est. ${neighborhood} ${safeBeds || 1}BR Median (P50)`,
        address: 'Regional statistical estimate · Verify on Airbnb map',
        airbnbUrl: mapProofUrl,
        bedrooms: safeBeds,
        bathrooms: baths,
        rating: 4.91,
        reviewsCount: 95,
        currentPrice: metroMedian,
        originalPrice: metroMedian,
        isBooked: false,
        distanceMiles: 0.35,
        superhost: true,
        isVerified: false,
        priceHistory: [{ date: 'Baseline', price: metroMedian }],
      },
      {
        id: `comp-${id}-p75`,
        name: `Est. ${neighborhood} ${safeBeds || 1}BR Upper Range (P75)`,
        address: 'Regional statistical estimate · Verify on Airbnb map',
        airbnbUrl: mapProofUrl,
        bedrooms: safeBeds,
        bathrooms: baths,
        rating: 4.96,
        reviewsCount: 160,
        currentPrice: p75,
        originalPrice: p75,
        isBooked: true,
        distanceMiles: 0.35,
        superhost: true,
        isVerified: false,
        priceHistory: [{ date: 'Baseline', price: p75 }],
      },
    ],
  };
}
