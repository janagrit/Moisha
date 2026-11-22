import { z } from 'zod';
import {
  PropertyHouse,
  PricingRule,
  AgentDecision,
  AiSettings,
  ChatSuggestedAction,
  LiveMarketScanResult,
  GroundingSource,
  sanitizeExternalUrl,
} from '../types';
import {
  evaluatePropertyPricing,
  generateLocalChatReply,
  buildFallbackMarketGrounding,
} from './pricingEngine';

export interface GeminiBridgeStatus {
  proxyAvailable: boolean;
  model: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 15_000;

const AnalysisResponseSchema = z.object({
  headline: z.string().min(1).optional(),
  reasoning: z.string().min(1),
  neighborGapAnalysis: z.string().min(1).optional(),
  recommendedActions: z.array(z.string().min(1)).optional(),
});

const ChatResponseSchema = z.object({
  reply: z.string().min(1),
  actionType: z.enum(['set_price', 'run_promo', 'none']).optional(),
});

function createTimeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

export async function checkGeminiProxyStatus(): Promise<GeminiBridgeStatus> {
  try {
    const res = await fetch('./api/gemini/status', {
      method: 'GET',
      signal: createTimeoutSignal(4_000),
    });
    if (!res.ok) return { proxyAvailable: false, model: DEFAULT_GEMINI_MODEL };
    const data = (await res.json()) as { available?: boolean; model?: string };
    return {
      proxyAvailable: Boolean(data.available),
      model: typeof data.model === 'string' && data.model ? data.model : DEFAULT_GEMINI_MODEL,
    };
  } catch {
    return { proxyAvailable: false, model: DEFAULT_GEMINI_MODEL };
  }
}

interface GeminiCandidateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { title?: string; uri?: string };
      }>;
    };
  }>;
}

