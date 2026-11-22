import React, { useState } from 'react';
import { TrendingDown, TrendingUp, ShieldCheck, MapPin, Tag, Bell, Copy, Check } from 'lucide-react';
import { AgentDecision, PropertyHouse, AirbnbPromotion } from '../types';

interface AgentAlertBannerProps {
  decision: AgentDecision;
  house: PropertyHouse;
  onApplyPriceChange: (newPrice: number) => void;
  onApplyPromotion: (promo: AirbnbPromotion) => void;
  onDispatchReminder: () => void;
}

export const AgentAlertBanner: React.FC<AgentAlertBannerProps> = ({
  decision,
  house,
  onApplyPriceChange,
  onApplyPromotion,
  onDispatchReminder,
}) => {
  const isAlert = decision.status === 'ALERT';
  const isUpside = decision.status === 'UPSIDE';
  const topPromo = decision.recommendedPromotions[0];
  const [copied, setCopied] = useState(false);

  const handleCopySummary = async () => {
    const summaryText = `Moisha Pricing Plan — ${house.nickname} (${house.address})\n• Window: ${house.unbookedDaysCount} nights (${house.unbookedStartDate} to ${house.unbookedEndDate})\n• Current Rate: $${house.currentPrice}/nt → Recommended: $${decision.recommendedPrice}/nt (Floor: $${decision.effectiveFloorPrice}/nt)\n• Why: ${decision.headline}`;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable in non-secure contexts
    }
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

  return (
    <section
      aria-label="Moisha pricing recommendation"
      className={`rounded-3xl border p-6 shadow-sm transition-all sm:p-8 ${containerStyle}`}
    >
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
            <span className="rounded-full border border-moisha-border bg-white px-3 py-1 text-xs font-semibold text-moisha-muted">
              {decision.primaryTriggerRule}
            </span>
          </div>
          <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight text-moisha-navy sm:text-3xl">
            {decision.headline}
          </h1>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-moisha-border bg-white/90 px-3.5 py-2 text-sm">
          <span className="text-moisha-muted">Confidence</span>
          <span className="rounded-md bg-moisha-sky px-2.5 py-0.5 font-bold text-moisha-royal">
            {decision.confidenceScore}%
          </span>
        </div>
      </div>

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
            {isUpside ? 'Neighborhood Median' : 'Cheapest Vacant Comp'}
          </span>
          <div className="mt-1.5 text-3xl font-extrabold text-moisha-navy">
            $
            {isUpside
              ? decision.competitorSummary.medianCompPrice
              : decision.competitorSummary.cheapestNeighborPrice}
            <span className="text-sm font-normal text-moisha-muted">/night</span>
          </div>
          <div className="mt-1.5 truncate text-sm font-medium text-moisha-muted">
            {isUpside
              ? `Range $${decision.competitorSummary.lowerRangePrice}–$${decision.competitorSummary.upperRangePrice}/nt`
              : decision.competitorSummary.cheapestNeighborName}
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

      <div className="mb-6 space-y-4 rounded-2xl border border-moisha-border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold text-moisha-navy sm:text-lg">
            🕎 Uncle Moisha&apos;s Counsel for {house.propertyManagerName}
          </span>
          <span className="text-xs font-semibold text-moisha-muted">
            {decision.source === 'gemini' ? 'Enhanced by Gemini' : 'Instant Local Advisory'}
          </span>
        </div>

        <p className="rounded-xl border border-moisha-border/80 bg-moisha-sand p-4 text-base leading-relaxed text-moisha-navy">
          &ldquo;{decision.reasoning}&rdquo;
        </p>

        <div className="rounded-xl bg-moisha-sky/70 px-4 py-3 text-sm text-moisha-navy sm:text-base">
          <strong>Neighbor Intel: </strong>
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
            <span>Notify {house.propertyManagerName}</span>
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
