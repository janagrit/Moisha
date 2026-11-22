import {
  HostProperty,
  CompetitorListing,
  PriceChangeEvent,
  PropertyType,
  Amenity,
} from '../types';

export const US_ONLY_ERROR_MESSAGE =
  'Sorry, Moisha currently supports Airbnb properties located in the United States only. Please enter a valid US property address or ZIP code.';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

export function extractRoomIdFromAirbnbUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProto);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const host = parsed.hostname.toLowerCase();
    if (!/^([a-z0-9-]+\.)?airbnb\.[a-z.]{2,6}$/i.test(host)) return null;
    const match = parsed.pathname.match(/\/rooms\/(\d{4,25})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractMetaContent(html: string, prop: string): string | null {
  const re1 = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i');
  const m = html.match(re1) || html.match(re2);
  return m?.[1] ? decodeHtmlEntities(m[1]) : null;
}

function mapPropertyType(typeHeader: string, bedrooms: number): PropertyType {
  const lower = typeHeader.toLowerCase();
  if (/\bshared\s+room\b/.test(lower)) return 'shared_room';
  if (/\bprivate\s+room\b|\broom\s+in\b/.test(lower)) return 'private_room';
  if (/\bstudio\b/.test(lower) || bedrooms === 0) return 'studio';
  return 'entire_home';
}

function mapAmenityTitles(titles: string[]): Amenity[] {
  const found = new Set<Amenity>();
  for (const t of titles) {
    const l = t.toLowerCase();
    if (l.includes('wifi') || l.includes('wi-fi') || l.includes('internet')) found.add('wifi');
    if (l.includes('kitchen')) found.add('kitchen');
    if (l.includes('free parking') || l.includes('free street parking') || l.includes('driveway parking')) {
      found.add('free_parking');
    }
    if (l.includes('washer') || l.includes('dryer') || l.includes('laundry')) found.add('washer_dryer');
    if (l.includes('workspace') || l.includes('desk')) found.add('workspace');
    if (/\bpool\b/.test(l)) found.add('pool');
    if (l.includes('hot tub') || l.includes('jacuzzi')) found.add('hot_tub');
    if (l.includes('patio') || l.includes('balcony') || l.includes('backyard') || l.includes('deck')) {
      found.add('patio');
    }
    if (l.includes('pets allowed') || l.includes('pet friendly')) found.add('pet_friendly');
    if (l.includes('ev charger') || l.includes('electric vehicle')) found.add('ev_charger');
  }
  return Array.from(found);
}

function parseRoomCountsFromText(text: string): {
  isStudio: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  guests: number | null;
} {
  const isStudio = /\bstudio\b/i.test(text);
  const bedMatch = text.match(/(\d+)\s*bedrooms?/i);
  const bathMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:shared\s+|private\s+)?baths?/i);
  const guestMatch = text.match(/(\d+)\s*guests?/i);
  return {
    isStudio,
    bedrooms: isStudio ? 0 : bedMatch ? Number(bedMatch[1]) : null,
    bathrooms: bathMatch ? Number(bathMatch[1]) : null,
    guests: guestMatch ? Number(guestMatch[1]) : null,
  };
}

interface ParsedSearchCard {
  roomId: string;
  name: string;
  headerTitle: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  nightlyPrice: number;
  originalNightlyPrice: number | null;
  photoUrl: string | null;
}

