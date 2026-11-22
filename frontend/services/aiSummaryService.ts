import { z } from 'zod';
import { HostProperty, MarketOverviewStats, PriceChangeEvent } from '../types';

const SummaryResponseSchema = z.object({
  summary: z.string().min(5).max(320),
});

export async function checkAiAvailable(): Promise<boolean> {
  try {
    const res = await fetch('./api/gemini/status', {
      method: 'GET',
      signal:
        typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(3_000)
          : undefined,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { available?: boolean };
    return Boolean(data.available);
  } catch {
    return false;
  }
}

export async function fetchConciseMarketSummary(
  property: HostProperty,
  overview: MarketOverviewStats,
  recentChanges: PriceChangeEvent[],
): Promise<string | null> {
  if (overview.comparableCount === 0) return null;

  const prompt = `Summarize this Airbnb competitor market state in ONE clear, objective sentence (max 28 words, no slang, no hype).
My property: "${property.name}" (${property.bedrooms} bedrooms, $${property.nightlyPrice ?? 'unset'}/night) in ${property.neighborhood}.
Comparable ${property.bedrooms}-bedroom entire homes monitored: ${overview.comparableCount}.
Competitor average: $${overview.competitorAveragePrice}/night (range $${overview.cheapestComparable?.nightlyPrice}–$${overview.mostExpensiveComparable?.nightlyPrice}/night).
Recent competitor price changes: ${JSON.stringify(
    recentChanges.slice(0, 5).map((c) => ({
      name: c.competitorName,
      from: c.previousPrice,
      to: c.newPrice,
      pct: c.percentChange,
    })),
  )}.
Return JSON: {"summary": "..."}`;

  try {
    const res = await fetch('./api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
      signal:
        typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(10_000)
          : undefined,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText =
      body.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = SummaryResponseSchema.safeParse(JSON.parse(cleaned));
    return parsed.success ? parsed.data.summary : null;
  } catch {
    return null;
  }
}
