import React, { useState, useMemo } from 'react';
import {
  Plus,
  ExternalLink,
  Home,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ShieldCheck,
} from 'lucide-react';
import {
  HostProperty,
  CompetitorListing,
  EvaluatedCompetitor,
  CompetitorSortField,
  sanitizeExternalUrl,
} from '../types';
import { buildComparableAirbnbSearchUrl } from '../services/usLocationService';

interface CompetitorListingsSectionProps {
  property: HostProperty;
  isPrototype: boolean;
  primary: EvaluatedCompetitor[];
  secondary: EvaluatedCompetitor[];
  excluded: EvaluatedCompetitor[];
  onAddCompetitor: () => void;
  onEditCompetitor: (comp: CompetitorListing) => void;
  onDeleteCompetitor: (id: string) => void;
}

function sortCompetitors(
  items: EvaluatedCompetitor[],
  sortBy: CompetitorSortField,
): EvaluatedCompetitor[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sortBy === 'price_asc') return a.listing.nightlyPrice - b.listing.nightlyPrice;
    if (sortBy === 'price_desc') return b.listing.nightlyPrice - a.listing.nightlyPrice;
    if (sortBy === 'bedrooms_asc') {
      return (
        a.listing.bedrooms - b.listing.bedrooms ||
        a.listing.nightlyPrice - b.listing.nightlyPrice
      );
    }
    return (
      b.listing.bedrooms - a.listing.bedrooms ||
      a.listing.nightlyPrice - b.listing.nightlyPrice
    );
  });
  return copy;
}

