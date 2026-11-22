import React, { useState, useEffect } from 'react';
import { Home, MapPin, AlertCircle, Sparkles, Edit3, Trash2, X, Search, Loader2 } from 'lucide-react';
import { PropertyHouse } from '../types';
import { daysBetweenIso } from '../services/pricingEngine';
import {
  buildPropertyFromAnyAddress,
  geocodeAddressWithNominatim,
} from '../services/addressService';

interface PropertySelectorProps {
  houses: PropertyHouse[];
  selectedHouseId: string;
  onSelectHouse: (id: string) => void;
  onUpdateHouse: (houseId: string, updates: Partial<PropertyHouse>) => void;
  onAddHouse: (house: PropertyHouse) => void;
  onDeleteHouse: (houseId: string) => void;
}

export const PropertySelector: React.FC<PropertySelectorProps> = ({
  houses,
  selectedHouseId,
  onSelectHouse,
  onUpdateHouse,
  onAddHouse,
  onDeleteHouse,
}) => {
  const [quickAddress, setQuickAddress] = useState('');
  const [quickBeds, setQuickBeds] = useState('2');
  const [quickRate, setQuickRate] = useState('245');
  const [quickFloor, setQuickFloor] = useState('175');
  const [quickNights, setQuickNights] = useState('4');
  const [isLocating, setIsLocating] = useState(false);

  const [editingHouse, setEditingHouse] = useState<PropertyHouse | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editCurrentPrice, setEditCurrentPrice] = useState('');
  const [editFloorPrice, setEditFloorPrice] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editIsBooked, setEditIsBooked] = useState(false);

  useEffect(() => {
    if (!editingHouse) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingHouse(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingHouse]);

  const handleQuickAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickAddress.trim();
    if (!trimmed || isLocating) return;

    setIsLocating(true);
    try {
      const geocoded = await geocodeAddressWithNominatim(trimmed);
      const created = buildPropertyFromAnyAddress({
        rawAddress: trimmed,
        bedrooms: Number(quickBeds) || 2,
        currentPrice: Number(quickRate) || 245,
        floorPrice: Number(quickFloor) || 175,
        unbookedNights: Number(quickNights) || 4,
        geocoded,
      });

      onAddHouse(created);
      setQuickAddress('');
    } finally {
      setIsLocating(false);
    }
  };

  const openEditModal = (house: PropertyHouse) => {
    setEditingHouse(house);
    setEditNickname(house.nickname);
    setEditAddress(house.address);
    setEditNeighborhood(house.neighborhood);
    setEditZip(house.zipCode);
    setEditCurrentPrice(String(house.currentPrice));
    setEditFloorPrice(String(house.floorPrice));
    setEditStartDate(house.unbookedStartDate);
    setEditEndDate(house.unbookedEndDate);
    setEditIsBooked(house.isBooked);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHouse) return;
    const computedNights = editIsBooked ? 0 : Math.max(1, daysBetweenIso(editStartDate, editEndDate));
    const safeFloor = Math.max(35, Number(editFloorPrice) || editingHouse.floorPrice);
    const safePrice = Math.max(40, Number(editCurrentPrice) || editingHouse.currentPrice);

    onUpdateHouse(editingHouse.id, {
      nickname: editNickname.trim() || editingHouse.nickname,
      address: editAddress.trim() || editingHouse.address,
      neighborhood: editNeighborhood.trim() || editingHouse.neighborhood,
      zipCode: editZip.trim() || editingHouse.zipCode,
      currentPrice: safePrice,
      floorPrice: safeFloor,
      unbookedStartDate: editStartDate,
      unbookedEndDate: editEndDate,
      unbookedDaysCount: computedNights,
      isBooked: editIsBooked,
    });
    setEditingHouse(null);
  };

  return (
    <section aria-label="Property address lookup and portfolio" className="space-y-5">
      <div className="card border-moisha-royal/30 bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Search className="h-5 w-5 text-moisha-royal" />
            <h2 className="text-lg font-extrabold text-moisha-navy sm:text-xl">
              Enter Your Rental Property Address
            </h2>
          </div>
          <span className="text-sm text-moisha-muted">
            Type any street address, city, or ZIP code to start pricing
          </span>
        </div>

        <form onSubmit={(e) => void handleQuickAddressSubmit(e)} className="space-y-4">
          <label className="block">
            <span className="label">Street Address, City, or ZIP Code *</span>
            <input
              id="rental-address-input"
              type="text"
              required
              placeholder="Enter street address, city, or ZIP code"
              value={quickAddress}
              onChange={(e) => setQuickAddress(e.target.value)}
              className="field text-base"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className="block">
              <span className="label">Bedrooms</span>
              <input
                type="number"
                min={0}
                max={15}
                value={quickBeds}
                onChange={(e) => setQuickBeds(e.target.value)}
                className="field font-bold"
              />
            </label>

            <label className="block">
              <span className="label">Your Rate ($/nt)</span>
              <input
                type="number"
                min={40}
                value={quickRate}
                onChange={(e) => setQuickRate(e.target.value)}
                className="field font-bold"
              />
            </label>

            <label className="block">
              <span className="label">Floor Price ($)</span>
              <input
                type="number"
                min={35}
                value={quickFloor}
                onChange={(e) => setQuickFloor(e.target.value)}
                className="field font-bold"
              />
            </label>

            <label className="block">
              <span className="label">Empty Nights</span>
              <input
                type="number"
                min={1}
                max={30}
                value={quickNights}
                onChange={(e) => setQuickNights(e.target.value)}
                className="field font-bold"
              />
            </label>

            <div className="col-span-2 flex items-end sm:col-span-1">
              <button
                type="submit"
                disabled={isLocating}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-moisha-royal px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <span>Check Address</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {houses.length > 0 && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-moisha-navy">
                Your Properties ({houses.length})
              </h3>
              <p className="text-sm text-moisha-muted">
                Click a property to view its pricing advice, or click Edit to adjust dates, floor price, or delete it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {houses.map((house) => {
              const isSelected = house.id === selectedHouseId;
              const hasGap = !house.isBooked && house.unbookedDaysCount > 0;

              return (
                <article
                  key={house.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                    isSelected
                      ? 'border-moisha-royal bg-white shadow-sm ring-2 ring-moisha-royal/20'
                      : 'border-moisha-border bg-moisha-sand/70 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectHouse(house.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isSelected
                              ? 'bg-moisha-navy text-white'
                              : 'border border-moisha-border bg-white text-moisha-navy'
                          }`}
                        >
                          <Home className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-base font-bold text-moisha-navy">
                            {house.nickname}
                          </h4>
                          <p className="truncate text-sm text-moisha-muted">
                            {house.bedrooms} BR · {house.bathrooms} BA · {house.zipCode}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xl font-extrabold text-moisha-navy">
                          ${house.currentPrice}
                          <span className="text-xs font-normal text-moisha-muted">/nt</span>
                        </div>
                        <div className="text-xs font-medium text-moisha-muted">
                          Floor ${house.floorPrice}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {hasGap ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-moisha-butter px-3 py-1 text-xs font-bold text-moisha-amber">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {house.unbookedDaysCount} Empty Nights ({house.unbookedStartDate.slice(5)}–
                          {house.unbookedEndDate.slice(5)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-moisha-mint px-3 py-1 text-xs font-bold text-moisha-green">
                          ✓ Booked Window
                        </span>
                      )}

                      {house.activePromotion && (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-moisha-sky px-2.5 py-1 text-xs font-bold text-moisha-royal">
                          <Sparkles className="h-3.5 w-3.5" />
                          Promo ${house.activePromotion.effectivePrice}/nt
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-moisha-border/70 pt-3 text-sm">
                    <div className="flex min-w-0 items-center gap-1.5 text-moisha-muted">
                      <MapPin className="h-4 w-4 shrink-0 text-moisha-amber" />
                      <span
                        className="truncate text-sm font-medium text-moisha-navy"
                        title={house.address}
                      >
                        {house.address}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditModal(house)}
                      aria-label={`Edit ${house.nickname}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold text-moisha-royal hover:bg-moisha-sky"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {editingHouse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-property-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-moisha-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="edit-property-dialog-title" className="text-lg font-bold text-moisha-navy">
                Edit Property &amp; Calendar Gap
              </h3>
              <button
                type="button"
                onClick={() => setEditingHouse(null)}
                aria-label="Close edit modal"
                className="rounded-lg p-1.5 text-moisha-muted hover:bg-moisha-sand"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <label className="block">
                <span className="label">Nickname</span>
                <input
                  type="text"
                  required
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Street Address</span>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="field"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Neighborhood / City</span>
                  <input
                    type="text"
                    value={editNeighborhood}
                    onChange={(e) => setEditNeighborhood(e.target.value)}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="label">ZIP / Postal Code</span>
                  <input
                    type="text"
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                    className="field"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Current Rate ($/nt)</span>
                  <input
                    type="number"
                    min={40}
                    value={editCurrentPrice}
                    onChange={(e) => setEditCurrentPrice(e.target.value)}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="label">Safety Floor ($/nt)</span>
                  <input
                    type="number"
                    min={35}
                    value={editFloorPrice}
                    onChange={(e) => setEditFloorPrice(e.target.value)}
                    className="field"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Gap Check-In</span>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="label">Gap Check-Out</span>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="field"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2.5 pt-1 text-sm font-medium text-moisha-navy">
                <input
                  type="checkbox"
                  checked={editIsBooked}
                  onChange={(e) => setEditIsBooked(e.target.checked)}
                  className="h-4 w-4 rounded border-moisha-border text-moisha-royal"
                />
                <span>Mark this date window as already booked</span>
              </label>

              <div className="flex items-center justify-between border-t border-moisha-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteHouse(editingHouse.id);
                    setEditingHouse(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-moisha-red hover:bg-moisha-blush"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingHouse(null)}
                    className="btn-quiet"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
