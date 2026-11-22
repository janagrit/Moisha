export const US_ONLY_ERROR_MESSAGE =
  'Sorry, Moisha currently supports Airbnb properties located in the United States only. Please enter a valid US property address or ZIP code.';

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI',
]);

const US_STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC', 'puerto rico': 'PR',
};

const NON_US_INDICATORS = [
  /\b(canada|united kingdom|uk|england|scotland|france|germany|spain|italy|portugal|australia|japan|mexico|brazil|colombia|argentina|peru|chile|costa rica|panama|india|ireland|netherlands|switzerland|dubai|uae|singapore|thailand|indonesia|bali|greece|croatia|turkey|south africa|new zealand|korea|taiwan|vietnam|philippines|ontario|quebec|british columbia|alberta|toronto|vancouver|montreal|london|paris|berlin|rome|madrid|barcelona|tokyo|sydney|melbourne|cancun|tulum|mexico city|bogota)\b/i,
  // Canadian postal code (e.g. M5V 2T6)
  /\b[A-CEGHJ-NPR-TVXY]\d[A-CEGHJ-NPR-TV-Z][ -]?\d[A-CEGHJ-NPR-TV-Z]\d\b/i,
  // UK postcode (e.g. SW1A 1AA, EC1A 1BB)
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,
];

export interface ParsedAirbnbUrl {
  normalizedUrl: string;
  roomId: string | null;
}

export function parseAirbnbListingUrl(rawUrl: string): ParsedAirbnbUrl | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const isAirbnbHost = host === 'airbnb.com' || host.endsWith('.airbnb.com');
  if (!isAirbnbHost) {
    return null;
  }

  const roomMatch = parsed.pathname.match(/\/rooms\/(\d+)/);
  const roomId = roomMatch ? roomMatch[1] : null;
  const cleanUrl = roomId
    ? `https://www.airbnb.com/rooms/${roomId}`
    : `${parsed.origin}${parsed.pathname}`;

  return {
    normalizedUrl: cleanUrl,
    roomId,
  };
}

export interface ExtractedListingPreview {
  name: string | null;
  photoUrl: string | null;
  bathrooms: number | null;
  guestCapacity: number | null;
  bedrooms: number | null;
}

