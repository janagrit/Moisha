import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Home,
  ExternalLink,
  RefreshCw,
  Plus,
  Mail,
} from 'lucide-react';
import { PriceChangeEvent, sanitizeExternalUrl } from '../types';
import {
  formatShortDate,
  formatTimestamp,
  isDailyCheckDue,
} from '../services/monitoringService';

interface PriceChangesFeedProps {
  changes: PriceChangeEvent[];
  hasCompetitors: boolean;
  isPrototype: boolean;
  isSimulatingCheck: boolean;
  lastCheckedAt: string | null;
  onRunPrototypeCheck: () => void;
  onOpenCheckModal: () => void;
  onOpenEmailModal: () => void;
  onOpenAddCompetitor: () => void;
}

export const PriceChangesFeed: React.FC<PriceChangesFeedProps> = ({
  changes,
  hasCompetitors,
  isPrototype,
  isSimulatingCheck,
  lastCheckedAt,
  onRunPrototypeCheck,
  onOpenCheckModal,
  onOpenEmailModal,
  onOpenAddCompetitor,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const checkDue = hasCompetitors && isDailyCheckDue(lastCheckedAt);

  return (
    <section aria-label="Competitor price changes" className="surface p-6 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Competitor price changes
            </h2>
            {changes.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 tabular">
                {changes.length}
              </span>
            )}
            {checkDue && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Daily check due
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Observed nightly rate drops and increases · Last check:{' '}
            <span className="font-medium text-slate-700">{formatTimestamp(lastCheckedAt)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {changes.length > 0 && (
            <button
              type="button"
              onClick={onOpenEmailModal}
              className="btn-secondary h-9 px-3 text-xs sm:text-sm"
            >
              <Mail className="h-3.5 w-3.5 text-slate-500" />
              <span>Preview email alert</span>
            </button>
          )}

          {hasCompetitors && (
            <button
              type="button"
              onClick={isPrototype ? onRunPrototypeCheck : onOpenCheckModal}
              disabled={isSimulatingCheck}
              className="btn-secondary h-9 px-3 text-xs sm:text-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSimulatingCheck ? 'animate-spin' : ''}`} />
              <span>{isPrototype ? 'Simulate next check' : 'Record price check'}</span>
            </button>
          )}
        </div>
      </div>

      {changes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            {hasCompetitors
              ? 'No competitor price changes detected yet'
              : 'No competitors monitored yet'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
            {hasCompetitors
              ? 'Run a daily price check to compare today’s rates against stored previous prices. Every increase or decrease appears here with timestamps.'
              : 'Paste or add comparable Airbnb listings in your neighborhood to start tracking their nightly rate movements.'}
          </p>
          <div className="mt-4">
            {hasCompetitors ? (
              <button
                type="button"
                onClick={onOpenCheckModal}
                className="btn-primary h-9 px-4 text-xs sm:text-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Check competitor prices</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddCompetitor}
                className="btn-primary h-9 px-4 text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add or paste competitors</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {changes.map((item) => {
            const isDecrease = item.deltaAmount < 0;
            const absPct = Math.abs(item.percentChange).toFixed(1);
            const showImg = item.competitorPhotoUrl && !failedImages[item.id];

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                {/* Left: Photo + Name + Bedrooms */}
                <div className="flex min-w-0 items-center gap-3.5">
                  {showImg ? (
                    <img
                      src={sanitizeExternalUrl(item.competitorPhotoUrl)}
                      alt={item.competitorName}
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                      }
                      className="h-12 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                      <Home className="h-4 w-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <a
                      href={sanitizeExternalUrl(item.airbnbUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-slate-900 hover:underline"
                    >
                      <span className="truncate">{item.competitorName}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                    </a>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {item.bedrooms} {item.bedrooms === 1 ? 'bedroom' : 'bedrooms'} ·{' '}
                      {formatShortDate(item.changedAt)}
                    </div>
                  </div>
                </div>

                {/* Right: Previous -> New Price + % Badge */}
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex items-baseline gap-2 text-sm tabular">
                    <span className="text-slate-400 line-through">${item.previousPrice}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-base font-semibold text-slate-900">
                      ${item.newPrice}
                    </span>
                    <span className="text-xs text-slate-500">/ night</span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tabular ${
                      isDecrease
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isDecrease ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" />
                    )}
                    <span>{isDecrease ? `-${absPct}%` : `+${absPct}%`}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