function parseAirbnbSearchHtml(html: string): ParsedSearchCard[] {
  const match = html.match(/<script[^>]*id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return [];

  let json: unknown;
  try {
    json = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const results: ParsedSearchCard[] = [];
  const seenIds = new Set<string>();

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const rec = node as Record<string, unknown>;
    if (rec.__typename === 'StaySearchResult') {
      const demand = rec.demandStayListing as { id?: string } | undefined;
      const b64 = typeof demand?.id === 'string' ? demand.id : '';
      let roomId: string | null = null;
      if (b64) {
        try {
          const decoded = Buffer.from(b64, 'base64').toString('utf8');
          const parts = decoded.split(':');
          if (parts[1] && /^\d+$/.test(parts[1])) roomId = parts[1];
        } catch {
          roomId = null;
        }
      }
      if (!roomId || seenIds.has(roomId)) return;

      const sdp = rec.structuredDisplayPrice as
        | {
            primaryLine?: {
              discountedPrice?: string;
              price?: string;
              originalPrice?: string;
              qualifier?: string;
              accessibilityLabel?: string;
            };
          }
        | undefined;

      const pl = sdp?.primaryLine || {};
      const priceStr = pl.discountedPrice || pl.price || pl.accessibilityLabel || '';
      const origStr = pl.originalPrice || '';
      const qualStr = `${pl.qualifier || ''} ${pl.accessibilityLabel || ''}`;
      const nightsMatch = qualStr.match(/for\s+(\d+)\s+nights?/i);
      const nights = nightsMatch ? Math.max(1, Number(nightsMatch[1])) : 1;

      const rawPrice = Number((priceStr.match(/\$([\d,]+)/)?.[1] || '0').replace(/,/g, ''));
      const rawOrig = Number((origStr.match(/\$([\d,]+)/)?.[1] || '0').replace(/,/g, ''));
      if (!rawPrice || rawPrice <= 0) return;

      const nightlyPrice = Math.round(rawPrice / nights);
      const originalNightlyPrice =
        rawOrig > 0 && Math.round(rawOrig / nights) !== nightlyPrice
          ? Math.round(rawOrig / nights)
          : null;

      const headerTitle = typeof rec.title === 'string' ? rec.title : '';
      const subtitle = typeof rec.subtitle === 'string' ? rec.subtitle : '';
      const nameLoc = rec.nameLocalized as
        | { localizedStringWithTranslationPreference?: string }
        | undefined;
      const localizedName = nameLoc?.localizedStringWithTranslationPreference || '';
      const bestName = (subtitle || localizedName || headerTitle || `Listing #${roomId}`).trim();

      const sc = rec.structuredContent as
        | { primaryLine?: Array<{ body?: string | null }> }
        | undefined;
      const primaryLinesText = (sc?.primaryLine || [])
        .map((x) => x.body || '')
        .filter(Boolean)
        .join(' · ');

      const combinedRoomText = `${headerTitle} · ${bestName} · ${primaryLinesText}`;
      const counts = parseRoomCountsFromText(combinedRoomText);
      const inferredBeds =
        counts.bedrooms !== null
          ? counts.bedrooms
          : (() => {
              const m = bestName.match(/\b(\d+)\s*(?:br|bd|bed)\b/i);
              return m ? Number(m[1]) : null;
            })();

      const propType = mapPropertyType(
        `${headerTitle} ${primaryLinesText}`,
        inferredBeds ?? 1,
      );

      const pics = rec.contextualPictures as Array<{ picture?: string }> | undefined;
      const photoUrl =
        typeof pics?.[0]?.picture === 'string' && pics[0].picture.startsWith('https://')
          ? pics[0].picture
          : null;

      seenIds.add(roomId);
      results.push({
        roomId,
        name: bestName,
        headerTitle,
        propertyType: propType,
        bedrooms: propType === 'studio' ? 0 : inferredBeds,
        bathrooms: counts.bathrooms,
        nightlyPrice,
        originalNightlyPrice,
        photoUrl,
      });
      return;
    }

    for (const val of Object.values(rec)) {
      walk(val);
    }
  }

  walk(json);
  return results;
}

function getFutureStayWindow(daysAhead: number, stayNights = 2): {
  checkIn: string;
  checkOut: string;
} {
  const start = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + stayNights * 24 * 60 * 60 * 1000);
  return {
    checkIn: start.toISOString().slice(0, 10),
    checkOut: end.toISOString().slice(0, 10),
  };
}

function isLikelyUsCoordinates(lat: number, lng: number): boolean {
  // Continental US, Alaska, Hawaii, Puerto Rico / USVI
  const continental = lat >= 24.3 && lat <= 49.5 && lng >= -125.0 && lng <= -66.8;
  const alaska = lat >= 51.0 && lat <= 71.5 && lng >= -170.0 && lng <= -129.9;
  const hawaii = lat >= 18.8 && lat <= 22.4 && lng >= -160.5 && lng <= -154.7;
  const prVi = lat >= 17.6 && lat <= 18.6 && lng >= -67.4 && lng <= -64.5;
  return continental || alaska || hawaii || prVi;
}

