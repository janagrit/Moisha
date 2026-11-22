import React, { useState, useEffect } from 'react';
import { X, Mail, TrendingDown, TrendingUp } from 'lucide-react';
import { HostProperty, EmailAlertConfig, PriceChangeEvent, MarketOverviewStats } from '../types';
import { buildPriceChangeMailtoHref, formatShortDate } from '../services/monitoringService';

interface EmailAlertsModalProps {
  property: HostProperty;
  overview: MarketOverviewStats;
  emailConfig: EmailAlertConfig;
  recentChanges: PriceChangeEvent[];
  onClose: () => void;
  onSaveConfig: (config: EmailAlertConfig) => void;
}

export const EmailAlertsModal: React.FC<EmailAlertsModalProps> = ({
  property,
  overview,
  emailConfig,
  recentChanges,
  onClose,
  onSaveConfig,
}) => {
  const [email, setEmail] = useState(emailConfig.email);
  const [enabled, setEnabled] = useState(emailConfig.enabled);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      email: email.trim(),
      enabled: Boolean(email.trim()) && enabled,
    });
    onClose();
  };

  const previewItems = recentChanges.slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-alerts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="email-alerts-dialog-title" className="text-lg font-semibold text-slate-900">
              Morning price-change email alert
            </h2>
            <p className="text-xs text-slate-500">
              Preview of the summary prepared whenever monitored competitors change rates
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

        {/* Realistic Email Preview Card */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="border-b border-slate-200 bg-white px-4 py-3 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>
                To: <strong className="text-slate-800">{email.trim() || 'you@example.com'}</strong>
              </span>
              <span>Daily 8:00 AM Digest</span>
            </div>
            <div className="mt-1 font-semibold text-slate-900">
              Subject: Moisha Alert — {previewItems.length || 1} comparable {property.bedrooms}BR price{' '}
              {previewItems.length === 1 ? 'change' : 'changes'} near {property.name}
            </div>
          </div>

          <div className="space-y-3 p-4 text-xs text-slate-700">
            <p>
              Your rate is{' '}
              <strong className="text-slate-900 tabular">
                {property.nightlyPrice ? `$${property.nightlyPrice}/night` : 'unset'}
              </strong>{' '}
              {overview.competitorAveragePrice
                ? `vs. $${overview.competitorAveragePrice}/night across ${overview.comparableCount} comparable ${property.bedrooms}-bedroom homes.`
                : `for ${property.address}.`}
            </p>

            {previewItems.length > 0 ? (
              <div className="divide-y divide-slate-200/70 rounded-lg border border-slate-200 bg-white px-3">
                {previewItems.map((chg) => {
                  const isDrop = chg.deltaAmount < 0;
                  return (
                    <div
                      key={chg.id}
                      className="flex items-center justify-between gap-2 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
                          {chg.competitorName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {chg.bedrooms}BR · {formatShortDate(chg.changedAt)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 tabular">
                        <span className="text-slate-400 line-through">${chg.previousPrice}</span>
                        <span className="font-semibold text-slate-900">${chg.newPrice}/nt</span>
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isDrop
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isDrop ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {isDrop ? '' : '+'}
                          {chg.percentChange}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center text-slate-500">
                Run a price check to populate recent competitor changes here.
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="alert-email-input" className="field-label">
              Your email address
            </label>
            <input
              id="alert-email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value.trim() && !enabled) setEnabled(true);
              }}
              className="input-field"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            <span>Prepare email alert whenever a competitor’s price changes</span>
          </label>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Note: Because GitHub Pages is a static browser app without a background SMTP worker, unattended 24/7 server emails require connecting a backend cron job. Right now, you can open this formatted alert directly in your mail client with one click.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            {email.trim() && recentChanges.length > 0 ? (
              <a
                href={buildPriceChangeMailtoHref(
                  email,
                  property.name,
                  recentChanges.slice(0, 10),
                )}
                className="btn-secondary h-9 px-3 text-xs"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Open in Mail app</span>
              </a>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save alert settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
