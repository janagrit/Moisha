import React from 'react';
import { HostProperty, MarketOverviewStats } from '../types';

interface MarketOverviewStripProps {
  property: HostProperty;
  overview: MarketOverviewStats;
  excludedCount: number;
}

export const MarketOverviewStrip: React.FC<MarketOverviewStripProps> = ({
  property,
  overview,
  excludedCount,
}) => {
  const vsAvgText =
    overview.myPriceVsAverageDollar === null
      ? '—'
      : overview.myPriceVsAverageDollar === 0
        ? 'At avg'
        : overview.myPriceVsAverageDollar > 0
          ? `+$${overview.myPriceVsAverageDollar}`
          : `-$${Math.abs(overview.myPriceVsAverageDollar)}`;

  const vsAvgSubtext =
    overview.competitorAveragePrice === null
      ? 'No comps yet'
      : overview.myPriceVsAveragePercent === null
        ? `$${overview.competitorAveragePrice}/nt avg`
        : `${overview.myPriceVsAveragePercent > 0 ? '+' : ''}${overview.myPriceVsAveragePercent}% vs $${overview.competitorAveragePrice} avg`;

  const vsAvgColor =
    overview.myPriceVsAveragePercent === null
      ? 'text-slate-900'
      : overview.myPriceVsAveragePercent > 12
        ? 'text-amber-700'
        : overview.myPriceVsAveragePercent < -12
          ? 'text-blue-700'
          : 'text-slate-900';

  const minPrice = overview.cheapestComparable?.nightlyPrice ?? null;
  const maxPrice = overview.mostExpensiveComparable?.nightlyPrice ?? null;
  const avgPrice = overview.competitorAveragePrice;
  const myPrice = property.nightlyPrice;

  const showPositionBar =
    minPrice !== null &&
    maxPrice !== null &&
    avgPrice !== null &&
    myPrice !== null &&
    overview.comparableCount >= 2;

  let avgPosPct = 50;
  let myPosPct = 50;
  if (showPositionBar && minPrice !== null && maxPrice !== null && avgPrice !== null && myPrice !== null) {
    const scaleMin = Math.min(minPrice, myPrice) - 10;
    const scaleMax = Math.max(maxPrice, myPrice) + 10;
    const span = Math.max(1, scaleMax - scaleMin);
    avgPosPct = Math.min(92, Math.max(8, ((avgPrice - scaleMin) / span) * 100));
    myPosPct = Math.min(96, Math.max(4, ((myPrice - scaleMin) / span) * 100));
  }

  return (
    <section aria-label="Market overview" className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="surface min-w-0 p-3.5">
          <span className="block text-[11px] font-medium text-slate-500">
            Comparable {property.bedrooms}BRs
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tabular text-xl font-bold text-slate-900">
              {overview.comparableCount}
            </span>
            {overview.changesSinceLastCheck > 0 && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 tabular">
                {overview.changesSinceLastCheck} moved
              </span>
            )}
          </div>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {excludedCount > 0
              ? `${excludedCount} non-${property.bedrooms}BR filtered`
              : `${property.bedrooms}-bed entire homes`}
          </span>
        </div>

        <div className="surface min-w-0 p-3.5">
          <span className="block text-[11px] font-medium text-slate-500">
            My rate vs. avg
          </span>
          <div className={`mt-1 tabular text-xl font-bold ${vsAvgColor}`}>{vsAvgText}</div>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">{vsAvgSubtext}</span>
        </div>

        <div className="surface min-w-0 p-3.5">
          <span className="block text-[11px] font-medium text-slate-500">Cheapest comp</span>
          <div className="mt-1 tabular text-xl font-bold text-slate-900">
            {overview.cheapestComparable ? `$${overview.cheapestComparable.nightlyPrice}` : '—'}
          </div>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {overview.cheapestComparable ? overview.cheapestComparable.name : 'Unavailable'}
          </span>
        </div>

        <div className="surface min-w-0 p-3.5">
          <span className="block text-[11px] font-medium text-slate-500">Highest comp</span>
          <div className="mt-1 tabular text-xl font-bold text-slate-900">
            {overview.mostExpensiveComparable
              ? `$${overview.mostExpensiveComparable.nightlyPrice}`
              : '—'}
          </div>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {overview.mostExpensiveComparable
              ? overview.mostExpensiveComparable.name
              : 'Unavailable'}
          </span>
        </div>
      </div>

      {showPositionBar && (
        <div className="surface px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-[11px] tabular">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              Avg: <strong className="text-slate-900">${avgPrice}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
              You: <strong className="text-slate-900">${myPrice}</strong>
            </span>
          </div>

          <div className="relative h-2 w-full rounded-full bg-slate-100">
            <div
              style={{ left: `${avgPosPct}%` }}
              className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-slate-400"
            />
            <div
              style={{ left: `${myPosPct}%` }}
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow-xs"
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-slate-400 tabular">
            <span>Low ${minPrice}</span>
            <span>High ${maxPrice}</span>
          </div>
        </div>
      )}
    </section>
  );
};