async function reverseGeocodeUsCheck(lat: number, lng: number): Promise<{
  isUs: boolean;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  neighborhood: string;
}> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`,
      {
        headers: { 'User-Agent': 'MoishaCompetitorMonitor/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (res.ok) {
      const data = (await res.json()) as {
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
          country_code?: string;
          'ISO3166-2-lvl4'?: string;
        };
      };
      const addr = data.address || {};
      const cc = (addr.country_code || '').toLowerCase();
      if (cc && cc !== 'us') {
        return { isUs: false, address: '', city: '', state: '', zipCode: '', neighborhood: '' };
      }

      const isoState = addr['ISO3166-2-lvl4']?.startsWith('US-')
        ? addr['ISO3166-2-lvl4'].slice(3)
        : '';
      const state =
        isoState || US_STATE_NAMES[(addr.state || '').toLowerCase()] || addr.state || 'US';
      const city =
        addr.city || addr.town || addr.village || addr.county?.replace(/ County$/i, '') || '';
      const zipCode = addr.postcode ? addr.postcode.slice(0, 5) : '';
      const sub = addr.neighbourhood || addr.suburb || '';
      const street = addr.road || sub;
      const addressParts = [street, city, state, zipCode].filter(Boolean);
      const neighborhoodParts = [sub || city, state].filter(Boolean);

      return {
        isUs: true,
        address: addressParts.join(', ') || `${city}, ${state}`.trim(),
        city: city || 'United States',
        state,
        zipCode,
        neighborhood: neighborhoodParts.join(', ') || `${city}, ${state}`.trim(),
      };
    }
  } catch {
    // Fallback to coordinate check if Nominatim is rate-limited
  }

  if (!isLikelyUsCoordinates(lat, lng)) {
    return { isUs: false, address: '', city: '', state: '', zipCode: '', neighborhood: '' };
  }

  return {
    isUs: true,
    address: `US (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
    city: 'United States',
    state: 'US',
    zipCode: '',
    neighborhood: 'Local Neighborhood',
  };
}

interface ExtractedRoomCore {
  roomId: string;
  airbnbUrl: string;
  name: string;
  photoUrl: string | null;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number | null;
  guestCapacity: number | null;
  amenities: Amenity[];
  latitude: number | null;
  longitude: number | null;
  ogLocationHint: string;
}

async function fetchPublicAirbnbRoomCore(roomId: string): Promise<ExtractedRoomCore | null> {
  const airbnbUrl = `https://www.airbnb.com/rooms/${roomId}`;
  const res = await fetch(`${airbnbUrl}?currency=USD`, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(9_000),
  });

  if (!res.ok) return null;
  const html = await res.text();

  const ogTitle = extractMetaContent(html, 'og:title') || '';
  const ogDesc = extractMetaContent(html, 'og:description') || '';
  const ogImage = extractMetaContent(html, 'og:image');

  // Extract PdpSharingConfig & coordinates & AmenityItems from embedded scripts
  let sharingTitle = '';
  let sharingPropertyType = '';
  let personCapacity: number | null = null;
  let sharingImage: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  const amenityTitles: string[] = [];

  const scriptMatches = [
    ...html.matchAll(/<script[^>]*id="data-(?:deferred-state-0|injector-instances)"[^>]*>([\s\S]*?)<\/script>/gi),
  ];

  for (const sm of scriptMatches) {
    const raw = sm[1];
    if (latitude === null) {
      const latM = raw.match(/"latitude"\s*:\s*(-?\d+\.\d+)/);
      const lngM = raw.match(/"longitude"\s*:\s*(-?\d+\.\d+)/);
      if (latM && lngM) {
        latitude = Number(latM[1]);
        longitude = Number(lngM[1]);
      }
    }

    // Extract AmenityItem titles via lightweight regex over JSON text
    for (const am of raw.matchAll(
      /"__typename"\s*:\s*"AmenityItem"[^{}]*?"available"\s*:\s*true[^{}]*?"title"\s*:\s*"([^"]+)"/g,
    )) {
      amenityTitles.push(am[1]);
    }
    for (const am2 of raw.matchAll(
      /"__typename"\s*:\s*"AmenityItem"[^{}]*?"title"\s*:\s*"([^"]+)"[^{}]*?"available"\s*:\s*true/g,
    )) {
      amenityTitles.push(am2[1]);
    }

    try {
      const parsed = JSON.parse(raw);
      (function walk(n: unknown) {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) {
          for (const x of n) walk(x);
          return;
        }
        const r = n as Record<string, unknown>;
        if (r.__typename === 'PdpSharingConfig') {
          if (typeof r.title === 'string') sharingTitle = r.title;
          if (typeof r.propertyType === 'string') sharingPropertyType = r.propertyType;
          if (typeof r.personCapacity === 'number') personCapacity = r.personCapacity;
          if (typeof r.imageUrl === 'string') sharingImage = r.imageUrl;
        }
        for (const v of Object.values(r)) walk(v);
      })(parsed);
    } catch {
      // Ignore non-JSON script chunks
    }
  }

  const summarySource = `${sharingTitle} · ${ogTitle}`;
  const counts = parseRoomCountsFromText(summarySource);
  const bedrooms = counts.bedrooms ?? 1;
  const propertyType = mapPropertyType(
    `${sharingPropertyType} ${ogTitle}`,
    bedrooms,
  );

  // On Airbnb, og:description holds the host's custom listing headline (e.g. "Modern 3BR Near Union Market")
  // while og:title holds "Home in Washington · ★4.88 · 3 bedrooms · 4 beds · 2.5 baths"
  const ogHeaderPart = ogTitle.split('·')[0]?.replace(/\s*-\s*Airbnb.*$/i, '').trim() || '';
  const name = (ogDesc || ogHeaderPart || `Airbnb Listing #${roomId}`).trim();
  const photoUrl =
    (sharingImage && sharingImage.startsWith('https://') ? sharingImage : null) ||
    (ogImage && ogImage.startsWith('https://') ? ogImage : null);

  return {
    roomId,
    airbnbUrl,
    name,
    photoUrl,
    propertyType,
    bedrooms: propertyType === 'studio' ? 0 : bedrooms,
    bathrooms: counts.bathrooms,
    guestCapacity: personCapacity ?? counts.guests,
    amenities: mapAmenityTitles(amenityTitles),
    latitude,
    longitude,
    ogLocationHint: ogHeaderPart,
  };
}

