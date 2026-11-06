import React from 'react';
import { PricingRule, MyListingConfig } from '../types';
import { Sliders, Shield, Zap, Calendar } from 'lucide-react';

interface RuleEngineCardProps {
  rules: PricingRule[];
  onToggleRule: (ruleId: string) => void;
  onUpdateParam: (ruleId: string, value: number) => void;
  myListing: MyListingConfig;
  onUpdateListingFloor: (floor: number) => void;
  onUpdateListingPrice: (price: number) => void;
}

export const RuleEngineCard: React.FC<RuleEngineCardProps> = ({
  rules,
  onToggleRule,
  onUpdateParam,
  myListing,
  onUpdateListingFloor,
  onUpdateListingPrice
}) => {
  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center text-lg shadow-xs">
            ⚙️
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-blue-950">Moisha's Commercial Rules Engine</h3>
            <p className="text-xs text-slate-500">Autonomous business logic that safeguards margin & triggers alerts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-4 rounded-2xl border transition-all ${
              rule.enabled ? 'bg-[#FAF8F5] border-stone-200' : 'bg-stone-50 border-stone-200 opacity-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-sm font-serif font-bold text-slate-800">{rule.title}</span>
              <button
                onClick={() => onToggleRule(rule.id)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  rule.enabled ? 'bg-blue-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    rule.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">{rule.description}</p>

            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-xs font-mono text-slate-500 font-medium">{rule.parameterName}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!rule.enabled}
                  value={rule.parameterValue}
                  onChange={(e) => onUpdateParam(rule.id, Number(e.target.value))}
                  className="w-16 bg-[#FAF8F5] border border-stone-300 rounded-lg px-2 py-0.5 text-xs text-right text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600 disabled:opacity-40"
                />
                <span className="text-xs text-slate-400 font-mono">{rule.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Host Constraints */}
      <div className="mt-6 pt-5 border-t border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-mono font-bold">Your Base Nightly Rate</span>
            <Zap className="w-3.5 h-3.5 text-blue-700" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500 font-bold">$</span>
            <input
              type="number"
              value={myListing.currentPrice}
              onChange={(e) => onUpdateListingPrice(Number(e.target.value))}
              className="w-full bg-white border border-stone-300 rounded-xl px-2.5 py-1 text-base font-bold text-slate-900 font-mono focus:outline-none focus:border-blue-600 shadow-2xs"
            />
            <span className="text-xs text-slate-500">/nt</span>
          </div>
        </div>

        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-emerald-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-800 font-mono font-bold">Host Safety Floor (Min)</span>
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500 font-bold">$</span>
            <input
              type="number"
              value={myListing.floorPrice}
              onChange={(e) => onUpdateListingFloor(Number(e.target.value))}
              className="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1 text-base font-bold text-emerald-700 font-mono focus:outline-none focus:border-emerald-600 shadow-2xs"
            />
            <span className="text-xs text-slate-500">/nt</span>
          </div>
        </div>

        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 font-mono font-bold">Active Empty Window</span>
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="text-xs text-slate-800 mt-2 font-mono font-bold">
            {myListing.targetCheckIn} → {myListing.targetCheckOut}
            <span className="block text-[11px] text-amber-800 mt-0.5 font-semibold">5 Days Approaching Fast</span>
          </div>
        </div>
      </div>
    </div>
  );
};
