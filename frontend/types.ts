export interface ListingComp {
  id: string;
  name: string;
  address?: string;
  airbnbUrl: string;
  bedrooms: number;
  bathrooms: number;
  rating: number;
  reviewsCount: number;
  currentPrice: number;
  originalPrice: number;
  isBooked: boolean;
  distanceMiles: number;
  superhost: boolean;
  priceHistory: { date: string; price: number }[];
}

export interface AirbnbPromotion {
  id: string;
  name: string;
  badge: string; // e.g., 'Last Minute 15% Off', 'Length of Stay 20%'
  discountPercent: number;
  effectivePrice: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'recommended' | 'applied' | 'dismissed';
}

export interface PropertyHouse {
  id: string;
  nickname: string;
  title: string;
  address: string;
  neighborhood: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  currentPrice: number;
  floorPrice: number; // Host minimum safety price
  cleaningFee: number;
  unbookedDaysCount: number; // e.g. 5 days empty
  unbookedStartDate: string;
  unbookedEndDate: string;
  isBooked: boolean;
  propertyManagerName: string;
  managerPhone: string;
  activePromotion?: AirbnbPromotion | null;
  comps: ListingComp[];
}

export interface PricingRule {
  id: string;
  title: string;
  enabled: boolean;
  description: string;
  parameterName: string;
  parameterValue: number;
  unit: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface LiveMarketScanResult {
  summary: string;
  sources: GroundingSource[];
  scannedAt: string;
}

export interface AgentDecision {
  status: 'ALERT' | 'OK' | 'PASS';
  recommendedPrice: number;
  priceDelta: number;
  confidenceScore: number;
  primaryTriggerRule: string;
  reasoning: string;
  neighborGapAnalysis: string;
  recommendedPromotions: AirbnbPromotion[];
  competitorSummary: {
    totalComps: number;
    vacantComps: number;
    avgVacantPrice: number;
    cheapestNeighborPrice: number;
    undercuttingCompsCount: number;
  };
  recommendedActions: string[];
  projectedBookingProbability: {
    atCurrentPrice: number;
    atRecommendedPrice: number;
  };
  timestamp: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  channel: 'telegram' | 'twilio_sms' | 'whatsapp' | 'email';
  recipient: string;
  propertyNickname: string;
  message: string;
  delivered: boolean;
  status: 'sent' | 'pending' | 'failed';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedAction?: {
    type: 'drop_price' | 'run_promo';
    value: number;
    label: string;
  };
}
