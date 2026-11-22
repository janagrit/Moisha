import React, { useState, useEffect } from 'react';
import { ExternalLink, Star, Plus, Trash2, RefreshCw, MapPin, X } from 'lucide-react';
import { ListingComp, PropertyHouse, sanitizeExternalUrl } from '../types';

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

  useEffect(() => {
    if (!showAddModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAddModal]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const priceNum = Math.max(50, Number(newPrice) || 215);

    onAddComp({
      name: newName.trim(),
      address: newAddress.trim() || house.neighborhood,
      airbnbUrl: sanitizeExternalUrl(newUrl),
      bedrooms: Math.max(0, Number(newBeds) || house.bedrooms),
      bathrooms: house.bathrooms,
      rating: Math.min(5, Math.max(1, Number(newRating) || 4.9)),
      reviewsCount: 45,
      currentPrice: priceNum,
      originalPrice: priceNum,
      isBooked: false,
      distanceMiles: 0.12,
      superhost: true,
      isVerified: true,
      verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priceHistory: [{ date: 'Verified Today', price: priceNum }],
    });

    setNewName('');
    setNewAddress('');
    setNewUrl('');
    setShowAddModal(false);
  };

  return (
    <section aria-label="Comparable neighbor listings" className="card p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-bold text-moisha-navy sm:text-xl">
              Comparable Neighbors Around {house.address.split(',')[0]}
            </h3>
            <span className="rounded-full border border-moisha-border bg-moisha-sand px-3 py-0.5 text-xs font-bold text-moisha-navy">
              {comps.length} tracked
            </span>
          </div>
          <p className="mt-1 text-sm text-moisha-muted">
            {house.neighborhood} ({house.zipCode}) · Adjust any comp price or status to see Moisha recalculate live.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSimulateNeighborUndercut}
            disabled={comps.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-moisha-butter px-3.5 py-2.5 text-sm font-bold text-moisha-amber transition-colors hover:bg-amber-200/70 disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Simulate Neighbor Drop (-$25)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-moisha-navy px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-950"
          >
            <Plus className="h-4 w-4" />
            <span>Add Neighbor</span>
          </button>
        </div>
      </div>

      {comps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-moisha-border bg-moisha-sand p-8 text-center text-sm text-moisha-muted">
          No comparable listings tracked yet. Click <strong>Add Neighbor</strong> to benchmark your nightly rate.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comps.map((comp) => {
            const deltaVsMe = comp.currentPrice - myPrice;
            const isUndercutting = !comp.isBooked && deltaVsMe < 0;

            return (
              <div
                key={comp.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                  comp.isBooked
                    ? 'border-moisha-border bg-moisha-sand/50 opacity-85'
                    : isUndercutting
                      ? 'border-amber-300 bg-moisha-butter/40'
                      : 'border-moisha-border bg-moisha-sand/80'
                }`}
              >
                <div>
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`mb-1 inline-block rounded px-2 py-0.5 text-xs font-bold ${
                          comp.isVerified
                            ? 'bg-moisha-mint text-moisha-green'
                            : 'bg-moisha-butter text-moisha-amber'
                        }`}
                      >
                        {comp.isVerified ? '✓ Host Verified' : '⚠️ Regional Estimate'}
                      </span>
                      <h4
                        className="line-clamp-1 text-base font-bold text-moisha-navy"
                        title={comp.name}
                      >
                        {comp.name}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteComp(comp.id)}
                      aria-label={`Remove ${comp.name}`}
                      className="shrink-0 rounded p-1 text-moisha-muted hover:text-moisha-red"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {comp.address && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-moisha-muted sm:text-sm">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-moisha-amber" />
                      <span className="truncate">{comp.address}</span>
                    </div>
                  )}

                  <div className="mb-2 text-xs text-moisha-muted sm:text-sm">
                    {comp.bedrooms} BR · {comp.bathrooms} BA · {comp.distanceMiles} mi
                  </div>

                  <div className="my-2.5 flex items-center justify-between border-y border-moisha-border py-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      <span className="font-bold text-moisha-navy">{comp.rating}</span>
                      <span className="text-xs text-moisha-muted">({comp.reviewsCount})</span>
                    </div>

                    <button
                      type="button"
                      aria-pressed={comp.isBooked}
                      onClick={() => onUpdateComp(comp.id, { isBooked: !comp.isBooked })}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                        comp.isBooked
                          ? 'border-emerald-200 bg-moisha-mint text-moisha-green'
                          : 'border-amber-300 bg-moisha-butter text-moisha-amber'
                      }`}
                    >
                      {comp.isBooked ? '✓ Booked' : '○ Vacant'}
                    </button>
                  </div>

                  <div className="my-2.5 flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-moisha-muted uppercase">
                        Rate
                      </span>
                      <span className="text-2xl font-extrabold text-moisha-navy">
                        ${comp.currentPrice}
                      </span>
                      <span className="text-xs text-moisha-muted">/nt</span>
                    </div>

                    <div className="text-right">
                      <span className="block text-xs font-bold text-moisha-muted uppercase">
                        Vs You
                      </span>
                      <span
                        className={`text-sm font-bold ${
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

                <div className="mt-3 flex items-center justify-between border-t border-moisha-border pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Decrease ${comp.name} rate by $15`}
                      onClick={() =>
                        onUpdateComp(comp.id, {
                          currentPrice: Math.max(95, comp.currentPrice - 15),
                        })
                      }
                      className="rounded-lg border border-moisha-border bg-white px-2.5 py-1 text-xs font-bold text-moisha-navy hover:bg-moisha-sand sm:text-sm"
                    >
                      -$15
                    </button>
                    <button
                      type="button"
                      aria-label={`Increase ${comp.name} rate by $15`}
                      onClick={() =>
                        onUpdateComp(comp.id, { currentPrice: comp.currentPrice + 15 })
                      }
                      className="rounded-lg border border-moisha-border bg-white px-2.5 py-1 text-xs font-bold text-moisha-navy hover:bg-moisha-sand sm:text-sm"
                    >
                      +$15
                    </button>
                  </div>

                  <a
                    href={sanitizeExternalUrl(comp.airbnbUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-moisha-royal hover:underline"
                  >
                    <span>Airbnb</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-comp-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-moisha-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 id="add-comp-dialog-title" className="text-lg font-bold text-moisha-navy">
                  Add Neighbor Comp
                </h3>
                <p className="text-sm text-moisha-muted">
                  Track a competing rental near {house.nickname}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close add comp modal"
                className="rounded-lg p-1.5 text-moisha-muted hover:bg-moisha-sand"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <label className="block">
                <span className="label">Listing Name *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern 3BR Garden Suite"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Street / Distance Note</span>
                <input
                  type="text"
                  placeholder="e.g. 2 doors down"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="field"
                />
              </label>

              <label className="block">
                <span className="label">Listing URL (optional)</span>
                <input
                  type="url"
                  placeholder="https://www.airbnb.com/rooms/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="field"
                />
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="label">Price ($/nt)</span>
                  <input
                    type="number"
                    min={50}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="label">Bedrooms</span>
                  <input
                    type="number"
                    min={0}
                    value={newBeds}
                    onChange={(e) => setNewBeds(e.target.value)}
                    className="field"
                  />
                </label>
                <label className="block">
                  <span className="label">Rating</span>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    max={5}
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    className="field"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-moisha-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-quiet"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
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
