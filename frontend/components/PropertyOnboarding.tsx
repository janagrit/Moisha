import React, { useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { HostProperty } from '../types';
import {
  parseAirbnbListingUrl,
  tryFetchListingPreview,
  validateAndResolveUsLocation,
} from '../services/usLocationService';

interface PropertyOnboardingProps {
  onRegisterProperty: (property: HostProperty) => void;
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
  onRegisterProperty,
  onLoadPrototype,
}) => {
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [nightlyPrice, setNightlyPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAirbnb = parseAirbnbListingUrl(airbnbUrl);
    if (!parsedAirbnb) {
      setErrorMsg('Please enter a valid Airbnb listing URL (e.g. https://www.airbnb.com/rooms/12345678).');
      return;
    }

    setIsSubmitting(true);
    try {
      const [locationResult, preview] = await Promise.all([
        validateAndResolveUsLocation(locationInput),
        tryFetchListingPreview(parsedAirbnb.normalizedUrl),
      ]);

      if (!locationResult.ok) {
        setErrorMsg(locationResult.error);
        return;
      }

      const resolvedBedrooms =
        typeof preview.bedrooms === 'number' && preview.bedrooms >= 0
          ? preview.bedrooms
          : bedrooms;

      const defaultName =
        preview.name ||
        (locationResult.city && !locationResult.city.startsWith('ZIP ')
          ? resolvedBedrooms === 0
            ? `Studio in ${locationResult.city}`
            : `${resolvedBedrooms}-Bedroom Home in ${locationResult.city}`
          : parsedAirbnb.roomId
            ? `Airbnb Listing #${parsedAirbnb.roomId}`
            : `${resolvedBedrooms}-Bedroom Airbnb`);

      const parsedPrice = nightlyPrice.trim() ? Math.round(Number(nightlyPrice)) : null;

      const created: HostProperty = {
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
        propertyType: resolvedBedrooms === 0 ? 'studio' : 'entire_home',
        bedrooms: resolvedBedrooms,
        bathrooms: preview.bathrooms,
        guestCapacity: preview.guestCapacity,
        nightlyPrice: parsedPrice && parsedPrice > 0 ? parsedPrice : null,
        photoUrl: preview.photoUrl,
        amenities: [],
        createdAt: new Date().toISOString(),
      };

      onRegisterProperty(created);
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="mb-5">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Register your US Airbnb
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Enter your listing once to benchmark comparable properties and track neighbor rate changes.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div>
            <label htmlFor="onboard-airbnb-url" className="field-label">
              Airbnb listing URL
            </label>
            <input
              id="onboard-airbnb-url"
              type="url"
              required
              placeholder="https://www.airbnb.com/rooms/..."
              value={airbnbUrl}
              onChange={(e) => setAirbnbUrl(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="onboard-location" className="field-label">
              Property address or US ZIP code
            </label>
            <input
              id="onboard-location"
              type="text"
              required
              placeholder="e.g. 20002 or 1114 Florida Ave NE, Washington, DC"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <span className="field-label">Bedrooms</span>
            <div className="grid grid-cols-6 gap-2">
              {BEDROOM_OPTIONS.map((opt) => {
                const isSelected =
                  opt.value === 5 ? bedrooms >= 5 : bedrooms === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setBedrooms(opt.value)}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-colors sm:text-sm ${
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
            {bedrooms >= 5 && (
              <div className="mt-2.5">
                <label htmlFor="onboard-bedrooms" className="sr-only">
                  Exact bedroom count
                </label>
                <input
                  id="onboard-bedrooms"
                  type="number"
                  min={5}
                  max={20}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Math.max(5, Math.min(20, Number(e.target.value) || 5)))}
                  className="input-field w-28 tabular"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="onboard-my-price" className="field-label">
              My current nightly price ($, optional)
            </label>
            <input
              id="onboard-my-price"
              type="number"
              min={10}
              placeholder="e.g. 245"
              value={nightlyPrice}
              onChange={(e) => setNightlyPrice(e.target.value)}
              className="input-field tabular"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary h-11 w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying US property...</span>
              </>
            ) : (
              <span>Continue to dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
