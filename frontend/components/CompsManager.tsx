import React, { useState } from 'react';
import { ExternalLink, Star, Plus, Trash2, RefreshCw, MapPin, X } from 'lucide-react';
import { ListingComp, PropertyHouse } from '../types';

interface CompsManagerProps {
  house: PropertyHouse;
  comps: ListingComp[];
  myPrice: number;
  onUpdateComp: (id: string, updates: Partial<ListingComp>) => void;
  onAddComp: (newComp: Omit<ListingComp, 'id'>) => void;
  onDeleteComp: (id: string) => void;
  onSimulateNeighborUndercut: () => void;
}

export const CompsManager: React.FC<CompsManagerProps> = ({
  house,
  comps,
  myPrice,
  onUpdateComp,
  onAddComp,
  onDeleteComp,
  onSimulateNeighborUndercut,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPrice, setNewPrice] = useState('215');
  const [newBeds, setNewBeds] = useState(String(house.bedrooms));
  const [newRating, setNewRating] = useState('4.90');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const priceNum = Math.max(50, Number(newPrice) || 215);

    onAddComp({
      name: newName.trim(),
      address: newAddress.trim() || house.neighborhood,
      airbnbUrl: newUrl.trim() || 'https://www.airbnb.com',
      bedrooms: Math.max(0, Number(newBeds) || house.bedrooms),
      bathrooms: house.bathrooms,
      rating: Math.min(5, Math.max(1, Number(newRating) || 4.9)),
      reviewsCount: 45,
      currentPrice: priceNum,
      originalPrice: priceNum,
      isBooked: false,
      distanceMiles: 0.12,
      superhost: true,
      priceHistory: [{ date: 'Today', price: priceNum }],
    });

    setNewName('');
    setNewAddress('');
    setNewUrl('');
    setShowAddModal(false);
  };

  return (
    <section aria-label="Comparable neighbor listings" className="card p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-moisha-navy">
              Comparable Neighbors Around {house.address.split(',')[0]}
            </h3>
            <span className="rounded-full bg-moisha-sand px-2.5 py-0.5 text-xs font-bold text-moisha-navy border border-moisha-border">
              {comps.length} tracked
            </span>
          </div>
          <p className="mt-0.5 text-xs text-moisha-muted">
            {house.neighborhood} ({house.zipCode}) · Adjust any comp price or status to see Moisha recalculate live.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSimulateNeighborUndercut}
            disabled={comps.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-moisha-butter px-3 py-2 text-xs font-bold text-moisha-amber transition-colors hover:bg-amber-200/70 disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Simulate Neighbor Drop (-$25)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-moisha-navy px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-950"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Neighbor</span>
          </button>
        </div>
      </div>

      {/* Comps Grid */}
      {comps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-moisha-border bg-moisha-sand p-8 text-center text-xs text-moisha-muted">
          No comparable listings tracked yet. Click <strong>Add Neighbor</strong> to benchmark your nightly rate.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {comps.map((comp) => {
            const deltaVsMe = comp.currentPrice - myPrice;
            const isUndercutting = !comp.isBooked && deltaVsMe < 0;

            return (
              <div
                key={comp.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                  comp.isBooked
                    ? 'border-moisha-border bg-moisha-sand/50 opacity-85'
                    : isUndercutting
                      ? 'border-amber-300 bg-moisha-butter/40'
                      : 'border-moisha-border bg-moisha-sand/80'
                }`}
              >
                <div>
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <h4
                      className="line-clamp-1 text-sm font-bold text-moisha-navy"
                      title={comp.name}
                    >
                      {comp.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onDeleteComp(comp.id)}
                      aria-label={`Remove ${comp.name}`}
                      className="shrink-0 rounded p-1 text-moisha-muted hover:text-moisha-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {comp.address && (
                    <div className="mb-2 flex items-center gap-1 text-[11px] text-moisha-muted">
                      <MapPin className="h-3 w-3 shrink-0 text-moisha-amber" />
                      <span className="truncate">{comp.address}</span>
                    </div>
                  )}

                  <div className="mb-2 text-[11px] text-moisha-muted">
                    {comp.bedrooms} BR · {comp.bathrooms} BA · {comp.distanceMiles} mi
                  </div>

                  <div className="my-2 flex items-center justify-between border-y border-moisha-border py-1.5 text-xs">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      <span className="font-bold text-moisha-navy">{comp.rating}</span>
                      <span className="text-[10px] text-moisha-muted">({comp.reviewsCount})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpdateComp(comp.id, { isBooked: !comp.isBooked })}
                      className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        comp.isBooked
                          ? 'border-emerald-200 bg-moisha-mint text-moisha-green'
                          : 'border-amber-300 bg-moisha-butter text-moisha-amber'
                      }`}
                    >
                      {comp.isBooked ? '✓ Booked' : '○ Vacant'}
                    </button>
                  </div>

                  {/* Price Row */}
                  <div className="my-2 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-moisha-muted uppercase">
                        Rate
                      </span>
                      <span className="text-lg font-extrabold text-moisha-navy">
                        ${comp.currentPrice}
                      </span>
                      <span className="text-[11px] text-moisha-muted">/nt</span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-moisha-muted uppercase">
                        Vs You
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isUndercutting
                            ? 'text-moisha-amber'
                            : deltaVsMe > 0
                              ? 'text-moisha-green'
                              : 'text-moisha-muted'
                        }`}
                      >
                        {deltaVsMe < 0
                          ? `-$${Math.abs(deltaVsMe)}`
                          : deltaVsMe > 0
                            ? `+$${deltaVsMe}`
                            : 'Equal'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Adjust Controls */}
                <div className="mt-2 flex items-center justify-between border-t border-moisha-border pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateComp(comp.id, {
                          currentPrice: Math.max(95, comp.currentPrice - 15),
                        })
                      }
                      className="rounded-md border border-moisha-border bg-white px-2 py-0.5 text-[11px] font-bold text-moisha-navy hover:bg-moisha-sand"
                    >
                      -$15
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateComp(comp.id, { currentPrice: comp.currentPrice + 15 })
                      }
                      className="rounded-md border border-moisha-border bg-white px-2 py-0.5 text-[11px] font-bold text-moisha-navy hover:bg-moisha-sand"
                    >
                      +$15
                    </button>
                  </div>

                  <a
                    href={comp.airbnbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-moisha-royal hover:underline"
                  >
                    <span>Listing</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Comp Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-moisha-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-moisha-navy">Add Neighbor Comp</h3>
                <p className="text-xs text-moisha-muted">
                  Track a competing rental near {house.nickname}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-moisha-muted hover:bg-moisha-sand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">Listing Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern 3BR Garden Suite"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="field text-sm"
                />
              </div>

              <div>
                <label className="label">Street / Distance Note</label>
                <input
                  type="text"
                  placeholder="e.g. 2 doors down"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="field text-sm"
                />
              </div>

              <div>
                <label className="label">Listing URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://www.airbnb.com/rooms/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="field text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Price ($/nt)</label>
                  <input
                    type="number"
                    min={50}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="field text-sm"
                  />
                </div>
                <div>
                  <label className="label">Bedrooms</label>
                  <input
                    type="number"
                    min={0}
                    value={newBeds}
                    onChange={(e) => setNewBeds(e.target.value)}
                    className="field text-sm"
                  />
                </div>
                <div>
                  <label className="label">Rating</label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    max={5}
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    className="field text-sm"
                  />
                </div>
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
                  Save Neighbor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
