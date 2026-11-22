import React, { useState, useEffect } from 'react';
import { X, Mail, Info } from 'lucide-react';
import { HostProperty, EmailAlertConfig, PriceChangeEvent } from '../types';
import { buildPriceChangeMailtoHref } from '../services/monitoringService';

interface EmailAlertsModalProps {
  property: HostProperty;
  emailConfig: EmailAlertConfig;
  recentChanges: PriceChangeEvent[];
  onClose: () => void;
  onSaveConfig: (config: EmailAlertConfig) => void;
}

export const EmailAlertsModal: React.FC<EmailAlertsModalProps> = ({
  property,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-alerts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="email-alerts-dialog-title" className="text-lg font-semibold text-slate-900">
            Email alerts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>
            This deployment runs entirely in your browser without a background server or SMTP worker. Unattended daily background checks and automatic email delivery are not active here—instead, Moisha prepares a formatted email alert whenever a price check detects a change.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="alert-email-input" className="field-label">
              Recipient email address
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
            <span>Prompt to send email alert when competitor prices change</span>
          </label>

          {email.trim() && recentChanges.length > 0 && (
            <div className="pt-1">
              <a
                href={buildPriceChangeMailtoHref(
                  email,
                  property.name,
                  recentChanges.slice(0, 10),
                )}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Compose email for latest {Math.min(10, recentChanges.length)} change(s)</span>
              </a>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save alert settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
