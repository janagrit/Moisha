import React from 'react';
import { PropertyHouse, AirbnbPromotion } from '../types';
import { Tag, Sparkles, Check, Bell, Shield } from 'lucide-react';

interface PromotionPlannerProps {
  house: PropertyHouse;
  promotions: AirbnbPromotion[];
  onApplyPromotion: (promo: AirbnbPromotion) => void;
  onSendReminderToPM: (promo: AirbnbPromotion) => void;
}

export const PromotionPlanner: React.FC<PromotionPlannerProps> = ({
  house,
  promotions,
  onApplyPromotion,
  onSendReminderToPM,
}) => {
  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center text-lg shadow-xs">
            🏷️
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-blue-950">
              Moisha's Airbnb Promotion & Strikethrough Badges
            </h3>
            <p className="text-xs text-slate-500">
              Targeted promotions for {house.nickname} to fill the {house.unbookedDaysCount}-day gap before neighbors book out
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
          <span className="text-slate-400">Target Gap:</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200">
            {house.unbookedStartDate} → {house.unbookedEndDate} ({house.unbookedDaysCount} days)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((promo) => {
          const isApplied = house.activePromotion?.id === promo.id;
          const savingsPerNight = house.currentPrice - promo.effectivePrice;
          const totalWindowRevenue = promo.effectivePrice * house.unbookedDaysCount;

          return (
            <div
              key={promo.id}
              className={`rounded-2xl p-5 border transition-all ${
                isApplied
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-[#FAF8F5] border-stone-200 hover:border-amber-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-block mb-1.5 shadow-2xs">
                    {promo.badge}
                  </span>
                  <h4 className="font-serif font-bold text-base text-blue-950">{promo.name}</h4>
                </div>

                <div className="text-right">
                  <div className="text-lg font-extrabold text-blue-700 font-mono">
                    ${promo.effectivePrice}
                    <span className="text-[11px] text-slate-400 font-normal">/nt</span>
                  </div>
                  <span className="text-[10px] line-through text-slate-400 font-mono">
                    ${house.currentPrice}/nt
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed mb-3.5 font-medium">
                {promo.reason}
              </p>

              <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-3 border border-stone-200 mb-3.5 text-xs font-mono shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Discount</span>
                  <span className="font-bold text-rose-600">-{promo.discountPercent}% (-${savingsPerNight}/nt)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">5-Day Gross Payout</span>
                  <span className="font-bold text-emerald-700">${totalWindowRevenue} in pocket</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-stone-200">
                <button
                  onClick={() => onSendReminderToPM(promo)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-stone-100 rounded-xl font-semibold border border-stone-200 transition-colors flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-700" />
                  <span>Alert Carlos</span>
                </button>

                <button
                  onClick={() => onApplyPromotion(promo)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    isApplied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-blue-700 hover:bg-blue-800 text-white shadow-xs active:scale-95'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Live on Airbnb</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Activate Promotion</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3.5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Safety floor of ${house.floorPrice}/night strictly respected. No loss-making bookings.
        </span>
        <span className="font-mono text-slate-400 text-[11px]">
          Syncs via Airbnb Host Promotion API
        </span>
      </div>
    </div>
  );
};
