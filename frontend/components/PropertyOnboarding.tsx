import React, { useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, Link2, Check } from 'lucide-react';
import { HostProperty, CompetitorListing, PriceChangeEvent } from '../types';
import {
  parseAirbnbListingUrl,
  ingestAirbnbListingViaApi,
  validateAndResolveUsLocation,
} from '../services/usLocationService';

interface PropertyOnboardingProps {
  onCompleteIngest: (payload: {
    property: HostProperty;
    competitors: CompetitorListing[];
    priceChanges: PriceChangeEvent[];
  }) => void;
  onLoadPrototype?: () => void;
}

const BEDROOM_OPTIONS: Array<{ label: string; value: number }> = [
  { label: 'Studio', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5+', value: 5 },
];

export const PropertyOnboarding: React.FC<PropertyOnboardingProps> = ({
  onCompleteIngest,
  onLoadPrototype,
}) => {
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [needsStaticFallback, setNeedsStaticFallback] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [nightlyPrice, setNightlyPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runUrlImport = async (targetUrl: string) => {
    setErrorMsg(null);
    const parsedAirbnb = parseAirbnbListingUrl(targetUrl);
    if (!parsedAirbnb) {
      setErrorMsg(
        'Please enter a valid public Airbnb listing link (e.g. https://www.airbnb.com/rooms/31249608).',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // If static fallback isn't active yet, extract everything automatically via backend API
      if (!needsStaticFallback) {
        const ingested = await ingestAirbnbListingViaApi(parsedAirbnb.normalizedUrl);
        if (ingested.ok) {
          onCompleteIngest({
            property: ingested.property,
            competitors: ingested.competitors,
            priceChanges: ingested.priceChanges,
          });
          return;
        }

        if (!ingested.apiUnavailable) {
          // Real validation error (e.g. non-US listing rejected with exact required message)
          setErrorMsg(ingested.error);
          return;
        }

        // Static GitHub Pages fallback (no backend server to proxy CORS-blocked airbnb.com)
        setNeedsStaticFallback(true);
        setErrorMsg(
          'Static browser demo cannot read airbnb.com directly due to CORS. Enter your US ZIP/address below (or run `npm run dev` locally for 1-link auto-import).',
        );
        return;
      }

      // Static-only fallback path when running without the Node backend
      const locationResult = await validateAndResolveUsLocation(locationInput);
      if (!locationResult.ok) {
        setErrorMsg(locationResult.error);
        return;
      }

      const parsedPrice = nightlyPrice.trim() ? Math.round(Number(nightlyPrice)) : null;
      const defaultName =
        locationResult.city && !locationResult.city.startsWith('ZIP ')
          ? bedrooms === 0
            ? `Studio in ${locationResult.city}`
            : `${bedrooms}-Bedroom Home in ${locationResult.city}`
          : parsedAirbnb.roomId
            ? `Airbnb Listing #${parsedAirbnb.roomId}`
            : `${bedrooms}-Bedroom Airbnb`;

      onCompleteIngest({
        property: {
          id: `prop-${Date.now()}`,
          airbnbUrl: parsedAirbnb.normalizedUrl,
          airbnbRoomId: parsedAirbnb.roomId,
          name: defaultName,
          address: locationResult.formattedAddress,
          city: locationResult.city,
          state: locationResult.state,
          zipCode: locationResult.zipCode,
          neighborhood: locationResult.neighborhood,
          latitude: locationResult.latitude,
          longitude: locationResult.longitude,
          propertyType: bedrooms === 0 ? 'studio' : 'entire_home',
          bedrooms,
          bathrooms: null,
          guestCapacity: null,
          nightlyPrice: parsedPrice && parsedPrice > 0 ? parsedPrice : null,
          photoUrl: null,
          amenities: [],
          createdAt: new Date().toISOString(),
        },
        competitors: [],
        priceChanges: [],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runUrlImport(airbnbUrl);
  };

  return (
    <div className="py-2">
      {onLoadPrototype && (
        <div className="mb-3">
          <button
            type="button"
            onClick={onLoadPrototype}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to DC 20002 demo</span>
          </button>
        </div>
      )}

      <div className="surface p-5">
        <div className="mb-4">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Paste your Airbnb listing link
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            No forms to re-type. Moisha reads your public listing—rooms, amenities, nightly price, and US location—and finds nearby comparable homes automatically.
          </p>
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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="onboard-airbnb-url" className="field-label text-xs">
              Airbnb listing URL
            </label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="onboard-airbnb-url"
                type="url"
                required
                placeholder="https://www.airbnb.com/rooms/31249608"
                value={airbnbUrl}
                onChange={(e) => setAirbnbUrl(e.target.value)}
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>

          {!needsStaticFallback && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-[11px] text-slate-600">
              <div className="font-semibold text-slate-800">Auto-collected from your link:</div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-600" /> Nightly price
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-600" /> Rooms &amp; baths
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-600" /> Amenities &amp; photo
                </span>
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-600" /> Nearby comps
                </span>
              </div>
            </div>
          )}

          {needsStaticFallback && (
            <div className="space-y-3.5 border-t border-slate-100 pt-3">
              <div>
                <label htmlFor="onboard-location" className="field-label text-xs">
                  Property address or US ZIP code
                </label>
                <input
                  id="onboard-location"
                  type="text"
                  required
                  placeholder="e.g. 20002 or 1114 Florida Ave NE, Washington, DC"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <span className="field-label text-xs">Bedrooms</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {BEDROOM_OPTIONS.map((opt) => {
                    const isSelected =
                      opt.value === 5 ? bedrooms >= 5 : bedrooms === opt.value;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setBedrooms(opt.value)}
                        className={`h-9 rounded-xl border text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="onboard-my-price" className="field-label text-xs">
                  My current nightly price ($, optional)
                </label>
                <input
                  id="onboard-my-price"
                  type="number"
                  min={10}
                  placeholder="e.g. 245"
                  value={nightlyPrice}
                  onChange={(e) => setNightlyPrice(e.target.value)}
                  className="input-field text-xs tabular"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary h-11 w-full text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Reading Airbnb listing &amp; nearby prices...</span>
              </>
            ) : (
              <span>Continue to dashboard</span>
            )}
          </button>

          {!needsStaticFallback && (
            <div className="pt-1 text-center">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  const sampleUrl = 'https://www.airbnb.com/rooms/31249608';
                  setAirbnbUrl(sampleUrl);
                  void runUrlImport(sampleUrl);
                }}
                className="text-[11px] font-semibold text-slate-500 underline hover:text-slate-900"
              >
                Or test live extraction on real DC listing #31249608 →
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
