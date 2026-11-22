import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, AlertCircle, ClipboardPaste, Link2, SlidersHorizontal } from 'lucide-react';
import {
  HostProperty,
  CompetitorListing,
  PropertyType,
  Amenity,
  AMENITY_OPTIONS,
  AMENITY_LABELS,
  PROPERTY_TYPE_LABELS,
} from '../types';
import {
  parseAirbnbListingUrl,
  fetchCompetitorFromAirbnbUrlViaApi,
  buildComparableAirbnbSearchUrl,
} from '../services/usLocationService';
import { evaluateCompetitorMatch } from '../services/competitorMatcher';
import {
  parsePastedAirbnbSearchText,
  ParsedAirbnbCardCandidate,
} from '../services/prototypeData';

interface CompetitorFormModalProps {
  hostProperty: HostProperty;
  editingCompetitor: CompetitorListing | null;
  onClose: () => void;
  onSaveCompetitor: (data: {
    id?: string;
    airbnbUrl: string;
    airbnbRoomId: string | null;
    name: string;
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number | null;
    guestCapacity: number | null;
    nightlyPrice: number;
    photoUrl: string | null;
    amenities: Amenity[];
  }) => void;
  onBulkImportCompetitors: (items: ParsedAirbnbCardCandidate[]) => void;
}

