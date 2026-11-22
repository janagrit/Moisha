import { z } from 'zod';

export function sanitizeExternalUrl(
  raw: string | undefined,
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

export const HttpUrlSchema = z
  .string()
  .refine((val) => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL');

export const PricePointSchema = z.object({
  date: z.string(),
  price: z.number().nonnegative(),
});

export const ListingCompSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  address: z.string().optional(),
  airbnbUrl: HttpUrlSchema,
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().min(0),
  currentPrice: z.number().positive(),
  originalPrice: z.number().positive(),
  isBooked: z.boolean(),
  distanceMiles: z.number().min(0),
  superhost: z.boolean(),
  priceHistory: z.array(PricePointSchema),
});

export type ListingComp = z.infer<typeof ListingCompSchema>;

export const AirbnbPromotionSchema = z.object({
  id: z.string(),
  name: z.string(),
  badge: z.string(),
  discountPercent: z.number().min(1).max(80),
  effectivePrice: z.number().positive(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string(),
  status: z.enum(['recommended', 'applied', 'dismissed']),
});

export type AirbnbPromotion = z.infer<typeof AirbnbPromotionSchema>;

export const PropertyHouseSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1),
  title: z.string().min(1),
  address: z.string().min(1),
  neighborhood: z.string(),
  zipCode: z.string(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  currentPrice: z.number().positive(),
  floorPrice: z.number().positive(),
  cleaningFee: z.number().min(0),
  cleaningCost: z.number().min(0).default(115),
  nightlyFixedCost: z.number().min(0).default(120),
  hostServiceFeePercent: z.number().min(0).max(25).default(3),
  unbookedDaysCount: z.number().int().min(0),
  unbookedStartDate: z.string(),
  unbookedEndDate: z.string(),
  isBooked: z.boolean(),
  propertyManagerName: z.string(),
  managerPhone: z.string(),
  activePromotion: AirbnbPromotionSchema.nullable().optional(),
  comps: z.array(ListingCompSchema),
});

export type PropertyHouse = z.infer<typeof PropertyHouseSchema>;

export const PricingRuleKindSchema = z.enum([
  'orphan_gap',
  'neighbor_undercut',
  'promo_badge',
  'safety_floor',
]);

export type PricingRuleKind = z.infer<typeof PricingRuleKindSchema>;

export const PricingRuleSchema = z.object({
  id: z.string(),
  kind: PricingRuleKindSchema,
  title: z.string(),
  enabled: z.boolean(),
  description: z.string(),
  parameterName: z.string(),
  parameterValue: z.number().min(0),
  unit: z.string(),
});

export type PricingRule = z.infer<typeof PricingRuleSchema>;

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface LiveMarketScanResult {
  summary: string;
  weekdayRange: string;
  weekendRange: string;
  sources: GroundingSource[];
  scannedAt: string;
  isLiveGrounded: boolean;
}

export interface RevenueScenario {
  label: string;
  nightlyRate: number;
  nights: number;
  bookingProbability: number;
  grossRoomRevenue: number;
  cleaningFeeRevenue: number;
  platformFee: number;
  cleanerPayout: number;
  fixedCosts: number;
  netProfitIfBooked: number;
  expectedNetValue: number;
  deltaExpectedVsCurrent: number;
}

export interface CompetitorSummary {
  totalComps: number;
  vacantComps: number;
  bookedComps: number;
  avgVacantPrice: number;
  medianCompPrice: number;
  lowerRangePrice: number;
  upperRangePrice: number;
  cheapestNeighborPrice: number;
  cheapestNeighborName: string;
  undercuttingCompsCount: number;
}

export interface AgentDecision {
  status: 'ALERT' | 'UPSIDE' | 'OK';
  direction: 'drop' | 'raise' | 'hold';
  recommendedPrice: number;
  effectiveFloorPrice: number;
  priceDelta: number;
  percentDelta: number;
  confidenceScore: number;
  primaryTriggerRule: string;
  headline: string;
  reasoning: string;
  neighborGapAnalysis: string;
  recommendedPromotions: AirbnbPromotion[];
  competitorSummary: CompetitorSummary;
  revenueProjection: {
    atRiskGross: number;
    currentScenario: RevenueScenario;
    recommendedScenario: RevenueScenario;
    expectedValueGain: number;
  };
  recommendedActions: string[];
  projectedBookingProbability: {
    atCurrentPrice: number;
    atRecommendedPrice: number;
  };
  source: 'deterministic' | 'gemini';
  timestamp: string;
}

export const NotificationChannelSchema = z.enum([
  'telegram',
  'whatsapp',
  'twilio_sms',
  'browser',
]);

export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  channel: NotificationChannelSchema,
  recipient: z.string(),
  propertyNickname: z.string(),
  message: z.string(),
  delivered: z.boolean(),
  status: z.enum(['sent', 'pending', 'failed']),
});

export type NotificationLog = z.infer<typeof NotificationLogSchema>;

export interface ChatSuggestedAction {
  type: 'set_price' | 'run_promo';
  value: number;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedAction?: ChatSuggestedAction;
}

export const AiSettingsSchema = z.object({
  mode: z.enum(['auto', 'local_only']),
  customApiKey: z.string().default(''),
  soundEnabled: z.boolean().default(true),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;

export type ActiveWorkspaceTab = 'overview' | 'comps' | 'revenue' | 'rules';
