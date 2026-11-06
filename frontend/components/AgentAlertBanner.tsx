import React from 'react';
import { AgentDecision, PropertyHouse, AirbnbPromotion } from '../types';
import { AlertCircle, CheckCircle, TrendingDown, ArrowDownRight, Zap, ShieldCheck, MapPin, Tag } from 'lucide-react';

interface AgentAlertBannerProps {
  decision: AgentDecision;
  house: PropertyHouse;
  onApplyPriceChange: (newPrice: number) => void;
  onApplyPromotion: (promo: AirbnbPromotion) => void;
  onSimulateReminder: () => void;
}

export const AgentAlertBanner: React.FC<AgentAlertBannerProps> = ({
  decision,
  house,
  onApplyPriceChange,
  onApplyPromotion,
  onSimulateReminder
}) => {
  const isAlert = decision.status === 'ALERT';
  const topPromo = decision.recommendedPromotions[0];
  const totalVacancyRisk = house.currentPrice * house.unbookedDaysCount;

  return (
    <div className={`relative overflow-hidden rounded-3xl border transition-all ${
      isAlert
        ? 'bg-gradient-to-br from-[#FFFDF9] via-[#FAF6ED] to-[#F5ECE0] border-amber-300 shadow-md shadow-amber-900/5'
        : 'bg-gradient-to-br from-[#F4FAF6] via-white to-[#EEF8F1] border-emerald-300'
    }`}>
      
      {/* Decorative parchment accent */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-amber-200/20 blur-3xl pointer-events-none" />

      <div className="p-6 sm:p-8 relative z-10">
        
        {/* Header Tag */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs text-xl ${
              isAlert ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              {isAlert ? '⚖️' : '✨'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-mono font-bold tracking-wider uppercase px-3 py-0.5 rounded-full ${
                  isAlert ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}>
                  {house.nickname} • MOISHA'S VERDICT
                </span>
                <span className="text-xs text-red-800 font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200">
                  {house.unbookedDaysCount} Unbooked Days ({house.unbookedStartDate.slice(5)} - {house.unbookedEndDate.slice(5)})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-blue-950 mt-1">
                Neighbor Undercutting: Let's Fill These Empty Days!
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs text-slate-500 font-medium">Moisha Confidence:</span>
            <span className="text-xs font-bold font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {decision.confidenceScore}%
            </span>
          </div>
        </div>

        {/* Address & Neighbor callout */}
        <div className="bg-white/90 rounded-2xl p-3.5 border border-amber-200/80 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-slate-700 font-mono">
            <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Target House: <strong className="text-blue-950 font-bold">{house.address}</strong></span>
          </div>
          <div className="text-amber-900 font-mono font-bold bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
            Perishable Revenue at Risk: ${totalVacancyRisk}
          </div>
        </div>

        {/* Pricing Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
            <span className="text-[11px] text-slate-500 uppercase font-mono font-bold">Your Current Rate</span>
            <div className="text-2xl font-bold text-slate-800 mt-1 font-mono">
              ${house.currentPrice}
              <span className="text-xs text-slate-400 font-normal">/night</span>
            </div>
            <div className="text-xs text-rose-600 mt-1 font-semibold">Sitting vacant for next 5 days</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-300 shadow-xs">
            <span className="text-[11px] text-amber-900 uppercase font-mono font-bold">Cheapest Neighbor</span>
            <div className="text-2xl font-bold text-amber-800 mt-1 font-mono">
              ${decision.competitorSummary.cheapestNeighborPrice}
              <span className="text-xs text-slate-400 font-normal">/night</span>
            </div>
            <div className="text-xs text-amber-700 mt-1 font-mono font-medium">
              ${house.currentPrice - decision.competitorSummary.cheapestNeighborPrice} cheaper than you
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-400 shadow-xs ring-1 ring-blue-200">
            <span className="text-[11px] text-blue-900 uppercase font-mono font-bold">Moisha Recommended</span>
            <div className="text-2xl font-bold text-blue-700 mt-1 font-mono flex items-baseline gap-2">
              ${decision.recommendedPrice}
              <span className="text-xs text-slate-400 font-normal">/night</span>
              {decision.priceDelta !== 0 && (
                <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-blue-100 text-blue-900">
                  -${Math.abs(decision.priceDelta)}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">Safety Floor: ${house.floorPrice}/nt</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
            <span className="text-[11px] text-slate-500 uppercase font-mono font-bold">Booking Probability</span>
            <div className="flex items-center gap-3 mt-1">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">At Current</span>
                <span className="text-lg font-bold text-rose-600 font-mono">{decision.projectedBookingProbability.atCurrentPrice}%</span>
              </div>
              <ArrowDownRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">With Fix</span>
                <span className="text-lg font-bold text-emerald-700 font-mono">{decision.projectedBookingProbability.atRecommendedPrice}%</span>
              </div>
            </div>
            <div className="text-[11px] text-emerald-800 mt-1 font-mono font-semibold">
              +{decision.projectedBookingProbability.atRecommendedPrice - decision.projectedBookingProbability.atCurrentPrice}% conversion jump
            </div>
          </div>
        </div>

        {/* Moisha Advisor Reasoning & Neighbor Breakdown */}
        <div className="bg-white/95 rounded-2xl p-5 sm:p-6 border border-amber-200 mb-6 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-950 font-serif">
            <span className="text-amber-600 text-lg">💡</span>
            <span>Uncle Moisha's Commercial Counsel for Carlos</span>
          </div>

          <p className="text-slate-800 text-sm leading-relaxed font-medium bg-[#FFFDF9] p-4 rounded-xl border border-amber-100">
            "{decision.reasoning}"
          </p>

          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 text-xs text-slate-700">
            <strong className="text-blue-950 font-mono">Neighbor Intel: </strong>
            {decision.neighborGapAnalysis}
          </div>

          <div className="border-t border-stone-200 pt-3">
            <span className="text-xs font-mono uppercase text-slate-500 block mb-2 font-bold">Moisha's 3-Step Action Plan:</span>
            <ul className="space-y-1.5">
              {decision.recommendedActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Controls for PM */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-amber-200/70">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Never drop below your floor limit (${house.floorPrice}/nt). Moisha protects your profit.</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSimulateReminder}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-50 text-slate-700 border border-stone-300 transition-colors shadow-xs flex items-center gap-2"
            >
              <span>Send WhatsApp / Telegram Reminder</span>
            </button>

            {topPromo && (
              <button
                onClick={() => onApplyPromotion(topPromo)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm transition-all flex items-center gap-2 active:scale-95"
              >
                <Tag className="w-4 h-4" />
                <span>Run {topPromo.badge} (${topPromo.effectivePrice}/nt)</span>
              </button>
            )}

            {isAlert && house.currentPrice !== decision.recommendedPrice && (
              <button
                onClick={() => onApplyPriceChange(decision.recommendedPrice)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-md shadow-blue-900/15 transition-all flex items-center gap-2 active:scale-95"
              >
                <TrendingDown className="w-4 h-4" />
                <span>Drop Rate to ${decision.recommendedPrice}/night</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
