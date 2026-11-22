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
} from 'lucide-react';
import {
  HostProperty,
  CompetitorListing,
  EvaluatedCompetitor,
  CompetitorSortField,
  sanitizeExternalUrl,
  AMENITY_LABELS,
} from '../types';
import { buildComparableAirbnbSearchUrl } from '../services/usLocationService';

interface CompetitorListingsSectionProps {
  property: HostProperty;
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
    return <span className="text-xs text-slate-400">—</span>;
  }
  if (diffDollar === 0) {
    return (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        Same price
      </span>
    );
  }
  const isCheaperThanMe = diffDollar < 0;
  const sign = diffDollar > 0 ? '+' : '-';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular ${
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
  primary,
  secondary,
  excluded,
  onAddCompetitor,
  onEditCompetitor,
  onDeleteCompetitor,
}) => {
  const [sortBy, setSortBy] = useState<CompetitorSortField>('price_asc');
  const [showSecondary, setShowSecondary] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const sortedPrimary = useMemo(() => sortCompetitors(primary, sortBy), [primary, sortBy]);
  const sortedSecondary = useMemo(() => sortCompetitors(secondary, sortBy), [secondary, sortBy]);

  const airbnbSearchUrl = useMemo(
    () => buildComparableAirbnbSearchUrl(property),
    [property],
  );

  const renderListingRow = (item: EvaluatedCompetitor) => {
    const { listing } = item;
    const bathText =
      listing.bathrooms !== null
        ? `${listing.bathrooms} ${listing.bathrooms === 1 ? 'bath' : 'baths'}`
        : 'Baths unavailable';
    const guestText =
      listing.guestCapacity !== null ? `${listing.guestCapacity} guests` : 'Unavailable';

    return (
      <tr key={listing.id} className="group hover:bg-slate-50/70">
        <td className="py-3.5 pr-4 pl-6">
          <div className="flex items-center gap-3.5">
            {listing.photoUrl ? (
              <img
                src={sanitizeExternalUrl(listing.photoUrl)}
                alt={listing.name}
                className="h-11 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                <Home className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {listing.name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {listing.amenities.length > 0
                  ? listing.amenities
                      .slice(0, 3)
                      .map((a) => AMENITY_LABELS[a])
                      .join(' · ')
                  : item.matchReason}
              </div>
            </div>
          </div>
        </td>

        <td className="px-4 py-3.5 text-sm text-slate-600 tabular">
          <div>
            {listing.bedrooms} {listing.bedrooms === 1 ? 'bd' : 'bds'} · {bathText}
          </div>
        </td>

        <td className="px-4 py-3.5 text-sm text-slate-600 tabular">{guestText}</td>

        <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 tabular">
          ${listing.nightlyPrice}
          <span className="text-xs font-normal text-slate-500"> / nt</span>
        </td>

        <td className="px-4 py-3.5">{formatDiffBadge(item.priceDiffFromMine, item.percentDiffFromMine)}</td>

        <td className="py-3.5 pr-6 pl-4 text-right">
          <div className="inline-flex items-center gap-1.5">
            <a
              href={sanitizeExternalUrl(listing.airbnbUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              <span>Airbnb</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={() => onEditCompetitor(listing)}
              aria-label={`Edit ${listing.name}`}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteCompetitor(listing.id)}
              aria-label={`Remove ${listing.name}`}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderListingsView = (items: EvaluatedCompetitor[]) => (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-500">
              <th scope="col" className="py-3 pr-4 pl-6 font-medium">
                Property
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Rooms
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Guests
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Nightly price
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                vs. My price
              </th>
              <th scope="col" className="py-3 pr-6 pl-4 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{items.map(renderListingRow)}</tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="divide-y divide-slate-100 md:hidden">
        {items.map((item) => {
          const { listing } = item;
          const bathText =
            listing.bathrooms !== null ? `${listing.bathrooms} ba` : 'Baths unavailable';
          const guestText =
            listing.guestCapacity !== null
              ? `${listing.guestCapacity} guests`
              : 'Guests unavailable';

          return (
            <div key={listing.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {listing.photoUrl ? (
                    <img
                      src={sanitizeExternalUrl(listing.photoUrl)}
                      alt={listing.name}
                      className="h-12 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                      <Home className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {listing.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {listing.bedrooms} bd · {bathText} · {guestText}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right tabular">
                  <div className="text-base font-semibold text-slate-900">
                    ${listing.nightlyPrice}
                  </div>
                  <div className="mt-0.5">
                    {formatDiffBadge(item.priceDiffFromMine, item.percentDiffFromMine)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <a
                  href={sanitizeExternalUrl(listing.airbnbUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
                >
                  <span>View on Airbnb</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditCompetitor(listing)}
                    className="font-medium text-slate-500 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCompetitor(listing.id)}
                    className="font-medium text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const targetSubtitle =
    property.propertyType === 'studio'
      ? `Studios near ${property.neighborhood}`
      : property.propertyType === 'entire_home'
        ? `${property.bedrooms}-bedroom entire homes near ${property.neighborhood} (studios and private rooms excluded)`
        : `${property.bedrooms}-bedroom comparable listings near ${property.neighborhood}`;

  const browseLabel =
    property.propertyType === 'studio'
      ? 'Browse studios on Airbnb'
      : `Browse ${property.bedrooms}BR on Airbnb`;

  return (
    <section aria-label="Competitor listings" className="space-y-4">
      <div className="surface overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Comparable listings
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 tabular">
                {primary.length}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{targetSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {(primary.length > 1 || secondary.length > 1) && (
              <div className="relative flex items-center">
                <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
                <select
                  aria-label="Sort competitor listings"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CompetitorSortField)}
                  className="h-9 rounded-xl border border-slate-200 bg-white pr-3 pl-8 text-xs font-semibold text-slate-700 focus:border-slate-900 focus:outline-none sm:text-sm"
                >
                  <option value="price_asc">Price: Low to high</option>
                  <option value="price_desc">Price: High to low</option>
                  <option value="bedrooms_asc">Bedrooms: Low to high</option>
                  <option value="bedrooms_desc">Bedrooms: High to low</option>
                </select>
              </div>
            )}

            <a
              href={airbnbSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary h-9 px-3 text-xs sm:text-sm"
            >
              <span>{browseLabel}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={onAddCompetitor}
              className="btn-primary h-9 px-3.5 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add competitor</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {sortedPrimary.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              {property.propertyType === 'studio'
                ? 'No studio competitors added yet'
                : `No ${property.bedrooms}-bedroom comparable competitors added yet`}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
              Open Airbnb pre-filtered to comparable listings in {property.neighborhood}, then add the nearby properties you compete against.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <a
                href={airbnbSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary h-9 px-3.5 text-xs sm:text-sm"
              >
                <span>{browseLabel}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={onAddCompetitor}
                className="btn-primary h-9 px-3.5 text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add competitor</span>
              </button>
            </div>
          </div>
        ) : (
          renderListingsView(sortedPrimary)
        )}
      </div>

      {/* Separate Secondary Matches (±1 bedroom entire homes) */}
      {sortedSecondary.length > 0 && (
        <div className="surface overflow-hidden">
          <button
            type="button"
            aria-expanded={showSecondary}
            onClick={() => setShowSecondary((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50/70"
          >
            <div>
              <span className="text-sm font-semibold text-slate-900">
                Secondary matches ({sortedSecondary.length})
              </span>
              <span className="ml-2 text-xs text-slate-500">
                Entire homes within ±1 bedroom · Excluded from primary average
              </span>
            </div>
            {showSecondary ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showSecondary && (
            <div className="border-t border-slate-100">{renderListingsView(sortedSecondary)}</div>
          )}
        </div>
      )}

      {/* Excluded Non-Comparable Listings Notice (Studios / Private Rooms / >=2 BR mismatch) */}
      {excluded.length > 0 && (
        <div className="surface overflow-hidden border-slate-200/70 bg-slate-50/40">
          <button
            type="button"
            aria-expanded={showExcluded}
            onClick={() => setShowExcluded((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-3.5 text-left"
          >
            <div className="text-xs text-slate-500">
              <strong className="font-semibold text-slate-700">
                Excluded non-comparable listings ({excluded.length})
              </strong>{' '}
              — Studios, private rooms, and listings differing by 2+ bedrooms are kept out of your benchmark.
            </div>
            {showExcluded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showExcluded && (
            <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white px-6">
              {excluded.map(({ listing, matchReason }) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{listing.name}</span>
                    <span className="ml-2 text-slate-500">{matchReason}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditCompetitor(listing)}
                      className="font-medium text-slate-600 hover:text-slate-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCompetitor(listing.id)}
                      className="font-medium text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