export const CompetitorFormModal: React.FC<CompetitorFormModalProps> = ({
  hostProperty,
  editingCompetitor,
  onClose,
  onSaveCompetitor,
  onBulkImportCompetitors,
}) => {
  const [mode, setMode] = useState<'single' | 'paste'>('single');
  const [showManualFields, setShowManualFields] = useState(Boolean(editingCompetitor));
  const [pastedText, setPastedText] = useState('');

  const [airbnbUrl, setAirbnbUrl] = useState(editingCompetitor?.airbnbUrl || '');
  const [name, setName] = useState(editingCompetitor?.name || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    editingCompetitor?.propertyType || hostProperty.propertyType,
  );
  const [bedrooms, setBedrooms] = useState(
    String(editingCompetitor?.bedrooms ?? hostProperty.bedrooms),
  );
  const [bathrooms, setBathrooms] = useState(
    editingCompetitor?.bathrooms !== null && editingCompetitor?.bathrooms !== undefined
      ? String(editingCompetitor.bathrooms)
      : '',
  );
  const [guestCapacity, setGuestCapacity] = useState(
    editingCompetitor?.guestCapacity !== null && editingCompetitor?.guestCapacity !== undefined
      ? String(editingCompetitor.guestCapacity)
      : '',
  );
  const [nightlyPrice, setNightlyPrice] = useState(
    editingCompetitor ? String(editingCompetitor.nightlyPrice) : '',
  );
  const [photoUrl, setPhotoUrl] = useState(editingCompetitor?.photoUrl || '');
  const [amenities, setAmenities] = useState<Amenity[]>(editingCompetitor?.amenities || []);
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const parsedCandidates = useMemo(
    () => parsePastedAirbnbSearchText(pastedText),
    [pastedText],
  );

  const toggleAmenity = (item: Amenity) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedUrl = parseAirbnbListingUrl(airbnbUrl);
    if (!parsedUrl) {
      setErrorMsg('Please enter a valid Airbnb URL (e.g. https://www.airbnb.com/rooms/31249608).');
      return;
    }

    // One-link auto-extraction when user only entered the Airbnb URL
    if (!editingCompetitor && !showManualFields) {
      setIsImportingUrl(true);
      try {
        const extracted = await fetchCompetitorFromAirbnbUrlViaApi(parsedUrl.normalizedUrl);
        if (extracted.ok && extracted.competitor.nightlyPrice !== null) {
          onSaveCompetitor({
            airbnbUrl: extracted.competitor.airbnbUrl,
            airbnbRoomId: extracted.competitor.airbnbRoomId,
            name: extracted.competitor.name,
            propertyType: extracted.competitor.propertyType,
            bedrooms: extracted.competitor.bedrooms,
            bathrooms: extracted.competitor.bathrooms,
            guestCapacity: extracted.competitor.guestCapacity,
            nightlyPrice: extracted.competitor.nightlyPrice,
            photoUrl: extracted.competitor.photoUrl,
            amenities: extracted.competitor.amenities,
          });
          onClose();
          return;
        }

        // Pre-populate whatever was extracted and reveal the price field if dates were unavailable or offline
        if (extracted.ok) {
          setName(extracted.competitor.name);
          setPropertyType(extracted.competitor.propertyType);
          setBedrooms(String(extracted.competitor.bedrooms));
          if (extracted.competitor.bathrooms !== null) {
            setBathrooms(String(extracted.competitor.bathrooms));
          }
          if (extracted.competitor.guestCapacity !== null) {
            setGuestCapacity(String(extracted.competitor.guestCapacity));
          }
          if (extracted.competitor.photoUrl) setPhotoUrl(extracted.competitor.photoUrl);
          setAmenities(extracted.competitor.amenities);
        }
        setShowManualFields(true);
        setErrorMsg(
          extracted.ok
            ? 'Extracted listing details! Enter its current nightly price below (calendar dates were booked).'
            : 'Auto-extract requires the local backend (`npm run dev`). Enter nightly price below or use Paste Airbnb page.',
        );
        return;
      } finally {
        setIsImportingUrl(false);
      }
    }

    const priceNum = Math.round(Number(nightlyPrice));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setErrorMsg('Please enter a valid nightly price in USD.');
      return;
    }

    const bedsNum = propertyType === 'studio' ? 0 : Math.max(0, Math.round(Number(bedrooms) || 0));
    const bathsNum = bathrooms.trim() ? Number(bathrooms) : null;
    const guestsNum = guestCapacity.trim() ? Math.round(Number(guestCapacity)) : null;

    const fallbackName = parsedUrl.roomId
      ? `Airbnb Listing #${parsedUrl.roomId}`
      : `${bedsNum}-Bedroom Listing`;

    onSaveCompetitor({
      id: editingCompetitor?.id,
      airbnbUrl: parsedUrl.normalizedUrl,
      airbnbRoomId: parsedUrl.roomId,
      name: name.trim() || fallbackName,
      propertyType,
      bedrooms: bedsNum,
      bathrooms: bathsNum !== null && bathsNum >= 0 ? bathsNum : null,
      guestCapacity: guestsNum !== null && guestsNum >= 1 ? guestsNum : null,
      nightlyPrice: priceNum,
      photoUrl: photoUrl.trim() || null,
      amenities,
    });
    onClose();
  };

  const handleSubmitPaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedCandidates.length === 0) {
      setErrorMsg(
        'No Airbnb prices found in pasted text. Copy text from an Airbnb search page that includes listing titles, bedroom counts, and "$... for 1 night".',
      );
      return;
    }
    onBulkImportCompetitors(parsedCandidates);
    onClose();
  };

  const previewEvaluation = evaluateCompetitorMatch(hostProperty, {
    id: 'preview',
    airbnbUrl: 'https://www.airbnb.com/rooms/1',
    airbnbRoomId: '1',
    name: name.trim() || 'Preview',
    propertyType,
    bedrooms: propertyType === 'studio' ? 0 : Math.max(0, Math.round(Number(bedrooms) || 0)),
    bathrooms: bathrooms.trim() ? Number(bathrooms) : null,
    guestCapacity: guestCapacity.trim() ? Math.round(Number(guestCapacity)) : null,
    nightlyPrice: Math.max(1, Math.round(Number(nightlyPrice) || 100)),
    previousPrice: null,
    photoUrl: null,
    locationNote: null,
    amenities,
    lastCheckedAt: new Date().toISOString(),
    priceHistory: [],
  });

  const targetMatchLabel =
    hostProperty.propertyType === 'studio'
      ? `Studio near ${hostProperty.neighborhood}`
      : `${hostProperty.bedrooms}-bedroom ${PROPERTY_TYPE_LABELS[hostProperty.propertyType].toLowerCase()} near ${hostProperty.neighborhood}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="comp-modal-title" className="text-base font-semibold text-slate-900">
              {editingCompetitor ? 'Edit competitor listing' : 'Add competitor by Airbnb link'}
            </h2>
            <p className="text-xs text-slate-500">Target: {targetMatchLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!editingCompetitor && (
          <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode('single');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                mode === 'single'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Airbnb link</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode('paste');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                mode === 'paste'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span>Paste Airbnb page</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'paste' && !editingCompetitor ? (
          <form onSubmit={handleSubmitPaste} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
              Open{' '}
              <a
                href={buildComparableAirbnbSearchUrl(hostProperty)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 underline"
              >
                Airbnb near {hostProperty.neighborhood}
              </a>
              , copy the search page (`Cmd+A`, `Cmd+C`), and paste below.
            </div>

            <div>
              <label htmlFor="paste-airbnb-raw" className="field-label text-xs">
                Copied Airbnb search text
              </label>
              <textarea
                id="paste-airbnb-raw"
                rows={5}
                placeholder={`Home in Washington\nRow home with a fire pit near H St\n3 bedrooms · 4 queen beds · 2.5 baths\n$183 for 1 night`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>

            {parsedCandidates.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                <div className="font-semibold text-slate-800">
                  Detected {parsedCandidates.length} listing
                  {parsedCandidates.length === 1 ? '' : 's'}:
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {parsedCandidates.map((cand, idx) => {
                    const evalTier = evaluateCompetitorMatch(hostProperty, {
                      id: `tmp-${idx}`,
                      airbnbUrl: 'https://www.airbnb.com',
                      airbnbRoomId: null,
                      name: cand.name,
                      propertyType: cand.propertyType,
                      bedrooms: cand.bedrooms,
                      bathrooms: cand.bathrooms,
                      guestCapacity: null,
                      nightlyPrice: cand.nightlyPrice,
                      previousPrice: null,
                      photoUrl: null,
                      locationNote: null,
                      amenities: [],
                      lastCheckedAt: new Date().toISOString(),
                      priceHistory: [],
                    }).tier;

                    return (
                      <div
                        key={`${cand.name}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5"
                      >
                        <span className="truncate font-medium text-slate-800">
                          {cand.name} ({cand.bedrooms}BR · ${cand.nightlyPrice}/nt)
                        </span>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            evalTier === 'primary'
                              ? 'bg-emerald-50 text-emerald-700'
                              : evalTier === 'secondary'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {evalTier === 'primary'
                            ? 'Comparable'
                            : evalTier === 'secondary'
                              ? 'Secondary'
                              : 'Auto-excluded'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={onClose} className="btn-secondary h-9 text-xs">
                Cancel
              </button>
              <button type="submit" className="btn-primary h-9 text-xs">
                Import {parsedCandidates.length > 0 ? `${parsedCandidates.length} listings` : 'listings'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={(e) => void handleSubmitSingle(e)} className="space-y-4">
            <div>
              <label htmlFor="comp-airbnb-url" className="field-label text-xs">
                Public Airbnb listing URL
              </label>
              <input
                id="comp-airbnb-url"
                type="url"
                required
                placeholder="https://www.airbnb.com/rooms/..."
                value={airbnbUrl}
                onChange={(e) => setAirbnbUrl(e.target.value)}
                className="input-field text-xs"
              />
              {!editingCompetitor && !showManualFields && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Paste just the link—Moisha automatically collects its rooms, amenities, photo, and nightly price.
                </p>
              )}
            </div>

            {!editingCompetitor && !showManualFields && (
              <button
                type="button"
                onClick={() => setShowManualFields(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Or enter details manually</span>
              </button>
            )}

            {showManualFields && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="comp-name" className="field-label text-xs">
                      Property name
                    </label>
                    <input
                      id="comp-name"
                      type="text"
                      placeholder="e.g. Modern 3BR Rowhome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="comp-price" className="field-label text-xs">
                      Nightly price ($) *
                    </label>
                    <input
                      id="comp-price"
                      type="number"
                      required
                      min={10}
                      placeholder="e.g. 245"
                      value={nightlyPrice}
                      onChange={(e) => setNightlyPrice(e.target.value)}
                      className="input-field text-xs font-semibold tabular"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="comp-type" className="field-label text-xs">
                      Type
                    </label>
                    <select
                      id="comp-type"
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                      className="input-field px-2 text-xs"
                    >
                      <option value="entire_home">Entire home</option>
                      <option value="studio">Studio</option>
                      <option value="private_room">Private room</option>
                      <option value="shared_room">Shared room</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="comp-beds" className="field-label text-xs">
                      Bedrooms
                    </label>
                    <input
                      id="comp-beds"
                      type="number"
                      min={0}
                      max={20}
                      disabled={propertyType === 'studio'}
                      value={propertyType === 'studio' ? '0' : bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="input-field text-xs tabular disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label htmlFor="comp-baths" className="field-label text-xs">
                      Baths
                    </label>
                    <input
                      id="comp-baths"
                      type="number"
                      min={0}
                      step="0.5"
                      placeholder="—"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className="input-field text-xs tabular"
                    />
                  </div>

                  <div>
                    <label htmlFor="comp-guests" className="field-label text-xs">
                      Guests
                    </label>
                    <input
                      id="comp-guests"
                      type="number"
                      min={1}
                      placeholder="—"
                      value={guestCapacity}
                      onChange={(e) => setGuestCapacity(e.target.value)}
                      className="input-field text-xs tabular"
                    />
                  </div>
                </div>

                {previewEvaluation.tier === 'secondary' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Secondary match ({previewEvaluation.matchReason}): kept separate from primary average.
                  </div>
                )}

                {previewEvaluation.tier === 'excluded' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
                    {previewEvaluation.matchReason}. Excluded from comparable benchmark.
                  </div>
                )}

                <div>
                  <span className="field-label text-xs">Amenities (optional)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AMENITY_OPTIONS.map((amenity) => {
                      const active = amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleAmenity(amenity)}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {AMENITY_LABELS[amenity]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={onClose} className="btn-secondary h-9 text-xs">
                Cancel
              </button>
              <button type="submit" disabled={isImportingUrl} className="btn-primary h-9 text-xs">
                {isImportingUrl ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Reading Airbnb...</span>
                  </>
                ) : editingCompetitor ? (
                  <span>Save changes</span>
                ) : showManualFields ? (
                  <span>Save competitor</span>
                ) : (
                  <span>Import from link</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
