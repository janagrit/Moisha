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

  const statusStyles =
    overview.actionState === 'needs_attention'
      ? 'border-amber-200/80 bg-amber-50/70 text-amber-950'
      : overview.actionState === 'opportunity'
        ? 'border-blue-200/80 bg-blue-50/70 text-blue-950'
        : overview.actionState === 'aligned'
          ? 'border-emerald-200/80 bg-emerald-50/70 text-emerald-950'
          : 'border-slate-200/80 bg-slate-50 text-slate-700';

  const statusDot =
    overview.actionState === 'needs_attention'
      ? 'bg-amber-500'
      : overview.actionState === 'opportunity'
        ? 'bg-blue-600'
        : overview.actionState === 'aligned'
          ? 'bg-emerald-500'
          : 'bg-slate-400';

  const bathLabel =
    property.bathrooms !== null ? `${property.bathrooms} ba` : 'Baths unavailable';

  return (
    <section aria-label="My property" className="surface overflow-hidden p-4">
      <div className="flex items-start gap-3.5">
        {property.photoUrl && failedPhotoUrl !== property.photoUrl ? (
          <img
            src={sanitizeExternalUrl(property.photoUrl)}
            alt={property.name}
            onError={() => setFailedPhotoUrl(property.photoUrl)}
            className="h-16 w-20 shrink-0 rounded-xl border border-slate-200 object-cover"
          />
        ) : (
          <div
            aria-label="Property photo unavailable"
            className="flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400"
          >
            <Home className="h-4 w-4" />
            <span className="mt-0.5 text-[10px] font-medium">No photo</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">
              {property.name}
            </h1>
            <a
              href={sanitizeExternalUrl(property.airbnbUrl)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open my Airbnb listing"
              className="shrink-0 text-slate-400 hover:text-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{property.address}</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">
              {PROPERTY_TYPE_LABELS[property.propertyType]}
            </span>
            <span>{property.bedrooms} bd</span>
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

      {/* Price + Edit Row */}
      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        {property.nightlyPrice !== null ? (
          <div>
            <span className="block text-[11px] font-medium text-slate-500">My nightly rate</span>
            <div className="tabular text-2xl font-bold tracking-tight text-slate-900">
              ${property.nightlyPrice}
              <span className="text-xs font-normal text-slate-500"> / night</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveInlinePrice} className="flex items-center gap-2">
            <label htmlFor="quick-my-price" className="sr-only">
              Set my current nightly price
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-slate-400">
                $
              </span>
              <input
                id="quick-my-price"
                type="number"
                min={10}
                required
                placeholder="My rate"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                className="h-9 w-28 rounded-xl border border-slate-200 bg-white pr-2.5 pl-6 text-xs font-semibold text-slate-900 tabular focus:border-slate-900 focus:outline-none"
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
          className="btn-secondary h-9 px-3 text-xs"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit property</span>
        </button>
      </div>

      {/* Mobile Action Takeaway Pill */}
      <div className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${statusStyles}`}>
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
          <span className="flex-1 font-medium">{aiSummary || overview.actionSummary}</span>
        </div>
        {aiAvailable && overview.comparableCount > 0 && (
          <button
            type="button"
            onClick={onRequestAiSummary}
            disabled={aiLoading}
            className="mt-1.5 inline-flex items-center gap-1 pl-4 text-[11px] font-semibold underline opacity-80 hover:opacity-100"
          >
            {aiLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            <span>{aiSummary ? 'Refresh AI note' : 'AI market note'}</span>
          </button>
        )}
      </div>
    </section>
  );
};
