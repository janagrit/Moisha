import React from 'react';
import { Play, Sparkles, Settings } from 'lucide-react';
import { AgentDecision, PropertyHouse } from '../types';

interface NavbarProps {
  selectedHouse: PropertyHouse;
  decision: AgentDecision;
  isScanning: boolean;
  onTriggerScan: () => void;
  lastScannedTime: string | null;
  aiActive: boolean;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedHouse,
  decision,
  isScanning,
  onTriggerScan,
  lastScannedTime,
  aiActive,
  onOpenSettings,
}) => {
  const statusDotClass = isScanning
    ? 'bg-moisha-royal'
    : decision.status === 'ALERT'
      ? 'bg-amber-600'
      : decision.status === 'UPSIDE'
        ? 'bg-moisha-royal'
        : 'bg-moisha-green';

  const statusText = isScanning
    ? `Analyzing ${selectedHouse.nickname}...`
    : decision.status === 'ALERT'
      ? `${selectedHouse.unbookedDaysCount} Empty Nights Need Action`
      : decision.status === 'UPSIDE'
        ? `+${decision.percentDelta}% Rate Upside Available`
        : 'Neighborhood Rate In Harmony';

  return (
    <header className="sticky top-0 z-40 border-b border-moisha-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="./moisha-logo.png"
            alt="Moisha"
            width={48}
            height={48}
            className="h-11 w-11 shrink-0 rounded-full border border-moisha-border object-cover select-none sm:h-12 sm:w-12"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-moisha-navy sm:text-xl">
                MOISHA
              </span>
              <span className="hidden rounded-full border border-amber-300 bg-moisha-butter px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-moisha-amber uppercase sm:inline-block">
                Pocket Advisor
              </span>
            </div>
            <p className="truncate text-xs text-moisha-muted">
              {selectedHouse.nickname} · {selectedHouse.neighborhood}
            </p>
          </div>
        </div>

        {/* Center Status Pill */}
        <div className="hidden items-center gap-3 rounded-2xl border border-moisha-border bg-moisha-sand px-3.5 py-2 text-xs lg:flex">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${statusDotClass}`}
              />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusDotClass}`} />
            </span>
            <span className="font-semibold text-moisha-navy">{statusText}</span>
          </div>
          <span className="text-moisha-border">|</span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              aiActive
                ? 'bg-moisha-sky text-moisha-royal'
                : 'bg-white text-moisha-muted border border-moisha-border'
            }`}
          >
            {aiActive ? 'Gemini AI + Guardrails' : 'Local Math Engine'}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {lastScannedTime && (
            <span className="hidden rounded-lg border border-moisha-border bg-moisha-sand px-2.5 py-1.5 text-xs font-medium text-moisha-muted xl:inline-block">
              Updated {lastScannedTime}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="AI & Portfolio Settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-moisha-border bg-white text-moisha-navy transition-colors hover:bg-moisha-sand"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onTriggerScan}
            disabled={isScanning}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${
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
                <Play className="h-3.5 w-3.5 fill-current text-amber-300" />
                <span>Consult Moisha</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