async function fetchBoundingBoxCards(params: {
  slug?: string;
  lat: number;
  lng: number;
  delta: number;
  propertyType?: PropertyType;
  bedrooms?: number;
  checkIn?: string;
  checkOut?: string;
}): Promise<ParsedSearchCard[]> {
  const qs = new URLSearchParams();
  qs.set('currency', 'USD');
  qs.set('ne_lat', (params.lat + params.delta).toFixed(5));
  qs.set('ne_lng', (params.lng + params.delta).toFixed(5));
  qs.set('sw_lat', (params.lat - params.delta).toFixed(5));
  qs.set('sw_lng', (params.lng - params.delta).toFixed(5));
  qs.set('search_by_map', 'true');

  if (params.propertyType) {
    const rt =
      params.propertyType === 'private_room'
        ? 'Private room'
        : params.propertyType === 'shared_room'
          ? 'Shared room'
          : 'Entire home/apt';
    qs.append('room_types[]', rt);
  }
  if (typeof params.bedrooms === 'number' && params.bedrooms > 0) {
    qs.set('min_bedrooms', String(params.bedrooms));
    qs.set('max_bedrooms', String(params.bedrooms));
  }
  if (params.checkIn && params.checkOut) {
    qs.set('checkin', params.checkIn);
    qs.set('checkout', params.checkOut);
  }

  const pathPart = params.slug ? `/s/${encodeURIComponent(params.slug)}/homes` : '/s/homes';
  const url = `https://www.airbnb.com${pathPart}?${qs.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return [];
    return parseAirbnbSearchHtml(await res.text());
  } catch {
    return [];
  }
}

export type IngestResult =
  | {
      ok: true;
      property: HostProperty;
      competitors: CompetitorListing[];
      priceChanges: PriceChangeEvent[];
    }
  | {
      ok: false;
      code: 'INVALID_URL' | 'NON_US' | 'UPSTREAM_UNAVAILABLE';
      error: string;
    };

export async function ingestAirbnbListingFromUrl(rawUrl: string): Promise<IngestResult> {
  const roomId = extractRoomIdFromAirbnbUrl(rawUrl);
  if (!roomId) {
    return {
      ok: false,
      code: 'INVALID_URL',
      error: 'Please enter a public Airbnb listing link (e.g. https://www.airbnb.com/rooms/31249608).',
    };
  }

  const core = await fetchPublicAirbnbRoomCore(roomId);
  if (!core || core.latitude === null || core.longitude === null) {
    return {
      ok: false,
      code: 'UPSTREAM_UNAVAILABLE',
      error: 'Could not read that public Airbnb listing right now. Check that the listing link is public and active.',
    };
  }

  const geo = await reverseGeocodeUsCheck(core.latitude, core.longitude);
  if (!geo.isUs) {
    return {
      ok: false,
      code: 'NON_US',
      error: US_ONLY_ERROR_MESSAGE,
    };
  }

  const slug = [geo.city, geo.state].filter(Boolean).join('--') || 'United-States';

  // Fetch micro-box (for host's own live price + raw non-comparable noise sample) AND filtered neighborhood comps in parallel
  const [microCards, filteredCompCards] = await Promise.all([
    fetchBoundingBoxCards({
      lat: core.latitude,
      lng: core.longitude,
      delta: 0.002,
    }),
    fetchBoundingBoxCards({
      slug,
      lat: core.latitude,
      lng: core.longitude,
      delta: 0.014,
      propertyType: core.propertyType,
      bedrooms: core.bedrooms,
    }),
  ]);

  let hostNightlyPrice =
    microCards.find((c) => c.roomId === roomId)?.nightlyPrice ??
    filteredCompCards.find((c) => c.roomId === roomId)?.nightlyPrice ??
    null;

  // If the host's listing wasn't available on flexible default dates, probe 21 days out
  if (hostNightlyPrice === null) {
    const win = getFutureStayWindow(21, 2);
    const datedMicro = await fetchBoundingBoxCards({
      lat: core.latitude,
      lng: core.longitude,
      delta: 0.002,
      checkIn: win.checkIn,
      checkOut: win.checkOut,
    });
    hostNightlyPrice = datedMicro.find((c) => c.roomId === roomId)?.nightlyPrice ?? null;
  }

  const nowIso = new Date().toISOString();
  const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const hostProperty: HostProperty = {
    id: `prop-${roomId}`,
    airbnbUrl: core.airbnbUrl,
    airbnbRoomId: roomId,
    name: core.name,
    address: geo.address,
    city: geo.city,
    state: geo.state,
    zipCode: geo.zipCode,
    neighborhood: geo.neighborhood,
    latitude: core.latitude,
    longitude: core.longitude,
    propertyType: core.propertyType,
    bedrooms: core.bedrooms,
    bathrooms: core.bathrooms,
    guestCapacity: core.guestCapacity,
    nightlyPrice: hostNightlyPrice,
    photoUrl: core.photoUrl,
    amenities: core.amenities,
    createdAt: nowIso,
  };

  // Build up to 10 comparable neighborhood listings + up to 2 non-comparable micro-box units to show filtering
  const competitors: CompetitorListing[] = [];
  const priceChanges: PriceChangeEvent[] = [];
  const addedRoomIds = new Set<string>([roomId]);

  for (const card of filteredCompCards) {
    if (addedRoomIds.has(card.roomId)) continue;
    if (competitors.length >= 10) break;
    addedRoomIds.add(card.roomId);

    const beds = card.bedrooms ?? core.bedrooms;
    const prevPrice = card.originalNightlyPrice;

    const comp: CompetitorListing = {
      id: `airbnb-${card.roomId}`,
      airbnbUrl: `https://www.airbnb.com/rooms/${card.roomId}`,
      airbnbRoomId: card.roomId,
      name: card.name,
      propertyType: card.propertyType,
      bedrooms: beds,
      bathrooms: card.bathrooms,
      guestCapacity: null,
      nightlyPrice: card.nightlyPrice,
      previousPrice: prevPrice,
      photoUrl: card.photoUrl,
      locationNote: card.headerTitle || `Near ${geo.neighborhood}`,
      amenities: [],
      lastCheckedAt: nowIso,
      priceHistory: prevPrice
        ? [
            { price: prevPrice, recordedAt: yesterdayIso },
            { price: card.nightlyPrice, recordedAt: nowIso },
          ]
        : [{ price: card.nightlyPrice, recordedAt: nowIso }],
    };
    competitors.push(comp);

    if (prevPrice && prevPrice !== card.nightlyPrice) {
      const deltaAmount = card.nightlyPrice - prevPrice;
      const percentChange = Number(((deltaAmount / prevPrice) * 100).toFixed(1));
      priceChanges.push({
        id: `chg-${card.roomId}-${Date.now()}`,
        competitorId: comp.id,
        competitorName: comp.name,
        competitorPhotoUrl: comp.photoUrl,
        airbnbUrl: comp.airbnbUrl,
        bedrooms: comp.bedrooms,
        propertyType: comp.propertyType,
        previousPrice: prevPrice,
        newPrice: card.nightlyPrice,
        deltaAmount,
        percentChange,
        changedAt: nowIso,
      });
    }
  }

  // Also include up to 2 non-matching micro-box units (if bedrooms/type differ) so host sees excluded noise
  let nonCompAdded = 0;
  for (const card of microCards) {
    if (addedRoomIds.has(card.roomId) || nonCompAdded >= 2) continue;
    if (card.bedrooms === null) continue;
    const isNonComparable =
      card.propertyType !== core.propertyType || Math.abs(card.bedrooms - core.bedrooms) >= 2;
    if (!isNonComparable) continue;

    addedRoomIds.add(card.roomId);
    nonCompAdded += 1;
    competitors.push({
      id: `airbnb-${card.roomId}`,
      airbnbUrl: `https://www.airbnb.com/rooms/${card.roomId}`,
      airbnbRoomId: card.roomId,
      name: card.name,
      propertyType: card.propertyType,
      bedrooms: card.bedrooms,
      bathrooms: card.bathrooms,
      guestCapacity: null,
      nightlyPrice: card.nightlyPrice,
      previousPrice: null,
      photoUrl: card.photoUrl,
      locationNote: card.headerTitle || null,
      amenities: [],
      lastCheckedAt: nowIso,
      priceHistory: [{ price: card.nightlyPrice, recordedAt: nowIso }],
    });
  }

  return {
    ok: true,
    property: hostProperty,
    competitors,
    priceChanges,
  };
}

