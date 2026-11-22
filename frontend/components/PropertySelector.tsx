import React, { useState, useEffect } from 'react';
import { Home, MapPin, AlertCircle, Sparkles, Plus, Edit3, Trash2, X } from 'lucide-react';
import { PropertyHouse } from '../types';
import { addDaysIso } from '../constants';
import { daysBetweenIso } from '../services/pricingEngine';

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
  const [editingHouse, setEditingHouse] = useState<PropertyHouse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [zipCode, setZipCode] = useState('20002');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [currentPrice, setCurrentPrice] = useState('245');
  const [floorPrice, setFloorPrice] = useState('175');
  const [cleaningFee, setCleaningFee] = useState('130');
  const [startDate, setStartDate] = useState(() => addDaysIso(new Date(), 2));
  const [endDate, setEndDate] = useState(() => addDaysIso(new Date(), 6));

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
    if (!editingHouse && !showAddModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingHouse(null);
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingHouse, showAddModal]);

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

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !address.trim()) return;

    const baseRate = Math.max(50, Number(currentPrice) || 245);
    const floorRate = Math.max(40, Number(floorPrice) || 175);
    const gapNights = Math.max(1, daysBetweenIso(startDate, endDate) || 4);
    const beds = Math.max(0, Number(bedrooms) || 2);
    const baths = Math.max(1, Number(bathrooms) || 1);
    const id = `house-${Date.now()}`;

    const sampleCompPrice = Math.max(floorRate, Math.round(baseRate * 0.88));
    const created: PropertyHouse = {
      id,
      nickname: nickname.trim(),
      title: title.trim() || `${beds}BR Rental · ${neighborhood.trim() || 'Local Submarket'}`,
      address: address.trim(),
      neighborhood: neighborhood.trim() || 'Local Neighborhood',
      zipCode: zipCode.trim() || '20002',
      bedrooms: beds,
      bathrooms: baths,
      currentPrice: baseRate,
      floorPrice: floorRate,
      cleaningFee: Math.max(0, Number(cleaningFee) || 125),
      cleaningCost: Math.max(0, Math.round((Number(cleaningFee) || 125) * 0.88)),
      nightlyFixedCost: Math.round(floorRate * 0.65),
      hostServiceFeePercent: 3,
      unbookedDaysCount: gapNights,
      unbookedStartDate: startDate,
      unbookedEndDate: endDate,
      isBooked: false,
      propertyManagerName: houses[0]?.propertyManagerName || 'Host',
      managerPhone: houses[0]?.managerPhone || '+1 (202) 555-0189',
      activePromotion: null,
      comps: [
        {
          id: `comp-${id}-1`,
          name: `Nearby ${beds}BR Neighbor #1`,
          address: `Adjacent block (${zipCode.trim() || 'local'})`,
          airbnbUrl: 'https://www.airbnb.com',
          bedrooms: beds,
          bathrooms: baths,
          rating: 4.91,
          reviewsCount: 84,
          currentPrice: sampleCompPrice,
          originalPrice: baseRate,
          isBooked: false,
          distanceMiles: 0.08,
          superhost: true,
          priceHistory: [{ date: 'Today', price: sampleCompPrice }],
        },
        {
          id: `comp-${id}-2`,
          name: `Nearby ${beds}BR Neighbor #2`,
          address: `2 blocks away (${zipCode.trim() || 'local'})`,
          airbnbUrl: 'https://www.airbnb.com',
          bedrooms: beds,
          bathrooms: baths,
          rating: 4.95,
          reviewsCount: 142,
          currentPrice: Math.round(baseRate * 1.08),
          originalPrice: Math.round(baseRate * 1.08),
          isBooked: true,
          distanceMiles: 0.22,
          superhost: true,
          priceHistory: [{ date: 'Today', price: Math.round(baseRate * 1.08) }],
        },
      ],
    };

    onAddHouse(created);
    setNickname('');
    setTitle('');
    setAddress('');
    setNeighborhood('');
    setShowAddModal(false);
  };

  return (
    <section aria-label="Property portfolio" className="card p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold text-moisha-navy">Your Rental Portfolio</h2>
          <p className="text-xs text-moisha-muted">
            Select a property to compare neighbor rates, inspect empty calendar dates, and calculate net profit.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-moisha-border bg-moisha-sand px-3.5 py-2 text-xs font-bold text-moisha-navy transition-colors hover:bg-white sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5 text-moisha-royal" />
          <span>Add Property</span>
        </button>
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
                      <h3 className="truncate text-sm font-bold text-moisha-navy">
                        {house.nickname}
                      </h3>
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
                Edit Property & Calendar Gap
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
                  <span className="label">Neighborhood</span>
                  <input
                    type="text"
                    value={editNeighborhood}
                    onChange={(e) => setEditNeighborhood(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">ZIP Code</span>
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
                    min={40}
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

      {/* Add Property Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-property-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-moisha-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 id="add-property-dialog-title" className="text-base font-bold text-moisha-navy">
                  Add Rental Property
                </h3>
                <p className="text-xs text-moisha-muted">
                  Moisha will seed initial neighborhood comps so you can start testing rates right away.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close add modal"
                className="rounded-lg p-1 text-moisha-muted hover:bg-moisha-sand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Property Nickname *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Logan Circle Rowhouse"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">Listing Title</span>
                  <input
                    type="text"
                    placeholder="e.g. Sunny 2BR Designer Flat"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="field text-sm"
                  />
                </label>
              </div>

              <label className="block">
                <span className="label">Street Address *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1420 P St NW, Washington, DC"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="field text-sm"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Neighborhood</span>
                  <input
                    type="text"
                    placeholder="e.g. Logan Circle"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">ZIP Code</span>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="field text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="label">Bedrooms</span>
                  <input
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">Bathrooms</span>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">Cleaning ($)</span>
                  <input
                    type="number"
                    min={0}
                    value={cleaningFee}
                    onChange={(e) => setCleaningFee(e.target.value)}
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
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">Safety Floor ($/nt)</span>
                  <input
                    type="number"
                    min={40}
                    value={floorPrice}
                    onChange={(e) => setFloorPrice(e.target.value)}
                    className="field text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Unbooked Check-In</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="field text-sm"
                  />
                </label>
                <label className="block">
                  <span className="label">Unbooked Check-Out</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="field text-sm"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-moisha-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-quiet text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Add to Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
