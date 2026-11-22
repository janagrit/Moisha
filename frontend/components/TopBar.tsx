import React from 'react';
import { RefreshCw, Mail, PlusCircle, Sparkles } from 'lucide-react';
import { HostProperty, EmailAlertConfig } from '../types';
import { formatTimestamp, isDailyCheckDue } from '../services/monitoringService';

interface TopBarProps {
  property: HostProperty | null;
  isPrototype: boolean;
  isSimulatingCheck: boolean;
  lastCheckedAt: string | null;
  emailConfig: EmailAlertConfig;
  competitorCount: number;
  onRunPrototypeCheck: () => void;
  onOpenCheckModal: () => void;
  onOpenEmailModal: () => void;
  onSwitchToOwnProperty: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  property,
  isPrototype,
  isSimulatingCheck,
  lastCheckedAt,
  emailConfig,
  competitorCount,
  onRunPrototypeCheck,
  onOpenCheckModal,
  onOpenEmailModal,
  onSwitchToOwnProperty,
}) => {
  const checkDue = isDailyCheckDue(lastCheckedAt);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
              <path d="M8.5 15.5l2.3-2.5 2.2 1.8 2.8-3.3" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">Moisha</span>
          {property && isPrototype && (
            <span className="hidden items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 sm:inline-flex">
              <Sparkles className="h-3 w-3" />
              Live Prototype
            </span>
          )}
        </div>

        {property && (
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden items-center gap-2 text-xs text-slate-500 lg:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  !lastCheckedAt
                    ? 'bg-slate-300'
                    : checkDue
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
              />
              <span>
                Last check:{' '}
                <strong className="font-medium text-slate-700">
                  {formatTimestamp(lastCheckedAt)}
                </strong>
              </span>
            </div>

            {isPrototype && (
              <button
                type="button"
                onClick={onSwitchToOwnProperty}
                className="btn-secondary hidden h-9 px-3 text-xs sm:inline-flex sm:text-sm"
              >
                <PlusCircle className="h-3.5 w-3.5 text-slate-600" />
                <span>Use my Airbnb</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenEmailModal}
              aria-label="Email alerts"
              className="btn-secondary h-9 px-2.5 text-xs sm:px-3 sm:text-sm"
            >
              <Mail className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Email alert</span>
              {emailConfig.enabled && emailConfig.email && (
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="Configured" />
              )}
            </button>

            {isPrototype ? (
              <button
                type="button"
                onClick={onRunPrototypeCheck}
                disabled={isSimulatingCheck}
                className="btn-primary h-9 px-3 text-xs sm:px-3.5 sm:text-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSimulatingCheck ? 'animate-spin' : ''}`} />
                <span className="sm:hidden">{isSimulatingCheck ? 'Checking...' : 'Run check'}</span>
                <span className="hidden sm:inline">
                  {isSimulatingCheck ? 'Checking 3BRs...' : 'Simulate daily check'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCheckModal}
                disabled={competitorCount === 0}
                title={
                  competitorCount === 0
                    ? 'Add a competitor listing first to run a price check'
                    : 'Check competitor prices'
                }
                className="btn-primary h-9 px-3.5 text-xs sm:text-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Check prices</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
