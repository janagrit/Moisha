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
      ? 'No comparables yet'
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
    <section aria-label="Market overview" className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <div className="surface p-4 sm:p-5">
          <span className="block text-xs font-medium text-slate-500">
            Comparable monitored
          </span>
          <div className="mt-1.5 tabular text-2xl font-semibold text-slate-900">
            {overview.comparableCount}
          </div>
          <span className="mt-1 block truncate text-xs text-slate-500">
            {property.propertyType === 'studio'
              ? 'Studios only'
              : `${property.bedrooms}-bed entire ${property.bedrooms === 1 ? 'home' : 'homes'}`}
            {excludedCount > 0 ? ` · ${excludedCount} filtered out` : ''}
          </span>
        </div>

        <div className="surface p-4 sm:p-5">
          <span className="block text-xs font-medium text-slate-500">
            My price vs. average
          </span>
          <div className={`mt-1.5 tabular text-2xl font-semibold ${vsAvgColor}`}>
            {vsAvgText}
          </div>
          <span className="mt-1 block truncate text-xs text-slate-500">{vsAvgSubtext}</span>
        </div>

        <div className="surface p-4 sm:p-5">
          <span className="block text-xs font-medium text-slate-500">
            Cheapest comparable
          </span>
          <div className="mt-1.5 tabular text-2xl font-semibold text-slate-900">
            {overview.cheapestComparable ? `$${overview.cheapestComparable.nightlyPrice}` : '—'}
          </div>
          <span className="mt-1 block truncate text-xs text-slate-500">
            {overview.cheapestComparable ? overview.cheapestComparable.name : 'Unavailable'}
          </span>
        </div>

        <div className="surface p-4 sm:p-5">
          <span className="block text-xs font-medium text-slate-500">
            Most expensive
          </span>
          <div className="mt-1.5 tabular text-2xl font-semibold text-slate-900">
            {overview.mostExpensiveComparable
              ? `$${overview.mostExpensiveComparable.nightlyPrice}`
              : '—'}
          </div>
          <span className="mt-1 block truncate text-xs text-slate-500">
            {overview.mostExpensiveComparable
              ? overview.mostExpensiveComparable.name
              : 'Unavailable'}
          </span>
        </div>

        <div className="surface col-span-2 p-4 sm:col-span-1 sm:p-5">
          <span className="block text-xs font-medium text-slate-500">
            Price changes
          </span>
          <div className="mt-1.5 tabular text-2xl font-semibold text-slate-900">
            {overview.changesSinceLastCheck}
          </div>
          <span className="mt-1 block truncate text-xs text-slate-500">
            Since previous check
          </span>
        </div>
      </div>

      {showPositionBar && (
        <div className="surface px-5 py-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-600">
              Where your nightly rate sits vs. comparable {property.bedrooms}-bedroom entire homes
            </span>
            <div className="flex items-center gap-4 tabular text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                3BR Avg: <strong className="text-slate-900">${avgPrice}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900 ring-2 ring-slate-900/20" />
                My price: <strong className="text-slate-900">${myPrice}</strong>
              </span>
            </div>
          </div>

          <div className="relative h-2.5 w-full rounded-full bg-slate-100">
            <div
              style={{ left: `${avgPosPct}%` }}
              title={`Neighborhood average: $${avgPrice}/night`}
              className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-slate-400"
            />
            <div
              style={{ left: `${myPosPct}%` }}
              title={`Your price: $${myPrice}/night`}
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow-sm"
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-400 tabular">
            <span>Cheapest 3BR: ${minPrice}/nt</span>
            <span>Highest 3BR: ${maxPrice}/nt</span>
          </div>
        </div>
      )}
    </section>
  );
};
