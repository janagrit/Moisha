import React from 'react';
import { Sparkles, Check, Bell, Shield, X } from 'lucide-react';
import { PropertyHouse, AirbnbPromotion } from '../types';

interface PromotionPlannerProps {
  house: PropertyHouse;
  promotions: AirbnbPromotion[];
  effectiveFloorPrice: number;
  onApplyPromotion: (promo: AirbnbPromotion | null) => void;
  onSendReminderToPM: (promo: AirbnbPromotion) => void;
}

export const PromotionPlanner: React.FC<PromotionPlannerProps> = ({
  house,
  promotions,
  effectiveFloorPrice,
  onApplyPromotion,
  onSendReminderToPM,
}) => {
  const nights = Math.max(1, house.unbookedDaysCount);

  return (
    <section aria-label="Airbnb promotion badges" className="card p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300 bg-moisha-butter text-xl">
            🏷️
          </div>
          <div>
            <h3 className="text-lg font-bold text-moisha-navy sm:text-xl">
              Airbnb Promotion &amp; Strikethrough Badges
            </h3>
            <p className="text-sm text-moisha-muted">
              Boost search visibility for {house.nickname} without permanently lowering your base rate.
            </p>
          </div>
        </div>

        <span className="self-start rounded-lg border border-amber-200 bg-moisha-butter px-3 py-1.5 text-xs font-bold text-moisha-amber sm:self-auto sm:text-sm">
          {house.isBooked || house.unbookedDaysCount === 0
            ? 'No Unbooked Gap'
            : `${house.unbookedStartDate.slice(5)} → ${house.unbookedEndDate.slice(5)} (${house.unbookedDaysCount} nights)`}
        </span>
      </div>

      {promotions.length === 0 ? (
        <div className="rounded-2xl border border-moisha-border bg-moisha-sand p-6 text-center text-sm text-moisha-muted">
          No discount promotions needed right now — {house.nickname} is either booked, priced for upside, or promotions are disabled in Rules.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {promotions.map((promo) => {
            const isApplied = house.activePromotion?.id === promo.id;
            const savingsPerNight = Math.max(0, house.currentPrice - promo.effectivePrice);
            const totalWindowRevenue = promo.effectivePrice * nights;

            return (
              <div
                key={promo.id}
                className={`rounded-2xl border p-5 transition-all ${
                  isApplied
                    ? 'border-moisha-green bg-moisha-mint/60 ring-2 ring-moisha-green/20'
                    : 'border-moisha-border bg-moisha-sand/70 hover:bg-white'
                }`}
              >
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="mb-1.5 inline-block rounded-full border border-amber-300 bg-moisha-butter px-3 py-0.5 text-xs font-bold tracking-wide text-moisha-amber uppercase">
                      {promo.badge}
                    </span>
                    <h4 className="text-lg font-bold text-moisha-navy">{promo.name}</h4>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-moisha-royal">
                      ${promo.effectivePrice}
                      <span className="text-xs font-normal text-moisha-muted">/nt</span>
                    </div>
                    <span className="text-xs text-moisha-muted line-through">
                      ${house.currentPrice}/nt
                    </span>
                  </div>
                </div>

                <p className="mb-4 text-sm leading-relaxed text-moisha-navy">{promo.reason}</p>

                <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-moisha-border bg-white p-3.5 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-moisha-muted uppercase">
                      Guest Discount
                    </span>
                    <span className="font-bold text-moisha-red">
                      -{promo.discountPercent}% (-${savingsPerNight}/nt)
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-moisha-muted uppercase">
                      {nights}-Night Gross Room
                    </span>
                    <span className="font-bold text-moisha-green">${totalWindowRevenue}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-moisha-border pt-3">
                  <button
                    type="button"
                    onClick={() => onSendReminderToPM(promo)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-white px-3.5 py-2 text-sm font-semibold text-moisha-navy hover:bg-moisha-sand"
                  >
                    <Bell className="h-4 w-4 text-moisha-amber" />
                    <span>Alert {house.propertyManagerName}</span>
                  </button>

                  {isApplied ? (
                    <button
                      type="button"
                      onClick={() => onApplyPromotion(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-moisha-green px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      <Check className="h-4 w-4" />
                      <span>Active · Remove</span>
                      <X className="h-3.5 w-3.5 opacity-80" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApplyPromotion({ ...promo, status: 'applied' })}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-moisha-royal px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Sparkles className="h-4 w-4 text-amber-200" />
                      <span>Activate Badge</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-moisha-border pt-3.5 text-sm text-moisha-muted">
        <Shield className="h-4 w-4 shrink-0 text-moisha-green" />
        <span>
          Safety floor of <strong>${effectiveFloorPrice}/night</strong> strictly enforced on all promotional rates.
        </span>
      </div>
    </section>
  );
};
