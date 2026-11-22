import React from 'react';
import { MapPin, TrendingUp, Star } from 'lucide-react';
import { PropertyHouse, AgentDecision } from '../types';

interface MarketChartsProps {
  house: PropertyHouse;
  decision: AgentDecision;
}

export const MarketCharts: React.FC<MarketChartsProps> = ({ house, decision }) => {
  const { competitorSummary } = decision;
  const allValues = [
    house.currentPrice,
    decision.recommendedPrice,
    decision.effectiveFloorPrice,
    competitorSummary.lowerRangePrice,
    competitorSummary.medianCompPrice,
    competitorSummary.upperRangePrice,
    ...house.comps.map((c) => c.currentPrice),
  ];
  const maxPrice = Math.max(100, ...allValues) * 1.08;

  const pct = (value: number) => `${Math.min(100, Math.max(10, Math.round((value / maxPrice) * 100)))}%`;

  const benchmarkRows = [
    {
      label: 'Similar listings (median)',
      price: competitorSummary.medianCompPrice,
      barClass: 'bg-slate-300',
      textClass: 'text-moisha-navy',
    },
    {
      label: 'Lower range (25th pct)',
      price: competitorSummary.lowerRangePrice,
      barClass: 'bg-slate-200',
      textClass: 'text-moisha-muted',
    },
    {
      label: 'Upper range (75th pct)',
      price: competitorSummary.upperRangePrice,
      barClass: 'bg-slate-300',
      textClass: 'text-moisha-muted',
    },
    {
      label: 'Your current price',
      price: house.currentPrice,
      barClass: 'bg-moisha-royal',
      textClass: 'text-moisha-royal font-extrabold',
    },
    {
      label: 'Moisha target price',
      price: decision.recommendedPrice,
      barClass: decision.status === 'ALERT' ? 'bg-amber-500' : 'bg-moisha-green',
      textClass: decision.status === 'ALERT' ? 'text-moisha-amber font-extrabold' : 'text-moisha-green font-extrabold',
    },
  ];

  const liftMessage =
    decision.direction === 'raise'
      ? `Potential +${decision.percentDelta}% nightly rate ($${decision.recommendedPrice}/nt) based on ${house.neighborhood} comps`
      : decision.direction === 'drop'
        ? `Projected +$${Math.max(0, decision.revenueProjection.expectedValueGain)} expected net gain at $${decision.recommendedPrice}/nt (${decision.projectedBookingProbability.atRecommendedPrice}% booking odds)`
        : `Your $${house.currentPrice}/nt rate is aligned with ${house.neighborhood} (${competitorSummary.vacantComps} vacant, ${competitorSummary.bookedComps} booked)`;

  return (
    <section aria-label="Neighborhood price benchmark" className="card flex flex-col justify-between p-6">
      <div>
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moisha-sky text-moisha-royal">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-moisha-navy">Neighborhood Prices</h3>
              <p className="text-xs text-moisha-muted">
                {house.neighborhood} ({house.zipCode}) · {competitorSummary.totalComps} comparable listings
              </p>
            </div>
          </div>

          <span className="rounded-lg border border-emerald-200 bg-moisha-mint px-2.5 py-1 text-[11px] font-bold text-moisha-green">
            Floor ${decision.effectiveFloorPrice}
          </span>
        </div>

        {/* Summary Range Bars (Modeled on Moisha Neighborhood Card) */}
        <div className="space-y-3 rounded-2xl border border-moisha-border bg-moisha-sand/70 p-4">
          {benchmarkRows.map((row) => (
            <div key={row.label} className="grid grid-cols-12 items-center gap-3 text-xs">
              <span className={`col-span-5 truncate font-medium ${row.textClass}`}>
                {row.label}
              </span>
              <span className={`col-span-2 text-right font-bold ${row.textClass}`}>
                ${row.price}
              </span>
              <div className="col-span-5 h-3 overflow-hidden rounded-full bg-white border border-moisha-border/60">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${row.barClass}`}
                  style={{ width: pct(row.price) }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Individual Neighbor Breakdown */}
        {house.comps.length > 0 && (
          <div className="mt-5">
            <div className="mb-2.5 flex items-center justify-between text-xs">
              <span className="font-bold text-moisha-navy">Direct Neighbor Breakdown</span>
              <div className="flex items-center gap-3 text-[11px] text-moisha-muted">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Vacant
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-moisha-green" /> Booked
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {house.comps.map((comp) => (
                <div
                  key={comp.id}
                  className="rounded-xl border border-moisha-border/80 bg-white px-3 py-2 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-semibold text-moisha-navy">{comp.name}</span>
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-amber-600">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {comp.rating}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          comp.isBooked
                            ? 'bg-moisha-mint text-moisha-green'
                            : 'bg-moisha-butter text-moisha-amber'
                        }`}
                      >
                        {comp.isBooked ? 'Booked' : 'Vacant'}
                      </span>
                      <span className="w-14 text-right font-bold text-moisha-navy">
                        ${comp.currentPrice}/nt
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-moisha-sand">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        comp.isBooked ? 'bg-moisha-green' : 'bg-amber-500'
                      }`}
                      style={{ width: pct(comp.currentPrice) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Revenue Insight Pill */}
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-moisha-mint px-4 py-3 text-xs font-bold text-moisha-green">
        <TrendingUp className="h-4 w-4 shrink-0" />
        <span>{liftMessage}</span>
      </div>
    </section>
  );
};