async function invokeGemini(
  payload: Record<string, unknown>,
  settings: AiSettings,
  proxyAvailable: boolean,
): Promise<GeminiCandidateResponse | null> {
  if (settings.mode === 'local_only') {
    return null;
  }

  const trimmedKey = settings.customApiKey.trim();

  if (proxyAvailable && !trimmedKey) {
    const res = await fetch('./api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Dev proxy returned ${res.status}`);
    }
    return (await res.json()) as GeminiCandidateResponse;
  }

  if (trimmedKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Gemini API returned ${res.status}`);
    }
    return (await res.json()) as GeminiCandidateResponse;
  }

  return null;
}

function extractText(resp: GeminiCandidateResponse | null): string {
  const parts = resp?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p.text === 'string' ? p.text : ''))
    .join('')
    .trim();
}

function parseValidatedJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    const parsed = schema.safeParse(JSON.parse(cleaned));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function runMoishaAnalysis(
  house: PropertyHouse,
  rules: PricingRule[],
  settings: AiSettings,
  proxyAvailable: boolean,
): Promise<AgentDecision> {
  const baseline = evaluatePropertyPricing(house, rules);

  if (settings.mode === 'local_only' || (!proxyAvailable && !settings.customApiKey.trim())) {
    return baseline;
  }

  const prompt = `You are Uncle Moisha — a warm, sharp, humorous, commercially savvy Airbnb pricing advisor helping property manager ${house.propertyManagerName}.
Analyze this short-term rental and return concise JSON matching the requested schema.

Property: "${house.nickname}" (${house.title}) at ${house.address} (${house.neighborhood}, ZIP ${house.zipCode})
Config: ${house.bedrooms} BR / ${house.bathrooms} BA
Current Rate: $${house.currentPrice}/night | Strict Floor Guardrail: $${baseline.effectiveFloorPrice}/night
Unbooked Gap: ${house.unbookedDaysCount} nights (${house.unbookedStartDate} to ${house.unbookedEndDate})
Deterministic Recommended Price: $${baseline.recommendedPrice}/night (direction: ${baseline.direction})
Neighbor Summary: ${JSON.stringify(baseline.competitorSummary)}
Neighbors: ${JSON.stringify(
    house.comps.map((c) => ({
      name: c.name,
      price: c.currentPrice,
      booked: c.isBooked,
      rating: c.rating,
    })),
  )}

Return JSON with keys:
- "headline": punchy 6-11 word headline tailored to ${house.nickname}
- "reasoning": 2-3 lively sentences in Uncle Moisha's affectionate, shrewd voice citing exact numbers and never violating the $${baseline.effectiveFloorPrice}/nt floor
- "neighborGapAnalysis": 1 crisp analytical sentence comparing ${house.nickname} to its neighbors
- "recommendedActions": array of 3 concrete, actionable steps`;

  try {
    const resp = await invokeGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.5,
        },
      },
      settings,
      proxyAvailable,
    );

    const parsed = parseValidatedJson(extractText(resp), AnalysisResponseSchema);
    if (!parsed) {
      return baseline;
    }

    return {
      ...baseline,
      headline: parsed.headline || baseline.headline,
      reasoning: parsed.reasoning,
      neighborGapAnalysis: parsed.neighborGapAnalysis || baseline.neighborGapAnalysis,
      recommendedActions:
        parsed.recommendedActions && parsed.recommendedActions.length > 0
          ? parsed.recommendedActions.slice(0, 4)
          : baseline.recommendedActions,
      source: 'gemini',
    };
  } catch {
    return baseline;
  }
}

export async function askMoishaAdvisor(
  house: PropertyHouse,
  userMessage: string,
  decision: AgentDecision,
  settings: AiSettings,
  proxyAvailable: boolean,
): Promise<{ text: string; action?: ChatSuggestedAction }> {
  const fallback = generateLocalChatReply(house, userMessage, decision);

  if (settings.mode === 'local_only' || (!proxyAvailable && !settings.customApiKey.trim())) {
    return fallback;
  }

  const prompt = `You are Uncle Moisha, a wise, warm, witty real estate & Airbnb revenue advisor talking to ${house.propertyManagerName}.
Property: ${house.nickname} (${house.address}, ${house.neighborhood} ${house.zipCode})
Current Rate: $${house.currentPrice}/nt | Floor Guardrail: $${decision.effectiveFloorPrice}/nt | Moisha Target: $${decision.recommendedPrice}/nt (${decision.direction})
Unbooked Gap: ${house.unbookedDaysCount} nights (${house.unbookedStartDate} to ${house.unbookedEndDate})
Cheapest Vacant Neighbor: $${decision.competitorSummary.cheapestNeighborPrice}/nt (${decision.competitorSummary.cheapestNeighborName})
Median Comp: $${decision.competitorSummary.medianCompPrice}/nt
Expected Net Value: $${decision.revenueProjection.currentScenario.expectedNetValue} at current vs $${decision.revenueProjection.recommendedScenario.expectedNetValue} at target.

Host asks: "${userMessage}"

Respond as JSON:
{
  "reply": "2-4 concise, helpful sentences in Uncle Moisha's voice using the exact numbers above",
  "actionType": "set_price" | "run_promo" | "none"
}`;

  try {
    const resp = await invokeGemini(
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      },
      settings,
      proxyAvailable,
    );

    const parsed = parseValidatedJson(extractText(resp), ChatResponseSchema);
    if (!parsed) return fallback;

    let action = fallback.action;
    if (parsed.actionType === 'none') {
      action = undefined;
    } else if (parsed.actionType === 'run_promo' && decision.recommendedPromotions[0]) {
      const p = decision.recommendedPromotions[0];
      action = {
        type: 'run_promo',
        value: p.effectivePrice,
        label: `Activate ${p.badge} ($${p.effectivePrice}/nt)`,
      };
    } else if (parsed.actionType === 'set_price' && decision.recommendedPrice !== house.currentPrice) {
      action = {
        type: 'set_price',
        value: decision.recommendedPrice,
        label: `Apply $${decision.recommendedPrice}/nt rate`,
      };
    }

    return { text: parsed.reply, action };
  } catch {
    return fallback;
  }
}

export async function scanNeighborhoodMarket(
  house: PropertyHouse,
  decision: AgentDecision,
  settings: AiSettings,
  proxyAvailable: boolean,
): Promise<LiveMarketScanResult> {
  const fallback = buildFallbackMarketGrounding(house, decision);

  if (settings.mode === 'local_only' || (!proxyAvailable && !settings.customApiKey.trim())) {
    return fallback;
  }

  const query = `Summarize current short-term rental / Airbnb average nightly rates (weekday vs weekend) and occupancy demand for ${house.bedrooms}-bedroom listings near ${house.address} (${house.neighborhood}, ZIP ${house.zipCode}). Keep it to 3 concise sentences with dollar ranges.`;

  try {
    const resp = await invokeGemini(
      {
        contents: [{ role: 'user', parts: [{ text: query }] }],
        tools: [{ googleSearch: {} }],
      },
      settings,
      proxyAvailable,
    );

    const text = extractText(resp);
    if (!text) return fallback;

    const chunks = resp?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = [];
    for (const chunk of chunks) {
      const rawUri = chunk.web?.uri;
      if (rawUri) {
        const safeUri = sanitizeExternalUrl(rawUri, '');
        if (safeUri) {
          sources.push({
            title:
              chunk.web?.title ||
              safeUri.replace(/^https?:\/\//, '').split('/')[0] ||
              'Market Source',
            uri: safeUri,
          });
        }
      }
    }

    return {
      summary: text,
      weekdayRange: fallback.weekdayRange,
      weekendRange: fallback.weekendRange,
      sources: sources.length > 0 ? sources.slice(0, 5) : fallback.sources,
      scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLiveGrounded: true,
    };
  } catch {
    return fallback;
  }
}
