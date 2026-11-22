import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Home,
  ExternalLink,
  RefreshCw,
  Plus,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { PriceChangeEvent, sanitizeExternalUrl } from '../types';
import {
  formatShortDate,
  formatTimestamp,
  isDailyCheckDue,
} from '../services/monitoringService';

interface PriceChangesFeedProps {
  changes: PriceChangeEvent[];
  limit?: number;
  hasCompetitors: boolean;
  isPrototype: boolean;
  isSimulatingCheck: boolean;
  lastCheckedAt: string | null;
  onRunPrototypeCheck: () => void;
  onOpenCheckModal: () => void;
  onOpenEmailModal: () => void;
  onOpenAddCompetitor: () => void;
  onSeeAllChanges?: () => void;
}

export const PriceChangesFeed: React.FC<PriceChangesFeedProps> = ({
  changes,
  limit,
  hasCompetitors,
  isPrototype,
  isSimulatingCheck,
  lastCheckedAt,
  onRunPrototypeCheck,
  onOpenCheckModal,
  onOpenEmailModal,
  onOpenAddCompetitor,
  onSeeAllChanges,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const checkDue = hasCompetitors && isDailyCheckDue(lastCheckedAt);
  const visibleChanges = limit ? changes.slice(0, limit) : changes;

  return (
    <section aria-label="Competitor price changes" className="surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Competitor price changes
            </h2>
            {changes.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 tabular">
                {changes.length}
              </span>
            )}
            {checkDue && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Check due
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Last check: <span className="font-medium text-slate-700">{formatTimestamp(lastCheckedAt)}</span>
          </p>
        </div>

        {onSeeAllChanges && changes.length > 0 ? (
          <button
            type="button"
            onClick={onSeeAllChanges}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <span>All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          changes.length > 0 && (
            <button
              type="button"
              onClick={onOpenEmailModal}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Mail className="h-3 w-3 text-slate-500" />
              <span>Preview email alert</span>
            </button>
          )
        )}
      </div>

      {visibleChanges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-7 text-center">
          <p className="text-xs font-semibold text-slate-700">
            {hasCompetitors
              ? 'No competitor price changes yet'
              : 'No competitors monitored yet'}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {hasCompetitors
              ? 'Tap Check prices to log today’s rates and spot neighbor drops.'
              : 'Add or paste nearby Airbnb listings to track daily rate changes.'}
          </p>
          <div className="mt-3">
            {hasCompetitors ? (
              <button
                type="button"
                onClick={isPrototype ? onRunPrototypeCheck : onOpenCheckModal}
                disabled={isSimulatingCheck}
                className="btn-primary h-8 px-3.5 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${isSimulatingCheck ? 'animate-spin' : ''}`} />
                <span>Check competitor prices</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAddCompetitor}
                className="btn-primary h-8 px-3.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add or paste competitors</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {visibleChanges.map((item) => {
            const isDecrease = item.deltaAmount < 0;
            const absPct = Math.abs(item.percentChange).toFixed(1);
            const showImg = item.competitorPhotoUrl && !failedImages[item.id];

            return (
              <div key={item.id} className="flex items-center justify-between gap-2.5 py-3 first:pt-1 last:pb-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  {showImg ? (
                    <img
                      src={sanitizeExternalUrl(item.competitorPhotoUrl)}
                      alt={item.competitorName}
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                      }
                      className="h-11 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                      <Home className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <a
                      href={sanitizeExternalUrl(item.airbnbUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-xs font-semibold text-slate-900 hover:underline"
                    >
                      <span className="truncate">{item.competitorName}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                    </a>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {item.bedrooms} bd · {formatShortDate(item.changedAt)}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right tabular">
                  <div className="text-xs font-semibold text-slate-900">
                    <span className="mr-1 font-normal text-slate-400 line-through">
                      ${item.previousPrice}
                    </span>
                    ${item.newPrice}
                  </div>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      isDecrease
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isDecrease ? (
                      <TrendingDown className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingUp className="h-2.5 w-2.5" />
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
