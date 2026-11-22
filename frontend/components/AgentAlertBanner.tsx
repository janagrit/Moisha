import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  MapPin,
  Tag,
  Bell,
  Copy,
  Check,
  Download,
  FileText,
  ExternalLink,
  Plus,
  Info,
} from 'lucide-react';
import {
  AgentDecision,
  PropertyHouse,
  AirbnbPromotion,
  ListingComp,
  sanitizeExternalUrl,
} from '../types';
import {
  buildAirbnbMapSearchUrl,
  buildVrboSearchUrl,
  buildGoogleRentalsUrl,
} from '../services/addressService';
import { downloadCsvReport, downloadHtmlProofReport } from '../services/reportExporter';

interface AgentAlertBannerProps {
  decision: AgentDecision;
  house: PropertyHouse;
  onApplyPriceChange: (newPrice: number) => void;
  onApplyPromotion: (promo: AirbnbPromotion) => void;
  onDispatchReminder: () => void;
  onLogVerifiedComp: (comp: Omit<ListingComp, 'id'>) => void;
}

export const AgentAlertBanner: React.FC<AgentAlertBannerProps> = ({
  decision,
  house,
  onApplyPriceChange,
  onApplyPromotion,
  onDispatchReminder,
  onLogVerifiedComp,
}) => {
  const isAlert = decision.status === 'ALERT';
  const isUpside = decision.status === 'UPSIDE';
  const topPromo = decision.recommendedPromotions[0];
  const hasVerifiedProof = decision.competitorSummary.verifiedCompsCount > 0;

  const [copied, setCopied] = useState(false);
  const [showMathProof, setShowMathProof] = useState(false);

  // Quick inline verified comp proof form
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [compBooked, setCompBooked] = useState(false);
  const [compUrl, setCompUrl] = useState('');

  const airbnbMapUrl = buildAirbnbMapSearchUrl(house);
  const vrboUrl = buildVrboSearchUrl(house);
  const googleRentalsUrl = buildGoogleRentalsUrl(house);

  const handleCopySummary = async () => {
    const proofTag = hasVerifiedProof
      ? `Verified (${decision.competitorSummary.verifiedCompsCount} logged listings)`
      : 'Regional Baseline Estimate';
    const summaryText = `Moisha Pricing Plan — ${house.nickname} (${house.address})\n• Window: ${house.unbookedDaysCount} nights (${house.unbookedStartDate} to ${house.unbookedEndDate})\n• Current Rate: $${house.currentPrice}/nt → Recommended: $${decision.recommendedPrice}/nt (Floor: $${decision.effectiveFloorPrice}/nt)\n• Data Source: ${proofTag}\n• Live Airbnb Check: ${airbnbMapUrl}\n• Why: ${decision.headline}`;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleQuickLogComp = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Math.round(Number(compPrice));
    if (!numericPrice || numericPrice < 30) return;

    const label = compName.trim() || `Verified ${house.bedrooms}BR Neighbor`;
    onLogVerifiedComp({
      name: label,
      address: label,
      airbnbUrl: sanitizeExternalUrl(compUrl.trim() || airbnbMapUrl, airbnbMapUrl),
      bedrooms: house.bedrooms,
      bathrooms: house.bathrooms,
      rating: 4.9,
      reviewsCount: 50,
      currentPrice: numericPrice,
      originalPrice: numericPrice,
      isBooked: compBooked,
      distanceMiles: 0.15,
      superhost: true,
      isVerified: true,
      verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priceHistory: [{ date: 'Verified Today', price: numericPrice }],
    });

    setCompName('');
    setCompPrice('');
    setCompUrl('');
    setCompBooked(false);
  };

  const containerStyle = isAlert
    ? 'border-amber-300 bg-gradient-to-br from-[#FFFDF9] via-[#FAF6ED] to-[#F5ECE0]'
    : isUpside
      ? 'border-blue-300 bg-gradient-to-br from-[#F8FAFF] via-white to-[#EFF4FF]'
      : 'border-emerald-300 bg-gradient-to-br from-[#F4FAF6] via-white to-[#ECFDF5]';

  const statusBadgeStyle = isAlert
    ? 'border-amber-300 bg-moisha-butter text-moisha-amber'
    : isUpside
      ? 'border-blue-200 bg-moisha-sky text-moisha-royal'
      : 'border-emerald-200 bg-moisha-mint text-moisha-green';

  const formattedDelta =
    decision.priceDelta > 0
      ? `+$${decision.priceDelta}`
      : decision.priceDelta < 0
        ? `-$${Math.abs(decision.priceDelta)}`
        : '$0';

  const { currentScenario, recommendedScenario } = decision.revenueProjection;

  return (
    <section
      aria-label="Moisha pricing recommendation"
      className={`rounded-3xl border p-6 shadow-sm transition-all sm:p-8 ${containerStyle}`}
    >
      {/* Top Status & Proof Badge Row */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`rounded-full border px-3.5 py-1 text-xs font-bold tracking-wide uppercase ${statusBadgeStyle}`}
            >
              {isAlert
                ? 'Action Needed · Undercut Alert'
                : isUpside
                  ? 'Revenue Opportunity · Raise Rate'
                  : 'Market Aligned · Hold Steady'}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                hasVerifiedProof
                  ? 'border-emerald-300 bg-moisha-mint text-moisha-green'
                  : 'border-amber-300 bg-moisha-butter text-moisha-amber'
              }`}
            >
              {hasVerifiedProof
                ? `✓ Proof: ${decision.competitorSummary.verifiedCompsCount} Verified Listing(s)`
                : '⚠️ Unverified Regional Estimate — Verify Comps Below'}
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-moisha-navy sm:text-3xl">
            {decision.headline}
          </h1>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadHtmlProofReport(house, decision)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-white px-3.5 py-2 text-sm font-bold text-moisha-navy transition-colors hover:bg-moisha-sand"
          >
            <FileText className="h-4 w-4 text-moisha-royal" />
            <span>Download Proof Report</span>
          </button>
          <button
            type="button"
            onClick={() => downloadCsvReport(house, decision)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-white px-3.5 py-2 text-sm font-bold text-moisha-navy transition-colors hover:bg-moisha-sand"
          >
            <Download className="h-4 w-4 text-moisha-green" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Property Strip */}
      <div className="mb-6 flex flex-col justify-between gap-2 rounded-2xl border border-moisha-border bg-white/90 px-4 py-3.5 text-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-moisha-navy">
          <MapPin className="h-4 w-4 shrink-0 text-moisha-amber" />
          <span>
            <strong>{house.address}</strong> · {house.bedrooms} BR / {house.bathrooms} BA
          </span>
        </div>
        {!house.isBooked && house.unbookedDaysCount > 0 ? (
          <span className="font-bold text-moisha-amber">
            {house.unbookedDaysCount} Empty Nights ({house.unbookedStartDate.slice(5)}–{house.unbookedEndDate.slice(5)}) · ${decision.revenueProjection.atRiskGross} Gross Window
          </span>
        ) : (
          <span className="font-bold text-moisha-green">Window Fully Booked</span>
        )}
      </div>

      {/* 4 KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-moisha-border bg-white p-5">
          <span className="text-xs font-bold tracking-wide text-moisha-muted uppercase">
            Your Current Rate
          </span>
          <div className="mt-1.5 text-3xl font-extrabold text-moisha-navy">
            ${house.currentPrice}
            <span className="text-sm font-normal text-moisha-muted">/night</span>
          </div>
          <div className="mt-1.5 text-sm font-medium text-moisha-muted">
            {house.isBooked || house.unbookedDaysCount === 0
              ? 'Calendar booked'
              : `${house.unbookedDaysCount} unbooked nights ahead`}
          </div>
        </div>

        <div className="rounded-2xl border border-moisha-border bg-white p-5">
          <span className="text-xs font-bold tracking-wide text-moisha-muted uppercase">
            {isUpside
              ? hasVerifiedProof
                ? 'Verified Median ✓'
                : 'Est. Submarket Median'
              : hasVerifiedProof
                ? 'Cheapest Verified Comp ✓'
                : 'Est. Submarket Low (Unverified)'}
          </span>
          <div className="mt-1.5 text-3xl font-extrabold text-moisha-navy">
            $
            {isUpside
              ? decision.competitorSummary.medianCompPrice
              : decision.competitorSummary.cheapestNeighborPrice}
            <span className="text-sm font-normal text-moisha-muted">/night</span>
          </div>
          <div className="mt-1.5 text-sm font-medium">
            {hasVerifiedProof ? (
              <a
                href={sanitizeExternalUrl(decision.competitorSummary.cheapestNeighborUrl, airbnbMapUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-moisha-royal hover:underline"
              >
                <span className="truncate">{decision.competitorSummary.cheapestNeighborName}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <span className="text-moisha-amber">
                Statistical estimate · Verify on map below
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-moisha-royal bg-white p-5">
          <span className="text-xs font-bold tracking-wide text-moisha-royal uppercase">
            Moisha Recommended
          </span>
          <div className="mt-1.5 flex items-baseline gap-2 text-3xl font-extrabold text-moisha-royal">
            <span>${decision.recommendedPrice}</span>
            <span className="text-sm font-normal text-moisha-muted">/night</span>
            {decision.priceDelta !== 0 && (
              <span
                className={`rounded-md px-2 py-0.5 text-sm font-bold ${
                  decision.priceDelta > 0
                    ? 'bg-moisha-mint text-moisha-green'
                    : 'bg-moisha-sky text-moisha-royal'
                }`}
              >
                {formattedDelta}
              </span>
            )}
          </div>
          <div className="mt-1.5 text-sm font-medium text-moisha-muted">
            Safety Floor: ${decision.effectiveFloorPrice}/nt
          </div>
        </div>

        <div className="rounded-2xl border border-moisha-border bg-white p-5">
          <span className="text-xs font-bold tracking-wide text-moisha-muted uppercase">
            Booking Odds &amp; Net Lift
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl font-bold text-moisha-muted">
              {decision.projectedBookingProbability.atCurrentPrice}%
            </span>
            <span className="text-sm text-moisha-muted">→</span>
            <span className="text-3xl font-extrabold text-moisha-green">
              {decision.projectedBookingProbability.atRecommendedPrice}%
            </span>
          </div>
          <div className="mt-1.5 text-sm font-semibold text-moisha-green">
            {decision.revenueProjection.expectedValueGain >= 0
              ? `+$${decision.revenueProjection.expectedValueGain} expected net gain`
              : `$${decision.revenueProjection.recommendedScenario.netProfitIfBooked} net if booked`}
          </div>
        </div>
      </div>

      {/* Live Map Proof & Quick Verified Comp Logger */}
      <div className="mb-6 rounded-2xl border border-blue-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-moisha-navy sm:text-lg">
              🔎 Proof &amp; Live Neighbor Verification
            </h2>
            <p className="text-sm text-moisha-muted">
              {hasVerifiedProof
                ? `Backed by ${decision.competitorSummary.verifiedCompsCount} host-verified listing(s). Add more neighbors or open the live map anytime.`
                : 'Airbnb does not allow silent background scraping from a browser—click 1 below to view real live rates on your block, then log 1–3 neighbors to lock in verified proof:'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMathProof((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-moisha-sand px-3.5 py-2 text-sm font-bold text-moisha-navy hover:bg-white"
          >
            <Info className="h-4 w-4 text-moisha-royal" />
            <span>{showMathProof ? 'Hide Math Proof' : 'Show Math & Formula Proof'}</span>
          </button>
        </div>

        {/* Step 1: Live Map Deep Links */}
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <a
            href={airbnbMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-moisha-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-950"
          >
            <span>
              1. Open Live Airbnb Map ({house.bedrooms}BR · {house.unbookedStartDate.slice(5)}–{house.unbookedEndDate.slice(5)})
            </span>
            <ExternalLink className="h-4 w-4" />
          </a>

          <a
            href={vrboUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-moisha-sand px-3.5 py-2.5 text-sm font-bold text-moisha-navy hover:bg-white"
          >
            <span>Check Vrbo</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <a
            href={googleRentalsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-moisha-sand px-3.5 py-2.5 text-sm font-bold text-moisha-navy hover:bg-white"
          >
            <span>Google Rentals</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Step 2: Quick Inline Log Verified Comp */}
        <form
          onSubmit={handleQuickLogComp}
          className="grid grid-cols-1 gap-2.5 rounded-xl border border-moisha-border bg-moisha-sand/70 p-3.5 sm:grid-cols-12"
        >
          <label className="sm:col-span-4">
            <span className="mb-1 block text-xs font-bold text-moisha-navy">
              2. Real Neighbor Name / Street
            </span>
            <input
              type="text"
              placeholder="e.g. Neighbor 3BR Rowhome"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              className="field min-h-10 text-sm"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-moisha-navy">
              Price ($/nt) *
            </span>
            <input
              type="number"
              required
              min={30}
              placeholder="215"
              value={compPrice}
              onChange={(e) => setCompPrice(e.target.value)}
              className="field min-h-10 text-sm font-bold"
            />
          </label>

          <label className="sm:col-span-3">
            <span className="mb-1 block text-xs font-bold text-moisha-navy">
              Airbnb Listing URL (Proof)
            </span>
            <input
              type="url"
              placeholder="https://www.airbnb.com/rooms/..."
              value={compUrl}
              onChange={(e) => setCompUrl(e.target.value)}
              className="field min-h-10 text-sm"
            />
          </label>

          <div className="flex items-end gap-2 sm:col-span-3">
            <button
              type="button"
              aria-pressed={compBooked}
              onClick={() => setCompBooked((b) => !b)}
              className={`min-h-10 rounded-xl border px-3 text-xs font-bold ${
                compBooked
                  ? 'border-emerald-300 bg-moisha-mint text-moisha-green'
                  : 'border-moisha-border bg-white text-moisha-navy'
              }`}
            >
              {compBooked ? 'Booked' : 'Vacant'}
            </button>
            <button
              type="submit"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-moisha-royal px-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Verify</span>
            </button>
          </div>
        </form>

        {/* Expandable Exact Formula & Proof Audit */}
        {showMathProof && (
          <div className="mt-4 space-y-2.5 rounded-xl border border-moisha-border bg-moisha-sand p-4 text-sm text-moisha-navy">
            <div className="font-extrabold text-moisha-navy">
              Exact Calculation Audit
            </div>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Data Source:</strong>{' '}
                {hasVerifiedProof
                  ? `${decision.competitorSummary.verifiedCompsCount} host-verified neighbor listing(s) (range $${decision.competitorSummary.lowerRangePrice}–$${decision.competitorSummary.upperRangePrice}/nt, vacant avg $${decision.competitorSummary.avgVacantPrice}/nt).`
                  : `Independent ${house.neighborhood} ${house.bedrooms}BR statistical baseline (P25 $${decision.competitorSummary.lowerRangePrice} / Median $${decision.competitorSummary.medianCompPrice} / P75 $${decision.competitorSummary.upperRangePrice}).`}
              </li>
              <li>
                <strong>Target Rate Formula:</strong>{' '}
                <code>
                  max(Safety Floor ${decision.effectiveFloorPrice}, Competitive Benchmark $
                  {decision.direction === 'raise'
                    ? decision.competitorSummary.medianCompPrice
                    : Math.min(
                        decision.competitorSummary.cheapestNeighborPrice,
                        decision.competitorSummary.avgVacantPrice,
                      )}
                  ) = ${decision.recommendedPrice}/night
                </code>
              </li>
              <li>
                <strong>Net Profit at Current (${currentScenario.nightlyRate}/nt × {currentScenario.nights} nts):</strong>{' '}
                Room ${currentScenario.grossRoomRevenue} + Clean ${currentScenario.cleaningFeeRevenue} − Host Fee ${currentScenario.platformFee} − Cleaner ${currentScenario.cleanerPayout} − Fixed ${currentScenario.fixedCosts} ={' '}
                <strong>${currentScenario.netProfitIfBooked} net</strong> ({currentScenario.bookingProbability}% odds →{' '}
                <strong>${currentScenario.expectedNetValue} expected value</strong>).
              </li>
              <li>
                <strong>Net Profit at Moisha Target (${recommendedScenario.nightlyRate}/nt × {recommendedScenario.nights} nts):</strong>{' '}
                Room ${recommendedScenario.grossRoomRevenue} + Clean ${recommendedScenario.cleaningFeeRevenue} − Host Fee ${recommendedScenario.platformFee} − Cleaner ${recommendedScenario.cleanerPayout} − Fixed ${recommendedScenario.fixedCosts} ={' '}
                <strong>${recommendedScenario.netProfitIfBooked} net</strong> ({recommendedScenario.bookingProbability}% odds →{' '}
                <strong>${recommendedScenario.expectedNetValue} expected value</strong>).
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Uncle Moisha Counsel */}
      <div className="mb-6 space-y-4 rounded-2xl border border-moisha-border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold text-moisha-navy sm:text-lg">
            🕎 Uncle Moisha&apos;s Counsel
          </span>
          <span className="text-xs font-semibold text-moisha-muted">
            {decision.source === 'gemini' ? 'Enhanced by Gemini' : 'Instant Local Advisory'}
          </span>
        </div>

        <p className="rounded-xl border border-moisha-border/80 bg-moisha-sand p-4 text-base leading-relaxed text-moisha-navy">
          &ldquo;{decision.reasoning}&rdquo;
        </p>

        <div className="rounded-xl bg-moisha-sky/70 px-4 py-3 text-sm text-moisha-navy sm:text-base">
          <strong>Comp Summary: </strong>
          {decision.neighborGapAnalysis}
        </div>

        <ul className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-3">
          {decision.recommendedActions.map((action, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-moisha-border/70 bg-moisha-sand/50 p-3.5 text-sm leading-relaxed text-moisha-navy"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moisha-navy text-xs font-bold text-white">
                {idx + 1}
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-moisha-border/80 pt-4">
        <div className="flex items-center gap-2 text-sm text-moisha-muted">
          <ShieldCheck className="h-5 w-5 shrink-0 text-moisha-green" />
          <span>
            Floor guardrail locked at <strong>${decision.effectiveFloorPrice}/nt</strong> — Moisha never recommends pricing at a loss.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleCopySummary()}
            className="btn-quiet py-2.5 text-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-moisha-green" />
                <span>Copied Plan!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-moisha-royal" />
                <span>Copy Plan</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDispatchReminder}
            className="btn-quiet py-2.5 text-sm"
          >
            <Bell className="h-4 w-4 text-moisha-amber" />
            <span>Log Team Alert</span>
          </button>

          {topPromo && house.activePromotion?.id !== topPromo.id && (
            <button
              type="button"
              onClick={() => onApplyPromotion(topPromo)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-700 active:scale-[0.98]"
            >
              <Tag className="h-4 w-4" />
              <span>
                Run {topPromo.badge} (${topPromo.effectivePrice}/nt)
              </span>
            </button>
          )}

          {house.currentPrice !== decision.recommendedPrice && (
            <button
              type="button"
              onClick={() => onApplyPriceChange(decision.recommendedPrice)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-moisha-royal px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              {decision.direction === 'raise' ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {decision.direction === 'raise' ? 'Raise' : 'Drop'} Rate to ${decision.recommendedPrice}/nt
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
