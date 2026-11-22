import React from 'react';
import { Shield, Zap, Calendar, Sliders } from 'lucide-react';
import { PricingRule, PropertyHouse } from '../types';
import { daysBetweenIso } from '../services/pricingEngine';

interface RuleEngineCardProps {
  house: PropertyHouse;
  rules: PricingRule[];
  onToggleRule: (ruleId: string) => void;
  onUpdateParam: (ruleId: string, value: number) => void;
  onUpdateHouse: (updates: Partial<PropertyHouse>) => void;
}

export const RuleEngineCard: React.FC<RuleEngineCardProps> = ({
  house,
  rules,
  onToggleRule,
  onUpdateParam,
  onUpdateHouse,
}) => {
  const handleDateChange = (startIso: string, endIso: string) => {
    const nights = Math.max(1, daysBetweenIso(startIso, endIso));
    onUpdateHouse({
      unbookedStartDate: startIso,
      unbookedEndDate: endIso,
      unbookedDaysCount: house.isBooked ? 0 : nights,
    });
  };

  return (
    <section aria-label="Pricing rules engine" className="card p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300 bg-moisha-butter text-moisha-amber">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-moisha-navy">
            Moisha&apos;s Autonomous Pricing Rules
          </h3>
          <p className="text-xs text-moisha-muted">
            Toggle any guardrail or threshold — recommendations recalculate immediately.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-2xl border p-4 transition-all ${
              rule.enabled
                ? 'border-moisha-border bg-moisha-sand/80'
                : 'border-moisha-border bg-slate-50 opacity-55'
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <span className="text-sm font-bold text-moisha-navy">{rule.title}</span>
              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={`Toggle ${rule.title}`}
                onClick={() => onToggleRule(rule.id)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  rule.enabled ? 'bg-moisha-royal' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    rule.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="mb-3 text-xs text-moisha-muted">{rule.description}</p>

            <div className="flex items-center justify-between rounded-xl border border-moisha-border bg-white px-3 py-2">
              <span className="text-xs font-semibold text-moisha-muted">{rule.parameterName}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  disabled={!rule.enabled}
                  value={rule.parameterValue}
                  onChange={(e) => onUpdateParam(rule.id, Math.max(0, Number(e.target.value) || 0))}
                  className="w-20 rounded-lg border border-moisha-border bg-moisha-sand px-2 py-1 text-right text-xs font-bold text-moisha-navy disabled:opacity-40"
                />
                <span className="text-xs text-moisha-muted">{rule.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Property Constraints Strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-moisha-border pt-5 md:grid-cols-3">
        <div className="rounded-2xl border border-moisha-border bg-moisha-sand/70 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-moisha-muted">Base Nightly Rate</span>
            <Zap className="h-3.5 w-3.5 text-moisha-royal" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-bold text-moisha-muted">$</span>
            <input
              type="number"
              min={40}
              value={house.currentPrice}
              onChange={(e) =>
                onUpdateHouse({ currentPrice: Math.max(40, Number(e.target.value) || 40) })
              }
              className="field min-h-9 text-sm font-bold"
            />
            <span className="text-xs text-moisha-muted">/nt</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-moisha-mint/50 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-moisha-green">Host Safety Floor</span>
            <Shield className="h-3.5 w-3.5 text-moisha-green" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-bold text-moisha-green">$</span>
            <input
              type="number"
              min={40}
              value={house.floorPrice}
              onChange={(e) =>
                onUpdateHouse({ floorPrice: Math.max(40, Number(e.target.value) || 40) })
              }
              className="field min-h-9 border-emerald-300 text-sm font-bold text-moisha-green"
            />
            <span className="text-xs text-moisha-muted">/nt</span>
          </div>
        </div>

        <div className="rounded-2xl border border-moisha-border bg-moisha-sand/70 p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-moisha-muted">
              Gap Dates ({house.unbookedDaysCount} nights)
            </span>
            <Calendar className="h-3.5 w-3.5 text-moisha-amber" />
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <input
              type="date"
              value={house.unbookedStartDate}
              onChange={(e) => handleDateChange(e.target.value, house.unbookedEndDate)}
              className="rounded-lg border border-moisha-border bg-white px-2 py-1 text-[11px] font-semibold text-moisha-navy"
            />
            <input
              type="date"
              value={house.unbookedEndDate}
              onChange={(e) => handleDateChange(house.unbookedStartDate, e.target.value)}
              className="rounded-lg border border-moisha-border bg-white px-2 py-1 text-[11px] font-semibold text-moisha-navy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
