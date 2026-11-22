import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Globe, ExternalLink, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  PropertyHouse,
  AgentDecision,
  LiveMarketScanResult,
  AiSettings,
  sanitizeExternalUrl,
} from '../types';
import { buildFallbackMarketGrounding } from '../services/pricingEngine';
import { scanNeighborhoodMarket } from '../services/aiService';

interface LiveMarketGroundingCardProps {
  house: PropertyHouse;
  decision: AgentDecision;
  aiSettings: AiSettings;
  proxyAvailable: boolean;
}

export const LiveMarketGroundingCard: React.FC<LiveMarketGroundingCardProps> = ({
  house,
  decision,
  aiSettings,
  proxyAvailable,
}) => {
  const [loading, setLoading] = useState(false);
  const [liveResult, setLiveResult] = useState<LiveMarketScanResult | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fallbackResult = useMemo(
    () => buildFallbackMarketGrounding(house, decision, decision.timestamp),
    [house, decision],
  );

  const result = liveResult || fallbackResult;

  const handleScan = async () => {
    setLoading(true);
    try {
      const scan = await scanNeighborhoodMarket(house, decision, aiSettings, proxyAvailable);
      if (mountedRef.current) {
        setLiveResult(scan);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <section aria-label="Neighborhood market intelligence" className="card p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-moisha-sky text-moisha-royal">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-bold text-moisha-navy sm:text-xl">
                Local Submarket Research ({house.zipCode})
              </h3>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase ${
                  result.isLiveGrounded
                    ? 'border border-blue-200 bg-moisha-sky text-moisha-royal'
                    : 'border border-moisha-border bg-moisha-sand text-moisha-muted'
                }`}
              >
                {result.isLiveGrounded ? 'Google Search Grounded' : 'Neighborhood Baseline'}
              </span>
            </div>
            <p className="text-sm text-moisha-muted">
              Weekday vs. weekend ADR benchmarks for <strong>{house.neighborhood}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleScan()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-moisha-royal px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:bg-blue-700 disabled:opacity-50 sm:self-auto"
        >
          {loading ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin" />
              <span>Scanning submarket...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Market Data</span>
            </>
          )}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-moisha-border bg-moisha-sand/70 p-4">
          <span className="text-xs font-bold text-moisha-muted uppercase">
            Typical Weekday Range
          </span>
          <div className="mt-1 text-2xl font-extrabold text-moisha-navy">
            {result.weekdayRange}
          </div>
        </div>
        <div className="rounded-xl border border-moisha-border bg-moisha-sand/70 p-4">
          <span className="text-xs font-bold text-moisha-muted uppercase">
            Typical Weekend Range
          </span>
          <div className="mt-1 text-2xl font-extrabold text-moisha-navy">
            {result.weekendRange}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-moisha-border bg-moisha-sand p-5 text-sm leading-relaxed text-moisha-navy sm:text-base">
        <div className="mb-2.5 flex items-center justify-between border-b border-moisha-border pb-2.5 text-xs text-moisha-muted sm:text-sm">
          <span className="flex items-center gap-1.5 font-bold text-moisha-royal">
            <CheckCircle2 className="h-4 w-4" />
            Submarket Summary
          </span>
          <span>Scanned {result.scannedAt}</span>
        </div>
        <p className="whitespace-pre-wrap">{result.summary}</p>
      </div>

      {result.sources.length > 0 && (
        <div className="mt-5">
          <span className="mb-2.5 block text-xs font-bold text-moisha-muted uppercase">
            Reference Links
          </span>
          <div className="flex flex-wrap gap-2.5">
            {result.sources.map((src, idx) => (
              <a
                key={`${src.uri}-${idx}`}
                href={sanitizeExternalUrl(src.uri)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-moisha-border bg-white px-3.5 py-2 text-sm font-medium text-moisha-navy transition-colors hover:bg-moisha-sand"
              >
                <Globe className="h-4 w-4 shrink-0 text-moisha-royal" />
                <span className="max-w-[280px] truncate">{src.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-moisha-muted" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
