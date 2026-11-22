import React, { useState, useEffect } from 'react';
import { Home, MapPin, AlertCircle, Sparkles, Edit3, Trash2, X, Search } from 'lucide-react';
import { PropertyHouse } from '../types';
import { daysBetweenIso } from '../services/pricingEngine';
import { buildPropertyFromAnyAddress } from '../services/addressService';

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
  // Prominent Quick-Address Lookup Bar State
  const [quickAddress, setQuickAddress] = useState('');
  const [quickBeds, setQuickBeds] = useState('2');
  const [quickRate, setQuickRate] = useState('245');
  const [quickFloor, setQuickFloor] = useState('175');
  const [quickNights, setQuickNights] = useState('4');

  // Edit Property Modal State
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

  const handleQuickAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddress.trim()) return;

    const created = buildPropertyFromAnyAddress({
      rawAddress: quickAddress,
      bedrooms: Number(quickBeds) || 2,
      currentPrice: Number(quickRate) || 245,
      floorPrice: Number(quickFloor) || 175,
      unbookedNights: Number(quickNights) || 4,
    });

    onAddHouse(created);
    setQuickAddress('');
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
    const safeFloor = Math.max(40, Number(editFloorPrice) || editingHouse.floorPrice);
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
    <section aria-label="Property address lookup and portfolio" className="space-y-4">
      {/* Front-and-Center Any-Address Lookup Card */}
      <div className="card border-moisha-royal/30 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-moisha-royal" />
            <h2 className="text-base font-extrabold text-moisha-navy">
              Check Any Rental Address
            </h2>
          </div>
          <span className="text-xs text-moisha-muted">
            Enter any street address, city, or ZIP to generate instant pricing &amp; profit advice
          </span>
        </div>

        <form
          onSubmit={handleQuickAddressSubmit}
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-6 lg:grid-cols-12"
        >
          <label className="col-span-2 sm:col-span-6 lg:col-span-5">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">
              Property Address, City, or ZIP *
            </span>
            <input
              type="text"
              required
              placeholder="e.g. 420 Main St, Nashville, TN 37206"
              value={quickAddress}
              onChange={(e) => setQuickAddress(e.target.value)}
              className="field min-h-10 text-xs"
            />
          </label>

          <label className="col-span-1 sm:col-span-1 lg:col-span-1">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">Beds</span>
            <input
              type="number"
              min={0}
              max={15}
              value={quickBeds}
              onChange={(e) => setQuickBeds(e.target.value)}
              className="field min-h-10 px-2.5 text-xs font-bold"
            />
          </label>

          <label className="col-span-1 sm:col-span-1 lg:col-span-2">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">
              Your Rate ($/nt)
            </span>
            <input
              type="number"
              min={40}
              value={quickRate}
              onChange={(e) => setQuickRate(e.target.value)}
              className="field min-h-10 px-2.5 text-xs font-bold"
            />
          </label>

          <label className="col-span-1 sm:col-span-1 lg:col-span-1">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">
              Floor ($)
            </span>
            <input
              type="number"
              min={35}
              value={quickFloor}
              onChange={(e) => setQuickFloor(e.target.value)}
              className="field min-h-10 px-2.5 text-xs font-bold"
            />
          </label>

          <label className="col-span-1 sm:col-span-1 lg:col-span-1">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">
              Empty Nts
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={quickNights}
              onChange={(e) => setQuickNights(e.target.value)}
              className="field min-h-10 px-2.5 text-xs font-bold"
            />
          </label>

          <div className="col-span-2 flex items-end sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-moisha-royal px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <span>Check Address</span>
            </button>
          </div>
        </form>
      </div>

      {/* Portfolio & Sample Properties Strip */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-moisha-navy">
              Active Properties &amp; Example Scenarios ({houses.length})
            </h3>
            <p className="text-xs text-moisha-muted">
              Click any property to inspect its pricing recommendation, or edit/remove examples anytime.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {houses.map((house) => {
            const isSelected = house.id === selectedHouseId;
            const hasGap = !house.isBooked && house.unbookedDaysCount > 0;

            return (
              <article
                key={house.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isSelected
                            ? 'bg-moisha-navy text-white'
                            : 'border border-moisha-border bg-white text-moisha-navy'
                        }`}
                      >
                        <Home className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-moisha-navy">
                          {house.nickname}
                        </h4>
                        <p className="truncate text-[11px] text-moisha-muted">
                          {house.bedrooms} BR · {house.bathrooms} BA · {house.zipCode}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-base font-extrabold text-moisha-navy">
                        ${house.currentPrice}
                        <span className="text-[11px] font-normal text-moisha-muted">/nt</span>
                      </div>
                      <div className="text-[10px] font-medium text-moisha-muted">
                        Floor ${house.floorPrice}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
                    {hasGap ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-moisha-butter px-2.5 py-0.5 text-[11px] font-bold text-moisha-amber">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {house.unbookedDaysCount} Empty Nights ({house.unbookedStartDate.slice(5)}–
                        {house.unbookedEndDate.slice(5)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-moisha-mint px-2.5 py-0.5 text-[11px] font-bold text-moisha-green">
                        ✓ Booked Window
                      </span>
                    )}

                    {house.activePromotion && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-moisha-sky px-2 py-0.5 text-[10px] font-bold text-moisha-royal">
                        <Sparkles className="h-3 w-3" />
                        Promo ${house.activePromotion.effectivePrice}/nt
                      </span>
                    )}
                  </div>
                </button>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-moisha-border/70 pt-2.5 text-xs">
                  <div className="flex min-w-0 items-center gap-1.5 text-moisha-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-moisha-amber" />
                    <span
                      className="truncate text-[11px] font-medium text-moisha-navy"
                      title={house.address}
                    >
                      {house.address}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal(house)}
                    aria-label={`Edit ${house.nickname}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-moisha-royal hover:bg-moisha-sky"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Edit Property Modal */}
      {editingHouse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-property-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-moisha-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="edit-property-dialog-title" className="text-base font-bold text-moisha-navy">
                Edit Property &amp; Calendar Gap
              </h3>
              <button
                type="button"
                onClick={() => setEditingHouse(null)}
                aria-label="Close edit modal"
                className="rounded-lg p-1 text-moisha-muted hover:bg-moisha-sand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <label className="block">
                <span className="label">Nickname</span>
                <input
                  type="text"
                  required
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="field text-sm"
                />
              </label>

              <label className="block">
                <span className="label">Street Address</span>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="field text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Neighborhood / City</span>
                  <input
                    type="text"
                    value={editNeighborhood}
                    onChange={(e) => setEditNeighborhood(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">ZIP / Postal Code</span>
                  <input
                    type="text"
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                    className="field text-sm"
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
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">Safety Floor ($/nt)</span>
                  <input
                    type="number"
                    min={35}
                    value={editFloorPrice}
                    onChange={(e) => setEditFloorPrice(e.target.value)}
                    className="field text-sm"
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
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">Gap Check-Out</span>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="field text-sm"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs font-medium text-moisha-navy">
                <input
                  type="checkbox"
                  checked={editIsBooked}
                  onChange={(e) => setEditIsBooked(e.target.checked)}
                  className="h-4 w-4 rounded border-moisha-border text-moisha-royal"
                />
                <span>Mark this date window as already booked</span>
              </label>

              <div className="flex items-center justify-between border-t border-moisha-border pt-4">
                {houses.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteHouse(editingHouse.id);
                      setEditingHouse(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-moisha-red hover:bg-moisha-blush"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHouse(null)}
                    className="btn-quiet text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-xs">
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
