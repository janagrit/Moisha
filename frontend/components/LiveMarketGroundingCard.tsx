import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { PropertyHouse, AgentDecision, LiveMarketScanResult, AiSettings } from '../types';
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
  const [result, setResult] = useState<LiveMarketScanResult>(() =>
    buildFallbackMarketGrounding(house, decision, '08:00 AM'),
  );

  useEffect(() => {
    setResult(buildFallbackMarketGrounding(house, decision));
  }, [house, decision]);

  const handleScan = async () => {
    setLoading(true);
    try {
      const scan = await scanNeighborhoodMarket(house, decision, aiSettings, proxyAvailable);
      setResult(scan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="Neighborhood market intelligence" className="card p-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moisha-sky text-moisha-royal">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-moisha-navy">
                Local Submarket Research ({house.zipCode})
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  result.isLiveGrounded
                    ? 'border border-blue-200 bg-moisha-sky text-moisha-royal'
                    : 'border border-moisha-border bg-moisha-sand text-moisha-muted'
                }`}
              >
                {result.isLiveGrounded ? 'Google Search Grounded' : 'Neighborhood Baseline'}
              </span>
            </div>
            <p className="text-xs text-moisha-muted">
              Weekday vs. weekend ADR benchmarks for <strong>{house.neighborhood}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleScan}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-moisha-royal px-3.5 py-2 text-xs font-bold text-white transition-opacity hover:bg-blue-700 disabled:opacity-50 sm:self-auto"
        >
          {loading ? (
            <>
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              <span>Scanning submarket...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Market Data</span>
            </>
          )}
        </button>
      </div>

      {/* Weekday / Weekend Range Strip */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-moisha-border bg-moisha-sand/70 p-3.5">
          <span className="text-[11px] font-bold text-moisha-muted uppercase">
            Typical Weekday Range
          </span>
          <div className="mt-0.5 text-lg font-extrabold text-moisha-navy">
            {result.weekdayRange}
          </div>
        </div>
        <div className="rounded-xl border border-moisha-border bg-moisha-sand/70 p-3.5">
          <span className="text-[11px] font-bold text-moisha-muted uppercase">
            Typical Weekend Range
          </span>
          <div className="mt-0.5 text-lg font-extrabold text-moisha-navy">
            {result.weekendRange}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-moisha-border bg-moisha-sand p-4 text-xs leading-relaxed text-moisha-navy">
        <div className="mb-2 flex items-center justify-between border-b border-moisha-border pb-2 text-[11px] text-moisha-muted">
          <span className="flex items-center gap-1.5 font-bold text-moisha-royal">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Submarket Summary
          </span>
          <span>Scanned {result.scannedAt}</span>
        </div>
        <p className="whitespace-pre-wrap">{result.summary}</p>
      </div>

      {/* Sources */}
      {result.sources.length > 0 && (
        <div className="mt-4">
          <span className="mb-2 block text-[11px] font-bold text-moisha-muted uppercase">
            Reference Links
          </span>
          <div className="flex flex-wrap gap-2">
            {result.sources.map((src, idx) => (
              <a
                key={`${src.uri}-${idx}`}
                href={src.uri}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-white px-3 py-1.5 text-xs font-medium text-moisha-navy transition-colors hover:bg-moisha-sand"
              >
                <Globe className="h-3 w-3 shrink-0 text-moisha-royal" />
                <span className="max-w-[240px] truncate">{src.title}</span>
                <ExternalLink className="h-3 w-3 text-moisha-muted" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
