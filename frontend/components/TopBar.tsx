import React from 'react';
import { RefreshCw, Mail } from 'lucide-react';
import { HostProperty, EmailAlertConfig } from '../types';
import { formatTimestamp, isDailyCheckDue } from '../services/monitoringService';

interface TopBarProps {
  property: HostProperty | null;
  lastCheckedAt: string | null;
  emailConfig: EmailAlertConfig;
  competitorCount: number;
  onOpenCheckModal: () => void;
  onOpenEmailModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  property,
  lastCheckedAt,
  emailConfig,
  competitorCount,
  onOpenCheckModal,
  onOpenEmailModal,
}) => {
  const checkDue = isDailyCheckDue(lastCheckedAt);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <img
            src="./moisha-logo.png"
            alt="Moisha"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-slate-200 object-cover"
          />
          <span className="text-base font-bold tracking-tight text-slate-900">Moisha</span>
        </div>

        {property && (
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
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

            <button
              type="button"
              onClick={onOpenEmailModal}
              aria-label="Email alerts"
              className="btn-secondary h-9 px-3 text-xs sm:text-sm"
            >
              <Mail className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Email alerts</span>
              {emailConfig.enabled && emailConfig.email && (
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="Configured" />
              )}
            </button>

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
          </div>
        )}
      </div>
    </header>
  );
};
