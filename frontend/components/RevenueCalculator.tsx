import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, Check } from 'lucide-react';
import { PropertyHouse, AgentDecision, RevenueScenario } from '../types';
import {
  calculateScenario,
  estimateBookingProbability,
} from '../services/pricingEngine';

interface RevenueCalculatorProps {
  house: PropertyHouse;
  decision: AgentDecision;
  onUpdateHouseCosts: (updates: Partial<PropertyHouse>) => void;
  onApplyPrice: (newPrice: number) => void;
}

export const RevenueCalculator: React.FC<RevenueCalculatorProps> = ({
  house,
  decision,
  onUpdateHouseCosts,
  onApplyPrice,
}) => {
  const [customRate, setCustomRate] = useState<number>(decision.recommendedPrice);
  const [customNights, setCustomNights] = useState<number>(
    Math.max(1, house.unbookedDaysCount || 4),
  );

  useEffect(() => {
    setCustomRate(decision.recommendedPrice);
    setCustomNights(Math.max(1, house.unbookedDaysCount || 4));
  }, [house.id, decision.recommendedPrice, house.unbookedDaysCount]);

  const sliderMin = Math.max(60, Math.round(decision.effectiveFloorPrice * 0.8));
  const sliderMax = Math.max(
    house.currentPrice + 80,
    decision.competitorSummary.upperRangePrice + 80,
  );

  const curProb = estimateBookingProbability(
    house.currentPrice,
    decision.competitorSummary,
    customNights,
  );
  const recProb = estimateBookingProbability(
    decision.recommendedPrice,
    decision.competitorSummary,
    customNights,
  );
  const customProb = estimateBookingProbability(
    customRate,
    decision.competitorSummary,
    customNights,
  );

  const currentCol = calculateScenario(
    house,
    'Current Rate',
    house.currentPrice,
    customNights,
    curProb,
  );
  const recommendedCol = calculateScenario(
    house,
    'Moisha Target',
    decision.recommendedPrice,
    customNights,
    recProb,
    currentCol.expectedNetValue,
  );
  const customCol = calculateScenario(
    house,
    'What-If Scenario',
    customRate,
    customNights,
    customProb,
    currentCol.expectedNetValue,
  );

  const scenarios: Array<{ data: RevenueScenario; highlight?: boolean }> = [
    { data: currentCol },
    { data: recommendedCol, highlight: true },
    { data: customCol },
  ];

  const isBelowFloor = customRate < decision.effectiveFloorPrice;

  return (
    <section aria-label="Revenue and profit calculator" className="card p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moisha-mint text-moisha-green">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-moisha-navy">
              Revenue, Expense & Net Profit Calculator
            </h3>
            <p className="text-xs text-moisha-muted">
              Model gross payout, platform fees, cleaning turnover, and odds-weighted net profit for{' '}
              <strong>{house.nickname}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-moisha-border bg-moisha-sand/70 p-4 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <label htmlFor="what-if-rate-slider" className="font-bold text-moisha-navy">
              Test What-If Nightly Rate: <span className="text-moisha-royal">${customRate}/nt</span>
            </label>
            <span className="text-[11px] font-medium text-moisha-muted">
              Est. booking odds: <strong>{customProb}%</strong>
            </span>
          </div>
          <input
            id="what-if-rate-slider"
            type="range"
            min={sliderMin}
            max={sliderMax}
            value={customRate}
            onChange={(e) => setCustomRate(Number(e.target.value))}
            className="w-full accent-moisha-royal"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-moisha-muted">
            <span>${sliderMin}</span>
            <span className="font-semibold text-moisha-green">
              Floor ${decision.effectiveFloorPrice}
            </span>
            <span>${sliderMax}</span>
          </div>
          {isBelowFloor && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-moisha-blush px-2.5 py-1.5 text-[11px] font-bold text-moisha-red">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Below your ${decision.effectiveFloorPrice}/nt safety floor — apply only if intentional.
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-6">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">Nights</span>
            <input
              type="number"
              min={1}
              max={30}
              value={customNights}
              onChange={(e) => setCustomNights(Math.max(1, Number(e.target.value) || 1))}
              className="field min-h-9 px-2.5 text-xs font-bold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">
              Guest Clean ($)
            </span>
            <input
              type="number"
              min={0}
              value={house.cleaningFee}
              onChange={(e) =>
                onUpdateHouseCosts({ cleaningFee: Math.max(0, Number(e.target.value) || 0) })
              }
              className="field min-h-9 px-2.5 text-xs font-bold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">
              Cleaner Cost ($)
            </span>
            <input
              type="number"
              min={0}
              value={house.cleaningCost}
              onChange={(e) =>
                onUpdateHouseCosts({ cleaningCost: Math.max(0, Number(e.target.value) || 0) })
              }
              className="field min-h-9 px-2.5 text-xs font-bold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-moisha-muted">
              Fixed Cost ($/nt)
            </span>
            <input
              type="number"
              min={0}
              value={house.nightlyFixedCost}
              onChange={(e) =>
                onUpdateHouseCosts({
                  nightlyFixedCost: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="field min-h-9 px-2.5 text-xs font-bold"
            />
          </label>
        </div>
      </div>

      {/* 3-Scenario Comparison Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {scenarios.map(({ data, highlight }) => (
          <div
            key={data.label}
            className={`rounded-2xl border p-4 ${
              highlight
                ? 'border-2 border-moisha-royal bg-moisha-sky/40'
                : 'border-moisha-border bg-white'
            }`}
          >
            <div className="mb-3 flex items-center justify-between border-b border-moisha-border pb-2.5">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase ${
                    highlight ? 'text-moisha-royal' : 'text-moisha-muted'
                  }`}
                >
                  {data.label}
                </span>
                <div className="text-xl font-extrabold text-moisha-navy">
                  ${data.nightlyRate}
                  <span className="text-xs font-normal text-moisha-muted">/nt</span>
                </div>
              </div>
              <span className="rounded-lg bg-moisha-sand px-2.5 py-1 text-xs font-bold text-moisha-navy border border-moisha-border">
                {data.bookingProbability}% odds
              </span>
            </div>

            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-moisha-muted">
                  Room revenue ({data.nights} nt)
                </dt>
                <dd className="font-semibold text-moisha-navy">${data.grossRoomRevenue}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-moisha-muted">Guest cleaning fee</dt>
                <dd className="font-semibold text-moisha-navy">+${data.cleaningFeeRevenue}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-moisha-muted">
                  Host fee ({house.hostServiceFeePercent}%)
                </dt>
                <dd className="font-medium text-moisha-red">-${data.platformFee}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-moisha-muted">Cleaner payout</dt>
                <dd className="font-medium text-moisha-red">-${data.cleanerPayout}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-moisha-muted">Fixed holding costs</dt>
                <dd className="font-medium text-moisha-red">-${data.fixedCosts}</dd>
              </div>

              <div className="mt-2 flex justify-between border-t border-moisha-border pt-2 text-sm">
                <dt className="font-bold text-moisha-navy">Net Profit (If Booked)</dt>
                <dd
                  className={`font-extrabold ${
                    data.netProfitIfBooked >= 0 ? 'text-moisha-green' : 'text-moisha-red'
                  }`}
                >
                  ${data.netProfitIfBooked}
                </dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="font-semibold text-moisha-muted">Expected Value (Odds-Weighted)</dt>
                <dd className="font-bold text-moisha-navy">${data.expectedNetValue}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* Apply Custom Rate Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-moisha-border pt-4 text-xs">
        <span className="text-moisha-muted">
          Expected value weights booked net profit against vacant holding costs (-$
          {house.nightlyFixedCost * customNights}).
        </span>

        <button
          type="button"
          onClick={() => onApplyPrice(Math.max(decision.effectiveFloorPrice, customRate))}
          disabled={Math.max(decision.effectiveFloorPrice, customRate) === house.currentPrice}
          className="inline-flex items-center gap-1.5 rounded-xl bg-moisha-navy px-4 py-2 text-xs font-bold text-white transition-opacity hover:bg-blue-950 disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          <span>
            Apply ${Math.max(decision.effectiveFloorPrice, customRate)}/nt Rate
          </span>
        </button>
      </div>
    </section>
  );
};
