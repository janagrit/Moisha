import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { HostProperty } from '../types';
import {
  parseAirbnbListingUrl,
  tryFetchListingPreview,
  validateAndResolveUsLocation,
} from '../services/usLocationService';

interface PropertyOnboardingProps {
  onRegisterProperty: (property: HostProperty) => void;
}

const BEDROOM_CHOICES = [1, 2, 3, 4, 5];

export const PropertyOnboarding: React.FC<PropertyOnboardingProps> = ({
  onRegisterProperty,
}) => {
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [bedrooms, setBedrooms] = useState<number>(3);
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
        typeof preview.bedrooms === 'number' && preview.bedrooms > 0
          ? preview.bedrooms
          : bedrooms;

      const defaultName =
        preview.name ||
        (locationResult.city && !locationResult.city.startsWith('ZIP ')
          ? `${resolvedBedrooms}-Bedroom Home in ${locationResult.city}`
          : parsedAirbnb.roomId
            ? `Airbnb Listing #${parsedAirbnb.roomId}`
            : `${resolvedBedrooms}-Bedroom Airbnb`);

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
        nightlyPrice: null,
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
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      <div className="surface p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Monitor competitors near your Airbnb
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Register your US listing once to track comparable neighborhood properties and daily price changes.
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
              placeholder="e.g. 78704 or 1500 S Congress Ave, Austin, TX"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="onboard-bedrooms" className="field-label">
              Bedrooms
            </label>
            <div className="grid grid-cols-6 gap-2">
              {BEDROOM_CHOICES.map((num) => (
                <button
                  key={num}
                  type="button"
                  aria-pressed={bedrooms === num}
                  onClick={() => setBedrooms(num)}
                  className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
                    bedrooms === num
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {num}
                </button>
              ))}
              <input
                id="onboard-bedrooms"
                type="number"
                min={0}
                max={20}
                aria-label="Custom number of bedrooms"
                value={bedrooms}
                onChange={(e) => setBedrooms(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                className="input-field text-center font-semibold tabular"
              />
            </div>
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
