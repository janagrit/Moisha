import React, { useState } from 'react';
import { ListingComp, PropertyHouse } from '../types';
import { ExternalLink, Star, Plus, Trash2, ArrowDown, ArrowUp, RefreshCw, MapPin } from 'lucide-react';

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
  onSimulateNeighborUndercut
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

    onAddComp({
      name: newName,
      address: newAddress || `${house.neighborhood}`,
      airbnbUrl: newUrl || 'https://airbnb.com/rooms/sample',
      bedrooms: Number(newBeds) || house.bedrooms,
      bathrooms: 2,
      rating: Number(newRating) || 4.9,
      reviewsCount: 45,
      currentPrice: Number(newPrice) || 215,
      originalPrice: Number(newPrice) || 215,
      isBooked: false,
      distanceMiles: 0.1,
      superhost: true,
      priceHistory: [{ date: 'Today', price: Number(newPrice) || 215 }]
    });

    setNewName('');
    setNewAddress('');
    setNewUrl('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-serif font-bold text-blue-950">Neighboring Comps around {house.address.split(',')[0]}</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-slate-700 font-mono font-bold">
              {comps.length} monitored
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Handpicked neighbors on Florida Ave NE, Orren St, and H St NE.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSimulateNeighborUndercut}
            title="Simulate immediate neighbor dropping price to trigger Moisha alert"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
            <span>Simulate Neighbor Price Drop</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Neighbor</span>
          </button>
        </div>
      </div>

      {/* Comps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {comps.map((comp) => {
          const deltaVsMe = comp.currentPrice - myPrice;
          const isUndercutting = !comp.isBooked && deltaVsMe < 0;

          return (
            <div
              key={comp.id}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                comp.isBooked
                  ? 'bg-stone-50/60 border-stone-200 opacity-75'
                  : isUndercutting
                  ? 'bg-amber-50/60 border-amber-300 shadow-xs'
                  : 'bg-[#FAF8F5] border-stone-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-serif font-bold text-slate-800 line-clamp-1" title={comp.name}>
                    {comp.name}
                  </h4>
                  <button
                    onClick={() => onDeleteComp(comp.id)}
                    title="Remove comp"
                    className="text-slate-400 hover:text-rose-600 p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {comp.address && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono mb-2">
                    <MapPin className="w-3 h-3 text-amber-700 shrink-0" />
                    <span className="truncate">{comp.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                  <span>{comp.bedrooms} Bed • {comp.bathrooms} Bath</span>
                  <span>•</span>
                  <span>{comp.distanceMiles} mi away</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-y border-stone-200 my-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-slate-800">{comp.rating}</span>
                    <span className="text-slate-400 text-[10px]">({comp.reviewsCount})</span>
                  </div>

                  <button
                    onClick={() => onUpdateComp(comp.id, { isBooked: !comp.isBooked })}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-colors font-bold ${
                      comp.isBooked
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    {comp.isBooked ? '✓ Booked' : '○ Vacant'}
                  </button>
                </div>

                {/* Price Display */}
                <div className="flex items-center justify-between my-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">Rate</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900 font-mono">${comp.currentPrice}</span>
                      <span className="text-[11px] text-slate-400">/nt</span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Vs Your Rate</span>
                    <span className={`text-xs font-bold flex items-center justify-end gap-0.5 ${
                      isUndercutting ? 'text-amber-800' : 'text-slate-600'
                    }`}>
                      {deltaVsMe < 0 ? (
                        <>
                          <ArrowDown className="w-3 h-3 text-amber-700" />
                          -${Math.abs(deltaVsMe)}
                        </>
                      ) : deltaVsMe > 0 ? (
                        <>
                          <ArrowUp className="w-3 h-3 text-emerald-600" />
                          +${deltaVsMe}
                        </>
                      ) : (
                        'Equal'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Adjust controls */}
              <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-stone-200">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateComp(comp.id, { currentPrice: Math.max(140, comp.currentPrice - 20) })}
                    className="px-2 py-0.5 text-[10px] rounded-md bg-white hover:bg-stone-100 text-slate-700 border border-stone-300 font-mono font-bold"
                    title="Simulate drop"
                  >
                    -$20
                  </button>
                  <button
                    onClick={() => onUpdateComp(comp.id, { currentPrice: comp.currentPrice + 20 })}
                    className="px-2 py-0.5 text-[10px] rounded-md bg-white hover:bg-stone-100 text-slate-700 border border-stone-300 font-mono font-bold"
                    title="Simulate increase"
                  >
                    +$20
                  </button>
                </div>

                <a
                  href={comp.airbnbUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-700 hover:text-blue-900 flex items-center gap-1 font-medium"
                >
                  <span>Airbnb</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Comp Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-serif font-bold text-blue-950 mb-1">Add Neighbor to Florida Ave Watch</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter details of the adjacent house or building competing for your dates.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Listing Title / Nickname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1108 Florida Ave Rowhome"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 1108 Florida Ave NE (3 doors down)"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Price ($/nt)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={newBeds}
                    onChange={(e) => setNewBeds(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-xs"
                >
                  Save Neighbor Comp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
