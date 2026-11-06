import React from 'react';
import { PropertyHouse } from '../types';
import { Home, MapPin, AlertCircle, Sparkles, UserCheck, Shield } from 'lucide-react';

interface PropertySelectorProps {
  houses: PropertyHouse[];
  selectedHouseId: string;
  onSelectHouse: (id: string) => void;
  onEditAddress: (houseId: string, newAddress: string) => void;
}

export const PropertySelector: React.FC<PropertySelectorProps> = ({
  houses,
  selectedHouseId,
  onSelectHouse,
  onEditAddress,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [addressInput, setAddressInput] = React.useState('');

  const startEdit = (house: PropertyHouse) => {
    setEditingId(house.id);
    setAddressInput(house.address);
  };

  const saveEdit = (houseId: string) => {
    if (addressInput.trim()) {
      onEditAddress(houseId, addressInput.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📜</span>
            <h2 className="text-base font-serif font-bold text-blue-950 tracking-tight">
              Carlos's DC Portfolio • Supervised by Moisha
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a property to inspect neighbor prices, calculate 5-day empty windows, and deploy smart promotions.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-blue-900 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200 font-semibold shadow-xs">
          <UserCheck className="w-3.5 h-3.5 text-blue-700" />
          <span>PM On Duty: Carlos R.</span>
        </div>
      </div>

      {/* House Toggle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {houses.map((house) => {
          const isSelected = house.id === selectedHouseId;
          const hasEmptyGap = house.unbookedDaysCount > 0;

          return (
            <div
              key={house.id}
              onClick={() => onSelectHouse(house.id)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all text-left relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-br from-[#FEFDFB] via-[#FFFDF9] to-[#FBF7EE] border-blue-600 shadow-md ring-2 ring-blue-500/30'
                  : 'bg-[#FAF8F5] border-[#E8DFD3] hover:border-slate-300 hover:bg-white'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-blue-700 to-blue-800 text-[10px] font-mono font-bold text-white rounded-bl-xl shadow-xs">
                  ACTIVE IN MOISHA POCKET
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg ${
                    isSelected ? 'bg-blue-700 text-white shadow-sm' : 'bg-stone-200 text-slate-700'
                  }`}>
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-blue-950 flex items-center gap-2">
                      <span>{house.nickname}</span>
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{house.title}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Rate</span>
                  <span className="text-lg font-bold text-blue-950 font-mono">${house.currentPrice}</span>
                  <span className="text-xs text-slate-400">/nt</span>
                </div>
              </div>

              {/* Physical Address Section */}
              <div className="mt-4 pt-3 border-t border-[#E8DFD3]/80">
                {editingId === house.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      className="flex-1 bg-white border border-blue-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none shadow-xs"
                    />
                    <button
                      onClick={() => saveEdit(house.id)}
                      className="px-3 py-1.5 bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-800"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="truncate text-xs font-mono font-bold text-slate-800" title={house.address}>
                        {house.address}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(house);
                      }}
                      className="text-[11px] text-blue-700 hover:text-blue-900 underline ml-2 shrink-0 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Vacancy Gap Status Pill */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                {hasEmptyGap ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-mono text-[11px] font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      {house.unbookedDaysCount} Empty Days ({house.unbookedStartDate.slice(5)} - {house.unbookedEndDate.slice(5)})
                    </span>
                  </div>
                ) : (
                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold border border-emerald-200">
                    Full House • 100% Booked
                  </span>
                )}

                <div className="text-[11px] text-slate-600 font-mono">
                  Floor: <span className="text-slate-900 font-bold">${house.floorPrice}/nt</span>
                </div>
              </div>

              {/* Active Promotion Pill */}
              {house.activePromotion && (
                <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Active: {house.activePromotion.badge}
                  </span>
                  <span className="font-bold font-mono text-blue-950">${house.activePromotion.effectivePrice}/nt</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