export async function fetchSingleCompetitorFromUrl(rawUrl: string): Promise<
  | {
      ok: true;
      competitor: {
        airbnbUrl: string;
        airbnbRoomId: string;
        name: string;
        propertyType: PropertyType;
        bedrooms: number;
        bathrooms: number | null;
        guestCapacity: number | null;
        nightlyPrice: number | null;
        photoUrl: string | null;
        amenities: Amenity[];
      };
    }
  | { ok: false; error: string }
> {
  const roomId = extractRoomIdFromAirbnbUrl(rawUrl);
  if (!roomId) {
    return {
      ok: false,
      error: 'Please enter a valid Airbnb listing link (e.g. https://www.airbnb.com/rooms/12345678).',
    };
  }

  const core = await fetchPublicAirbnbRoomCore(roomId);
  if (!core) {
    return { ok: false, error: 'Could not read that Airbnb listing right now.' };
  }

  let nightlyPrice: number | null = null;
  if (core.latitude !== null && core.longitude !== null) {
    const micro = await fetchBoundingBoxCards({
      lat: core.latitude,
      lng: core.longitude,
      delta: 0.002,
    });
    nightlyPrice = micro.find((c) => c.roomId === roomId)?.nightlyPrice ?? null;
    if (nightlyPrice === null) {
      const win = getFutureStayWindow(21, 2);
      const dated = await fetchBoundingBoxCards({
        lat: core.latitude,
        lng: core.longitude,
        delta: 0.002,
        checkIn: win.checkIn,
        checkOut: win.checkOut,
      });
      nightlyPrice = dated.find((c) => c.roomId === roomId)?.nightlyPrice ?? null;
    }
  }

  return {
    ok: true,
    competitor: {
      airbnbUrl: core.airbnbUrl,
      airbnbRoomId: roomId,
      name: core.name,
      propertyType: core.propertyType,
      bedrooms: core.bedrooms,
      bathrooms: core.bathrooms,
      guestCapacity: core.guestCapacity,
      nightlyPrice,
      photoUrl: core.photoUrl,
      amenities: core.amenities,
    },
  };
}

export async function checkLivePricesForProperty(input: {
  latitude: number | null;
  longitude: number | null;
  city: string;
  state: string;
  propertyType: PropertyType;
  bedrooms: number;
  competitors: Array<{ id: string; airbnbRoomId: string | null }>;
}): Promise<Record<string, number>> {
  if (input.latitude === null || input.longitude === null) {
    return {};
  }

  const slug = [input.city, input.state].filter(Boolean).join('--') || 'United-States';
  const cards = await fetchBoundingBoxCards({
    slug,
    lat: input.latitude,
    lng: input.longitude,
    delta: 0.016,
    propertyType: input.propertyType,
    bedrooms: input.bedrooms,
  });

  const byRoomId = new Map<string, number>();
  for (const c of cards) {
    byRoomId.set(c.roomId, c.nightlyPrice);
  }

  const observedById: Record<string, number> = {};
  for (const comp of input.competitors) {
    if (comp.airbnbRoomId && byRoomId.has(comp.airbnbRoomId)) {
      observedById[comp.id] = byRoomId.get(comp.airbnbRoomId)!;
    }
  }

  return observedById;
}
