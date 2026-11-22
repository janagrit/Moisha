import React from 'react';
import { HostProperty, MarketOverviewStats } from '../types';

interface MarketOverviewStripProps {
  property: HostProperty;
  overview: MarketOverviewStats;
}

export const MarketOverviewStrip: React.FC<MarketOverviewStripProps> = ({
  property,
  overview,
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

  return (
    <section aria-label="Market overview">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <div className="surface p-4 sm:p-5">
          <span className="block text-xs font-medium text-slate-500">
            Comparable monitored
          </span>
          <div className="mt-1.5 tabular text-2xl font-semibold text-slate-900">
            {overview.comparableCount}
          </div>
          <span className="mt-1 block truncate text-xs text-slate-500">
            {property.bedrooms}-bed entire {property.bedrooms === 1 ? 'home' : 'homes'}
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
    </section>
  );
};