export async function tryFetchListingPreview(
  airbnbUrl: string,
): Promise<ExtractedListingPreview> {
  const empty: ExtractedListingPreview = {
    name: null,
    photoUrl: null,
    bathrooms: null,
    guestCapacity: null,
    bedrooms: null,
  };

  try {
    const signal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(3_500)
        : undefined;
    const res = await fetch(`./api/listing-preview?url=${encodeURIComponent(airbnbUrl)}`, {
      method: 'GET',
      signal,
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as Partial<ExtractedListingPreview> & {
      extracted?: boolean;
    };
    if (!data.extracted) return empty;

    return {
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : null,
      photoUrl:
        typeof data.photoUrl === 'string' && /^https?:\/\//i.test(data.photoUrl)
          ? data.photoUrl
          : null,
      bathrooms: typeof data.bathrooms === 'number' ? data.bathrooms : null,
      guestCapacity: typeof data.guestCapacity === 'number' ? data.guestCapacity : null,
      bedrooms: typeof data.bedrooms === 'number' ? data.bedrooms : null,
    };
  } catch {
    return empty;
  }
}

export interface ResolvedUsLocation {
  ok: true;
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
}

export interface RejectedLocation {
  ok: false;
  error: string;
}

export function checkOfflineUsAddressHeuristic(rawInput: string): {
  valid: boolean;
  city: string;
  state: string;
  zipCode: string;
} {
  const cleaned = rawInput.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { valid: false, city: '', state: '', zipCode: '' };
  }

  for (const pattern of NON_US_INDICATORS) {
    if (pattern.test(cleaned)) {
      return { valid: false, city: '', state: '', zipCode: '' };
    }
  }

  // Exact 5-digit US ZIP code alone (e.g. "78704" or "90210-1234")
  if (/^\d{5}(-\d{4})?$/.test(cleaned)) {
    const zip5 = cleaned.slice(0, 5);
    // Valid US ZIP codes range from 00501 to 99950
    const numeric = Number(zip5);
    if (numeric >= 501 && numeric <= 99950) {
      return { valid: true, city: `ZIP ${zip5}`, state: 'US', zipCode: zip5 };
    }
    return { valid: false, city: '', state: '', zipCode: '' };
  }

  const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zipCode = zipMatch ? zipMatch[1] : '';

  // Check for explicit US state code or full state name
  let detectedState = '';
  const lower = cleaned.toLowerCase();
  for (const [stateName, abbr] of Object.entries(US_STATE_NAMES)) {
    const regex = new RegExp(`\\b${stateName}\\b`, 'i');
    if (regex.test(lower)) {
      detectedState = abbr;
      break;
    }
  }

  if (!detectedState) {
    const commaSegments = cleaned
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Match explicit uppercase 2-letter state abbreviations (avoids matching lowercase words like "in", "or", "me")
    const rawTokens = cleaned.split(/[\s,]+/).filter(Boolean);
    if (rawTokens.length >= 2) {
      for (let i = rawTokens.length - 1; i >= 0; i -= 1) {
        const tok = rawTokens[i];
        if (/^[A-Z]{2}$/.test(tok) && US_STATE_CODES.has(tok)) {
          detectedState = tok;
          break;
        }
      }
    }

    // Also allow lowercase 2-letter state code only when it is the trailing comma-separated state segment (e.g. "Austin, tx")
    if (!detectedState && commaSegments.length >= 2) {
      const tail = commaSegments[commaSegments.length - 1];
      const tailMatch = tail.match(/^([a-zA-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
      if (tailMatch && US_STATE_CODES.has(tailMatch[1].toUpperCase())) {
        detectedState = tailMatch[1].toUpperCase();
      }
    }
  }

  if (!zipCode && !detectedState) {
    return { valid: false, city: '', state: '', zipCode: '' };
  }

  const parts = cleaned
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const city = parts.length >= 2 ? parts[1].replace(/\b\d{5}(-\d{4})?\b/, '').trim() : parts[0];

  return {
    valid: true,
    city: city || (zipCode ? `ZIP ${zipCode}` : 'United States'),
    state: detectedState || 'US',
    zipCode,
  };
}

interface NominatimAddress {
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
  country_code?: string;
  'ISO3166-2-lvl4'?: string;
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
}

export async function validateAndResolveUsLocation(
  rawLocation: string,
): Promise<ResolvedUsLocation | RejectedLocation> {
  const cleaned = rawLocation.trim();
  if (!cleaned) {
    return { ok: false, error: 'Please enter a US property address or ZIP code.' };
  }

  // Immediate rejection if input clearly specifies a non-US location or postal format
  for (const pattern of NON_US_INDICATORS) {
    if (pattern.test(cleaned)) {
      return { ok: false, error: US_ONLY_ERROR_MESSAGE };
    }
  }

  try {
    const signal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(4_500)
        : undefined;
    const isZipOnly = /^\d{5}(-\d{4})?$/.test(cleaned);
    const query = isZipOnly ? `${cleaned.slice(0, 5)}, United States` : cleaned;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=3&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (res.ok) {
      const results = (await res.json()) as NominatimResult[];
      if (Array.isArray(results) && results.length > 0) {
        const usHit = results.find(
          (r) => r.address?.country_code?.toLowerCase() === 'us',
        );

        if (!usHit) {
          return { ok: false, error: US_ONLY_ERROR_MESSAGE };
        }

        const addr = usHit.address || {};
        const isoState = addr['ISO3166-2-lvl4']?.startsWith('US-')
          ? addr['ISO3166-2-lvl4'].slice(3)
          : '';
        const stateNameLower = (addr.state || '').toLowerCase();
        const state = isoState || US_STATE_NAMES[stateNameLower] || addr.state || 'US';
        const city =
          addr.city || addr.town || addr.village || addr.county?.replace(/ County$/i, '') || '';
        const zipCode = addr.postcode
          ? addr.postcode.slice(0, 5)
          : isZipOnly
            ? cleaned.slice(0, 5)
            : '';
        const subarea = addr.neighbourhood || addr.suburb || '';
        const street =
          addr.house_number && addr.road
            ? `${addr.house_number} ${addr.road}`
            : addr.road || (isZipOnly ? '' : cleaned.split(',')[0].trim());

        const formattedParts = [street, city, state, zipCode].filter(Boolean);
        const neighborhoodParts = [subarea || city, state].filter(Boolean);
        const lat = Number(usHit.lat);
        const lon = Number(usHit.lon);

        return {
          ok: true,
          formattedAddress: formattedParts.join(', ') || cleaned,
          city: city || (zipCode ? `ZIP ${zipCode}` : 'United States'),
          state,
          zipCode,
          neighborhood: neighborhoodParts.join(', ') || cleaned,
          latitude: Number.isFinite(lat) ? lat : null,
          longitude: Number.isFinite(lon) ? lon : null,
        };
      }
    }
  } catch {
    // Fall back to strict offline US address / ZIP check if network or Nominatim is unreachable
  }

  const offline = checkOfflineUsAddressHeuristic(cleaned);
  if (!offline.valid) {
    return { ok: false, error: US_ONLY_ERROR_MESSAGE };
  }

  const neighborhood = [offline.city, offline.state].filter(Boolean).join(', ');
  return {
    ok: true,
    formattedAddress: cleaned,
    city: offline.city,
    state: offline.state,
    zipCode: offline.zipCode,
    neighborhood,
    latitude: null,
    longitude: null,
  };
}

export function buildComparableAirbnbSearchUrl(property: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType?: 'entire_home' | 'private_room' | 'shared_room' | 'studio';
  bedrooms: number;
  latitude: number | null;
  longitude: number | null;
}): string {
  const params = new URLSearchParams();
  const roomTypeParam =
    property.propertyType === 'private_room'
      ? 'Private room'
      : property.propertyType === 'shared_room'
        ? 'Shared room'
        : 'Entire home/apt';
  params.append('room_types[]', roomTypeParam);
  if (property.propertyType !== 'studio' && property.bedrooms > 0) {
    params.set('min_bedrooms', String(property.bedrooms));
    params.set('max_bedrooms', String(property.bedrooms));
  }

  if (property.latitude !== null && property.longitude !== null) {
    const delta = 0.008;
    params.set('ne_lat', (property.latitude + delta).toFixed(5));
    params.set('ne_lng', (property.longitude + delta).toFixed(5));
    params.set('sw_lat', (property.latitude - delta).toFixed(5));
    params.set('sw_lng', (property.longitude - delta).toFixed(5));
    params.set('search_by_map', 'true');
  }

  const queryLocation = [property.city, property.state, property.zipCode]
    .filter(Boolean)
    .join(', ') || property.address;
  return `https://www.airbnb.com/s/${encodeURIComponent(queryLocation)}/homes?${params.toString()}`;
}
