import { z } from 'zod';

export function sanitizeExternalUrl(
  raw: string | undefined | null,
  fallback = 'https://www.airbnb.com',
): string {
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export const OptionalHttpUrlSchema = z
  .string()
  .nullable()
  .optional()
  .transform((val) => {
    if (!val || !val.trim()) return null;
    try {
      const parsed = new URL(val.trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
        ? parsed.toString()
        : null;
    } catch {
      return null;
    }
  });

export const HttpUrlSchema = z
  .string()
  .refine((val) => {
    try {
      const parsed = new URL(val.trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Please enter a valid http(s) URL');

export const PropertyTypeSchema = z.enum([
  'entire_home',
  'private_room',
  'shared_room',
  'studio',
]);

export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  entire_home: 'Entire home',
  private_room: 'Private room',
  shared_room: 'Shared room',
  studio: 'Studio',
};

export const AMENITY_OPTIONS = [
  'wifi',
  'kitchen',
  'free_parking',
  'washer_dryer',
  'workspace',
  'pool',
  'hot_tub',
  'patio',
  'pet_friendly',
  'ev_charger',
] as const;

export const AmenitySchema = z.enum(AMENITY_OPTIONS);
export type Amenity = z.infer<typeof AmenitySchema>;

export const AMENITY_LABELS: Record<Amenity, string> = {
  wifi: 'Wi-Fi',
  kitchen: 'Kitchen',
  free_parking: 'Free parking',
  washer_dryer: 'Washer/dryer',
  workspace: 'Workspace',
  pool: 'Pool',
  hot_tub: 'Hot tub',
  patio: 'Patio/balcony',
  pet_friendly: 'Pet friendly',
  ev_charger: 'EV charger',
};

export const HostPropertySchema = z.object({
  id: z.string(),
  airbnbUrl: HttpUrlSchema,
  airbnbRoomId: z.string().nullable(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  neighborhood: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  propertyType: PropertyTypeSchema,
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20).nullable(),
  guestCapacity: z.number().int().min(1).max(50).nullable(),
  nightlyPrice: z.number().positive().nullable(),
  photoUrl: OptionalHttpUrlSchema,
  amenities: z.array(AmenitySchema),
  createdAt: z.string(),
});

export type HostProperty = z.infer<typeof HostPropertySchema>;

export const PriceSnapshotSchema = z.object({
  price: z.number().positive(),
  recordedAt: z.string(),
});

export type PriceSnapshot = z.infer<typeof PriceSnapshotSchema>;

export const CompetitorListingSchema = z.object({
  id: z.string(),
  airbnbUrl: HttpUrlSchema,
  airbnbRoomId: z.string().nullable(),
  name: z.string().min(1),
  propertyType: PropertyTypeSchema,
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20).nullable(),
  guestCapacity: z.number().int().min(1).max(50).nullable(),
  nightlyPrice: z.number().positive(),
  previousPrice: z.number().positive().nullable(),
  photoUrl: OptionalHttpUrlSchema,
  locationNote: z.string().nullable(),
  amenities: z.array(AmenitySchema),
  lastCheckedAt: z.string(),
  priceHistory: z.array(PriceSnapshotSchema),
});

export type CompetitorListing = z.infer<typeof CompetitorListingSchema>;

export const PriceChangeEventSchema = z.object({
  id: z.string(),
  competitorId: z.string(),
  competitorName: z.string(),
  competitorPhotoUrl: OptionalHttpUrlSchema,
  airbnbUrl: HttpUrlSchema,
  bedrooms: z.number().int().min(0),
  propertyType: PropertyTypeSchema,
  previousPrice: z.number().positive(),
  newPrice: z.number().positive(),
  deltaAmount: z.number(),
  percentChange: z.number(),
  changedAt: z.string(),
});

export type PriceChangeEvent = z.infer<typeof PriceChangeEventSchema>;

export const EmailAlertConfigSchema = z.object({
  email: z.string(),
  enabled: z.boolean(),
});

export type EmailAlertConfig = z.infer<typeof EmailAlertConfigSchema>;

export const MonitoringStateSchema = z.object({
  property: HostPropertySchema.nullable(),
  competitors: z.array(CompetitorListingSchema),
  priceChanges: z.array(PriceChangeEventSchema),
  lastCheckedAt: z.string().nullable(),
  previousCheckAt: z.string().nullable(),
  lastCheckChangesCount: z.number().int().min(0),
  emailConfig: EmailAlertConfigSchema,
});

export type MonitoringState = z.infer<typeof MonitoringStateSchema>;

export type MatchTier = 'primary' | 'secondary' | 'excluded';

export interface EvaluatedCompetitor {
  listing: CompetitorListing;
  tier: MatchTier;
  matchScore: number;
  matchReason: string;
  priceDiffFromMine: number | null;
  percentDiffFromMine: number | null;
}

export interface MarketOverviewStats {
  comparableCount: number;
  competitorAveragePrice: number | null;
  myPriceVsAverageDollar: number | null;
  myPriceVsAveragePercent: number | null;
  cheapestComparable: CompetitorListing | null;
  mostExpensiveComparable: CompetitorListing | null;
  changesSinceLastCheck: number;
  actionState: 'needs_attention' | 'opportunity' | 'aligned' | 'incomplete';
  actionSummary: string;
}

export type CompetitorSortField = 'price_asc' | 'price_desc' | 'bedrooms_asc' | 'bedrooms_desc';
