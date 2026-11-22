import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import {
  HostProperty,
  PropertyType,
  Amenity,
  AMENITY_OPTIONS,
  AMENITY_LABELS,
} from '../types';
import {
  parseAirbnbListingUrl,
  validateAndResolveUsLocation,
} from '../services/usLocationService';

interface PropertyEditModalProps {
  property: HostProperty;
  onClose: () => void;
  onSave: (updated: HostProperty) => void;
  onResetProperty: () => void;
}

export const PropertyEditModal: React.FC<PropertyEditModalProps> = ({
  property,
  onClose,
  onSave,
  onResetProperty,
}) => {
  const [name, setName] = useState(property.name);
  const [airbnbUrl, setAirbnbUrl] = useState(property.airbnbUrl);
  const [address, setAddress] = useState(property.address);
  const [propertyType, setPropertyType] = useState<PropertyType>(property.propertyType);
  const [bedrooms, setBedrooms] = useState(String(property.bedrooms));
  const [bathrooms, setBathrooms] = useState(
    property.bathrooms !== null ? String(property.bathrooms) : '',
  );
  const [guestCapacity, setGuestCapacity] = useState(
    property.guestCapacity !== null ? String(property.guestCapacity) : '',
  );
  const [nightlyPrice, setNightlyPrice] = useState(
    property.nightlyPrice !== null ? String(property.nightlyPrice) : '',
  );
  const [photoUrl, setPhotoUrl] = useState(property.photoUrl || '');
  const [amenities, setAmenities] = useState<Amenity[]>(property.amenities);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const toggleAmenity = (item: Amenity) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAirbnb = parseAirbnbListingUrl(airbnbUrl);
    if (!parsedAirbnb) {
      setErrorMsg('Please enter a valid Airbnb listing URL.');
      return;
    }

    setIsSaving(true);
    try {
      let city = property.city;
      let state = property.state;
      let zipCode = property.zipCode;
      let neighborhood = property.neighborhood;
      let formattedAddress = address.trim();
      let latitude = property.latitude;
      let longitude = property.longitude;

      if (address.trim() !== property.address) {
        const loc = await validateAndResolveUsLocation(address);
        if (!loc.ok) {
          setErrorMsg(loc.error);
          return;
        }
        city = loc.city;
        state = loc.state;
        zipCode = loc.zipCode;
        neighborhood = loc.neighborhood;
        formattedAddress = loc.formattedAddress;
        latitude = loc.latitude;
        longitude = loc.longitude;
      }

      const parsedPrice = nightlyPrice.trim() ? Math.round(Number(nightlyPrice)) : null;
      const parsedBaths = bathrooms.trim() ? Number(bathrooms) : null;
      const parsedGuests = guestCapacity.trim() ? Math.round(Number(guestCapacity)) : null;
      const normalizedBedrooms =
        propertyType === 'studio'
          ? 0
          : propertyType === 'entire_home'
            ? Math.max(1, Math.round(Number(bedrooms) || 1))
            : Math.max(0, Math.round(Number(bedrooms) || 0));

      onSave({
        ...property,
        name: name.trim() || property.name,
        airbnbUrl: parsedAirbnb.normalizedUrl,
        airbnbRoomId: parsedAirbnb.roomId,
        address: formattedAddress,
        city,
        state,
        zipCode,
        neighborhood,
        latitude,
        longitude,
        propertyType,
        bedrooms: normalizedBedrooms,
        bathrooms: parsedBaths !== null && parsedBaths >= 0 ? parsedBaths : null,
        guestCapacity: parsedGuests !== null && parsedGuests >= 1 ? parsedGuests : null,
        nightlyPrice: parsedPrice !== null && parsedPrice > 0 ? parsedPrice : null,
        photoUrl: photoUrl.trim() || null,
        amenities,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-host-property-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="edit-host-property-title" className="text-lg font-semibold text-slate-900">
            Edit property
          </h2>
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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="edit-prop-name" className="field-label">
              Property name
            </label>
            <input
              id="edit-prop-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-prop-price" className="field-label">
                My current nightly price ($)
              </label>
              <input
                id="edit-prop-price"
                type="number"
                min={10}
                placeholder="e.g. 265"
                value={nightlyPrice}
                onChange={(e) => setNightlyPrice(e.target.value)}
                className="input-field tabular"
              />
            </div>

            <div>
              <label htmlFor="edit-prop-type" className="field-label">
                Property type
              </label>
              <select
                id="edit-prop-type"
                value={propertyType}
                onChange={(e) => {
                  const nextType = e.target.value as PropertyType;
                  setPropertyType(nextType);
                  if (nextType === 'studio') {
                    setBedrooms('0');
                  } else if (nextType === 'entire_home' && (Number(bedrooms) || 0) === 0) {
                    setBedrooms('1');
                  }
                }}
                className="input-field"
              >
                <option value="entire_home">Entire home</option>
                <option value="studio">Studio</option>
                <option value="private_room">Private room</option>
                <option value="shared_room">Shared room</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="edit-prop-beds" className="field-label">
                Bedrooms
              </label>
              <input
                id="edit-prop-beds"
                type="number"
                min={propertyType === 'entire_home' ? 1 : 0}
                max={20}
                disabled={propertyType === 'studio'}
                value={propertyType === 'studio' ? '0' : bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="input-field tabular disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="edit-prop-baths" className="field-label">
                Bathrooms
              </label>
              <input
                id="edit-prop-baths"
                type="number"
                min={0}
                step="0.5"
                placeholder="Optional"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="input-field tabular"
              />
            </div>

            <div>
              <label htmlFor="edit-prop-guests" className="field-label">
                Guests
              </label>
              <input
                id="edit-prop-guests"
                type="number"
                min={1}
                placeholder="Optional"
                value={guestCapacity}
                onChange={(e) => setGuestCapacity(e.target.value)}
                className="input-field tabular"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-prop-address" className="field-label">
              US address or ZIP code
            </label>
            <input
              id="edit-prop-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="edit-prop-url" className="field-label">
              Airbnb listing URL
            </label>
            <input
              id="edit-prop-url"
              type="url"
              required
              value={airbnbUrl}
              onChange={(e) => setAirbnbUrl(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="edit-prop-photo" className="field-label">
              Property photo URL (optional)
            </label>
            <input
              id="edit-prop-photo"
              type="url"
              placeholder="https://..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <span className="field-label">Key amenities</span>
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

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onResetProperty}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove property</span>
            </button>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save changes</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
