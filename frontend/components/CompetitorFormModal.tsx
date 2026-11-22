import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
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
  tryFetchListingPreview,
} from '../services/usLocationService';
import { evaluateCompetitorMatch } from '../services/competitorMatcher';

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
}

export const CompetitorFormModal: React.FC<CompetitorFormModalProps> = ({
  hostProperty,
  editingCompetitor,
  onClose,
  onSaveCompetitor,
}) => {
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
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleUrlBlur = async () => {
    if (editingCompetitor || !airbnbUrl.trim()) return;
    const parsed = parseAirbnbListingUrl(airbnbUrl);
    if (!parsed) return;

    setIsFetchingPreview(true);
    try {
      const preview = await tryFetchListingPreview(parsed.normalizedUrl);
      if (preview.name && !name.trim()) setName(preview.name);
      if (preview.photoUrl && !photoUrl.trim()) setPhotoUrl(preview.photoUrl);
      if (preview.bedrooms !== null) setBedrooms(String(preview.bedrooms));
      if (preview.bathrooms !== null && !bathrooms.trim()) {
        setBathrooms(String(preview.bathrooms));
      }
      if (preview.guestCapacity !== null && !guestCapacity.trim()) {
        setGuestCapacity(String(preview.guestCapacity));
      }
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const toggleAmenity = (item: Amenity) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedUrl = parseAirbnbListingUrl(airbnbUrl);
    if (!parsedUrl) {
      setErrorMsg('Please enter a valid Airbnb URL (e.g. https://www.airbnb.com/rooms/12345678).');
      return;
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 id="comp-modal-title" className="text-lg font-semibold text-slate-900">
              {editingCompetitor ? 'Edit competitor listing' : 'Add competitor listing'}
            </h2>
            <p className="text-xs text-slate-500">Target match: {targetMatchLabel}</p>
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

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="comp-airbnb-url" className="field-label">
                Airbnb listing URL *
              </label>
              {isFetchingPreview && (
                <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking metadata...
                </span>
              )}
            </div>
            <input
              id="comp-airbnb-url"
              type="url"
              required
              placeholder="https://www.airbnb.com/rooms/..."
              value={airbnbUrl}
              onChange={(e) => setAirbnbUrl(e.target.value)}
              onBlur={() => void handleUrlBlur()}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="comp-name" className="field-label">
                Property name
              </label>
              <input
                id="comp-name"
                type="text"
                placeholder="e.g. Modern 3BR Bungalow"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="comp-price" className="field-label">
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
                className="input-field font-semibold tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="comp-type" className="field-label">
                Type
              </label>
              <select
                id="comp-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="input-field px-2.5"
              >
                <option value="entire_home">Entire home</option>
                <option value="studio">Studio</option>
                <option value="private_room">Private room</option>
                <option value="shared_room">Shared room</option>
              </select>
            </div>

            <div>
              <label htmlFor="comp-beds" className="field-label">
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
                className="input-field tabular disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="comp-baths" className="field-label">
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
                className="input-field tabular"
              />
            </div>

            <div>
              <label htmlFor="comp-guests" className="field-label">
                Guests
              </label>
              <input
                id="comp-guests"
                type="number"
                min={1}
                placeholder="—"
                value={guestCapacity}
                onChange={(e) => setGuestCapacity(e.target.value)}
                className="input-field tabular"
              />
            </div>
          </div>

          {previewEvaluation.tier === 'secondary' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              Secondary match ({previewEvaluation.matchReason}): shown in Secondary matches and kept separate from your primary average.
            </div>
          )}

          {previewEvaluation.tier === 'excluded' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-800">
              {previewEvaluation.matchReason}. It will be kept out of your comparable benchmark.
            </div>
          )}

          <div>
            <label htmlFor="comp-photo" className="field-label">
              Photo URL (optional — leave blank if unavailable)
            </label>
            <input
              id="comp-photo"
              type="url"
              placeholder="https://..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <span className="field-label">Amenities (optional)</span>
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_OPTIONS.map((amenity) => {
                const active = amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
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

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingCompetitor ? 'Save changes' : 'Save competitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
