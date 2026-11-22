import React, { useState } from 'react';
import { MapPin, Pencil, ExternalLink, Home, Sparkles, Loader2 } from 'lucide-react';
import {
  HostProperty,
  MarketOverviewStats,
  PROPERTY_TYPE_LABELS,
  sanitizeExternalUrl,
} from '../types';

interface MyPropertyCardProps {
  property: HostProperty;
  overview: MarketOverviewStats;
  aiSummary: string | null;
  aiAvailable: boolean;
  aiLoading: boolean;
  onRequestAiSummary: () => void;
  onQuickSetPrice: (price: number) => void;
  onEditProperty: () => void;
}

export const MyPropertyCard: React.FC<MyPropertyCardProps> = ({
  property,
  overview,
  aiSummary,
  aiAvailable,
  aiLoading,
  onRequestAiSummary,
  onQuickSetPrice,
  onEditProperty,
}) => {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');

  const handleSaveInlinePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Math.round(Number(priceDraft));
    if (numeric > 0) {
      onQuickSetPrice(numeric);
      setPriceDraft('');
    }
  };

  const statusDot =
    overview.actionState === 'needs_attention'
      ? 'bg-amber-500'
      : overview.actionState === 'opportunity'
        ? 'bg-blue-600'
        : overview.actionState === 'aligned'
          ? 'bg-emerald-500'
          : 'bg-slate-400';

  const bathLabel =
    property.bathrooms !== null
      ? `${property.bathrooms} ${property.bathrooms === 1 ? 'bath' : 'baths'}`
      : 'Baths unavailable';

  return (
    <section aria-label="My property" className="surface overflow-hidden">
      <div className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        {/* Left: Photo + Identity */}
        <div className="flex min-w-0 items-start gap-4 sm:items-center">
          {property.photoUrl && failedPhotoUrl !== property.photoUrl ? (
            <img
              src={sanitizeExternalUrl(property.photoUrl)}
              alt={property.name}
              onError={() => setFailedPhotoUrl(property.photoUrl)}
              className="h-20 w-24 shrink-0 rounded-xl border border-slate-200 object-cover sm:h-20 sm:w-28"
            />
          ) : (
            <div
              aria-label="Property photo unavailable"
              className="flex h-20 w-24 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 sm:w-28"
            >
              <Home className="h-5 w-5" />
              <span className="mt-1 text-[11px] font-medium">No photo</span>
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                {property.name}
              </h1>
              <a
                href={sanitizeExternalUrl(property.airbnbUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open my Airbnb listing"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                <span>Airbnb</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{property.address}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                {PROPERTY_TYPE_LABELS[property.propertyType]}
              </span>
              <span>
                {property.bedrooms} {property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
              </span>
              <span className="text-slate-300">·</span>
              <span>{bathLabel}</span>
              {property.guestCapacity !== null && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{property.guestCapacity} guests</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Nightly Price + Edit */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:justify-end sm:border-t-0 sm:pt-0">
          {property.nightlyPrice !== null ? (
            <div className="text-left sm:text-right">
              <span className="block text-xs font-medium text-slate-500">My nightly price</span>
              <div className="tabular text-2xl font-semibold tracking-tight text-slate-900">
                ${property.nightlyPrice}
                <span className="text-sm font-normal text-slate-500"> / night</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveInlinePrice} className="flex items-center gap-2">
              <label htmlFor="quick-my-price" className="sr-only">
                Set my current nightly price
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  id="quick-my-price"
                  type="number"
                  min={10}
                  required
                  placeholder="My rate/nt"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  className="h-9 w-32 rounded-xl border border-slate-200 bg-white pr-3 pl-7 text-sm font-medium text-slate-900 tabular focus:border-slate-900 focus:outline-none"
                />
              </div>
              <button type="submit" className="btn-primary h-9 px-3 text-xs">
                Set price
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={onEditProperty}
            className="btn-secondary h-9 px-3 text-xs sm:text-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit property</span>
          </button>
        </div>
      </div>

      {/* Action / Status Takeaway Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-sm sm:px-6">
        <div className="flex items-center gap-2.5 text-slate-700">
          <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
          <span>{aiSummary || overview.actionSummary}</span>
        </div>

        {aiAvailable && overview.comparableCount > 0 && (
          <button
            type="button"
            onClick={onRequestAiSummary}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{aiSummary ? 'Refresh summary' : 'Summarize market'}</span>
          </button>
        )}
      </div>
    </section>
  );
};
