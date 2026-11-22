import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import {
  HostProperty,
  CompetitorListing,
  PriceChangeEvent,
  EmailAlertConfig,
  sanitizeExternalUrl,
} from '../types';
import { buildPriceChangeMailtoHref } from '../services/monitoringService';

interface DailyCheckModalProps {
  property: HostProperty;
  competitors: CompetitorListing[];
  emailConfig: EmailAlertConfig;
  onClose: () => void;
  onSubmitCheck: (observedPricesById: Record<string, number>) => PriceChangeEvent[];
}

export const DailyCheckModal: React.FC<DailyCheckModalProps> = ({
  property,
  competitors,
  emailConfig,
  onClose,
  onSubmitCheck,
}) => {
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of competitors) {
      initial[c.id] = String(c.nightlyPrice);
    }
    return initial;
  });

  const [completedChanges, setCompletedChanges] = useState<PriceChangeEvent[] | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSaveCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const numericMap: Record<string, number> = {};
    for (const c of competitors) {
      const parsed = Math.round(Number(draftPrices[c.id]));
      numericMap[c.id] = Number.isFinite(parsed) && parsed > 0 ? parsed : c.nightlyPrice;
    }
    const detected = onSubmitCheck(numericMap);
    if (detected.length > 0 && emailConfig.enabled && emailConfig.email.trim()) {
      setCompletedChanges(detected);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-check-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 id="daily-check-dialog-title" className="text-lg font-semibold text-slate-900">
              {completedChanges ? 'Price check saved' : 'Record competitor price check'}
            </h2>
            <p className="text-xs text-slate-500">
              {completedChanges
                ? `${completedChanges.length} price ${completedChanges.length === 1 ? 'change' : 'changes'} recorded`
                : 'Open each listing to check today’s rate and enter any price changes below.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {completedChanges ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">
                  Logged {completedChanges.length} competitor price{' '}
                  {completedChanges.length === 1 ? 'change' : 'changes'}.
                </p>
                <p className="mt-1 text-xs text-emerald-800">
                  Send an email summary to <strong>{emailConfig.email}</strong> via your mail client:
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Done
              </button>
              <a
                href={buildPriceChangeMailtoHref(
                  emailConfig.email,
                  property.name,
                  completedChanges,
                )}
                onClick={() => onClose()}
                className="btn-primary"
              >
                <Mail className="h-4 w-4" />
                <span>Open email alert</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveCheck} className="space-y-3">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
              {competitors.map((comp) => {
                const draftNum = Math.round(Number(draftPrices[comp.id]) || comp.nightlyPrice);
                const diff = draftNum - comp.nightlyPrice;

                return (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{comp.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span>Prev: ${comp.nightlyPrice}/nt</span>
                        <a
                          href={sanitizeExternalUrl(comp.airbnbUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 font-medium text-slate-700 hover:underline"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {diff !== 0 && (
                        <span
                          className={`text-xs font-semibold tabular ${
                            diff < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {diff > 0 ? `+$${diff}` : `-$${Math.abs(diff)}`}
                        </span>
                      )}
                      <div className="relative w-24">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          min={10}
                          required
                          aria-label={`Observed nightly price for ${comp.name}`}
                          value={draftPrices[comp.id] ?? ''}
                          onChange={(e) =>
                            setDraftPrices((prev) => ({ ...prev, [comp.id]: e.target.value }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-2.5 pl-6 text-right text-sm font-semibold text-slate-900 tabular focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save check
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
