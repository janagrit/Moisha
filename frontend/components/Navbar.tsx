import React from 'react';
import { Play, Sparkles, Settings, CircleHelp } from 'lucide-react';
import { AgentDecision, PropertyHouse } from '../types';

interface NavbarProps {
  selectedHouse: PropertyHouse | null;
  decision: AgentDecision | null;
  isScanning: boolean;
  onTriggerScan: () => void;
  lastScannedTime: string | null;
  aiActive: boolean;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedHouse,
  decision,
  isScanning,
  onTriggerScan,
  lastScannedTime,
  aiActive,
  onOpenGuide,
  onOpenSettings,
}) => {
  const statusDotClass = !selectedHouse || !decision
    ? 'bg-slate-400'
    : isScanning
      ? 'bg-moisha-royal'
      : decision.status === 'ALERT'
        ? 'bg-amber-600'
        : decision.status === 'UPSIDE'
          ? 'bg-moisha-royal'
          : 'bg-moisha-green';

  const statusText = !selectedHouse || !decision
    ? 'Ready · Enter an address below'
    : isScanning
      ? `Analyzing ${selectedHouse.nickname}...`
      : decision.status === 'ALERT'
        ? `${selectedHouse.unbookedDaysCount} Empty Nights Need Action`
        : decision.status === 'UPSIDE'
          ? `+${decision.percentDelta}% Rate Upside Available`
          : 'Neighborhood Rate In Harmony';

  return (
    <header className="sticky top-0 z-40 border-b border-moisha-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3.5">
          <img
            src="./moisha-logo.png"
            alt="Moisha"
            width={52}
            height={52}
            className="h-12 w-12 shrink-0 rounded-full border border-moisha-border object-cover select-none sm:h-13 sm:w-13"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-extrabold tracking-tight text-moisha-navy sm:text-2xl">
                MOISHA
              </span>
              <span className="hidden rounded-full border border-amber-300 bg-moisha-butter px-3 py-0.5 text-xs font-bold tracking-wide text-moisha-amber uppercase sm:inline-block">
                Pocket Advisor
              </span>
            </div>
            <p className="truncate text-sm text-moisha-muted">
              {selectedHouse
                ? `${selectedHouse.nickname} · ${selectedHouse.neighborhood}`
                : 'Short-term rental pricing & profit advisor'}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-3 rounded-2xl border border-moisha-border bg-moisha-sand px-4 py-2 text-sm xl:flex">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {selectedHouse && (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${statusDotClass}`}
                />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusDotClass}`} />
            </span>
            <span className="font-semibold text-moisha-navy">{statusText}</span>
          </div>
          <span className="text-moisha-border">|</span>
          <span
            className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
              aiActive
                ? 'bg-moisha-sky text-moisha-royal'
                : 'border border-moisha-border bg-white text-moisha-muted'
            }`}
          >
            {aiActive ? 'Gemini AI + Guardrails' : 'Instant Pricing Engine'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedHouse && lastScannedTime && (
            <span className="hidden rounded-lg border border-moisha-border bg-moisha-sand px-3 py-1.5 text-sm font-medium text-moisha-muted 2xl:inline-block">
              Updated {lastScannedTime}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-moisha-border bg-moisha-sand px-3.5 text-sm font-bold text-moisha-navy transition-colors hover:bg-white"
          >
            <CircleHelp className="h-4 w-4 text-moisha-royal" />
            <span className="hidden sm:inline">How to Use</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="AI & App Settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-moisha-border bg-white text-moisha-navy transition-colors hover:bg-moisha-sand"
          >
            <Settings className="h-5 w-5" />
          </button>

          {selectedHouse && (
            <button
              type="button"
              onClick={onTriggerScan}
              disabled={isScanning}
              className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all sm:px-5 sm:text-base ${
                isScanning
                  ? 'cursor-not-allowed border border-moisha-border bg-moisha-sand text-moisha-muted'
                  : 'bg-moisha-navy text-white shadow-sm hover:bg-blue-950 active:scale-[0.98]'
              }`}
            >
              {isScanning ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-amber-300" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-amber-300" />
                  <span>Consult Moisha</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