function formatDiffBadge(diffDollar: number | null, diffPct: number | null): React.ReactNode {
  if (diffDollar === null || diffPct === null) {
    return <span className="text-[11px] text-slate-400">—</span>;
  }
  if (diffDollar === 0) {
    return (
      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
        Same rate
      </span>
    );
  }
  const isCheaperThanMe = diffDollar < 0;
  const sign = diffDollar > 0 ? '+' : '-';
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular ${
        isCheaperThanMe
          ? 'bg-amber-50 text-amber-800'
          : 'bg-slate-100 text-slate-700'
      }`}
    >
      {sign}${Math.abs(diffDollar)} ({diffDollar > 0 ? '+' : ''}
      {diffPct}%)
    </span>
  );
}

export const CompetitorListingsSection: React.FC<CompetitorListingsSectionProps> = ({
  property,
  isPrototype,
  primary,
  secondary,
  excluded,
  onAddCompetitor,
  onEditCompetitor,
  onDeleteCompetitor,
}) => {
  const [sortBy, setSortBy] = useState<CompetitorSortField>('price_asc');
  const [showSecondary, setShowSecondary] = useState(false);
  const [showExcluded, setShowExcluded] = useState(isPrototype);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

  const sortedPrimary = useMemo(() => sortCompetitors(primary, sortBy), [primary, sortBy]);
  const sortedSecondary = useMemo(() => sortCompetitors(secondary, sortBy), [secondary, sortBy]);

  const airbnbSearchUrl = useMemo(
    () => buildComparableAirbnbSearchUrl(property),
    [property],
  );

  const renderCardList = (items: EvaluatedCompetitor[]) => (
    <div role="list" className="divide-y divide-slate-100">
      {items.map((item) => {
        const { listing } = item;
        const bathText =
          listing.bathrooms !== null ? `${listing.bathrooms} ba` : 'Baths unavailable';
        const guestText =
          listing.guestCapacity !== null ? `${listing.guestCapacity} guests` : 'Guests —';
        const hasPhoto = Boolean(listing.photoUrl && !failedPhotos[listing.id]);

        return (
          <div key={listing.id} role="listitem" className="space-y-2.5 p-3.5">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {hasPhoto ? (
                  <img
                    src={sanitizeExternalUrl(listing.photoUrl)}
                    alt={listing.name}
                    onError={() => setFailedPhotos((prev) => ({ ...prev, [listing.id]: true }))}
                    className="h-12 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                    <Home className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-900">
                    {listing.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {listing.bedrooms} bd · {bathText} · {guestText}
                  </div>
                  {listing.locationNote && (
                    <div className="truncate text-[10px] text-slate-400">
                      {listing.locationNote}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right tabular">
                <div className="text-sm font-bold text-slate-900">${listing.nightlyPrice}/nt</div>
                <div className="mt-0.5">
                  {formatDiffBadge(item.priceDiffFromMine, item.percentDiffFromMine)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-[11px]">
              <a
                href={sanitizeExternalUrl(listing.airbnbUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
              >
                <span>Open on Airbnb</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onEditCompetitor(listing)}
                  aria-label={`Edit ${listing.name}`}
                  className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-900"
                >
                  <Pencil className="h-3 w-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCompetitor(listing.id)}
                  aria-label={`Remove ${listing.name}`}
                  className="inline-flex items-center gap-1 font-medium text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section aria-label="Competitor listings" className="space-y-3">
      <div className="surface overflow-hidden">
        {/* Header + Controls */}
        <div className="space-y-2.5 border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Comparable {property.bedrooms}BR homes
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 tabular">
                {primary.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onAddCompetitor}
              className="btn-primary h-8 px-3 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add competitor</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            {(primary.length > 1 || secondary.length > 1) ? (
              <div className="relative flex-1">
                <ArrowUpDown className="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-slate-400" />
                <select
                  aria-label="Sort competitor listings"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CompetitorSortField)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-2 pl-7 text-xs font-semibold text-slate-700 focus:border-slate-900 focus:outline-none"
                >
                  <option value="price_asc">Price: Low to high</option>
                  <option value="price_desc">Price: High to low</option>
                  <option value="bedrooms_asc">Bedrooms: Low to high</option>
                  <option value="bedrooms_desc">Bedrooms: High to low</option>
                </select>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">
                Studios &amp; private rooms excluded
              </span>
            )}

            <a
              href={airbnbSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary h-8 shrink-0 px-2.5 text-xs"
            >
              <span>Airbnb map</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Empty State or Cards */}
        {sortedPrimary.length === 0 ? (
          <div className="px-4 py-9 text-center">
            <p className="text-xs font-semibold text-slate-700">
              No {property.bedrooms}-bedroom comps added yet
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Open Airbnb, copy the search cards, and tap <strong>Add competitor</strong> to paste and auto-filter them.
            </p>
          </div>
        ) : (
          renderCardList(sortedPrimary)
        )}
      </div>

      {/* Secondary Matches */}
      {sortedSecondary.length > 0 && (
        <div className="surface overflow-hidden">
          <button
            type="button"
            aria-expanded={showSecondary}
            onClick={() => setShowSecondary((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <span className="text-xs font-semibold text-slate-900">
                Secondary matches ({sortedSecondary.length})
              </span>
              <span className="block text-[11px] text-slate-500">
                Within ±1 bedroom · Excluded from {property.bedrooms}BR average
              </span>
            </div>
            {showSecondary ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showSecondary && (
            <div className="border-t border-slate-100">{renderCardList(sortedSecondary)}</div>
          )}
        </div>
      )}

      {/* Excluded Non-Comparable Listings */}
      {excluded.length > 0 && (
        <div className="surface overflow-hidden border-slate-200/80 bg-slate-50/50">
          <button
            type="button"
            aria-expanded={showExcluded}
            onClick={() => setShowExcluded((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong className="font-semibold text-slate-800">
                  Excluded non-comparable listings ({excluded.length})
                </strong>
                <span className="block text-[11px] text-slate-500">
                  Blocked from skewing your {property.bedrooms}BR average
                </span>
              </span>
            </div>
            {showExcluded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            )}
          </button>

          {showExcluded && (
            <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white px-4">
              {excluded.map(({ listing, matchReason }) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between gap-2 py-2.5 text-[11px]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">
                      {listing.name} (${listing.nightlyPrice}/nt)
                    </div>
                    <div className="truncate text-slate-500">{matchReason}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCompetitor(listing.id)}
                    className="shrink-0 font-medium text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
