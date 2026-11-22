import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, RotateCcw, Sparkles, ShieldCheck } from 'lucide-react';
import { AiSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AiSettings;
  proxyAvailable: boolean;
  proxyModel: string;
  onUpdateSettings: (updates: Partial<AiSettings>) => void;
  onResetDemoData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  aiSettings,
  proxyAvailable,
  proxyModel,
  onUpdateSettings,
  onResetDemoData,
}) => {
  const [keyInput, setKeyInput] = useState(aiSettings.customApiKey);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ customApiKey: keyInput.trim() });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-moisha-border bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-moisha-royal" />
            <h3 id="settings-dialog-title" className="text-base font-bold text-moisha-navy">
              AI Engine & App Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1 text-moisha-muted hover:bg-moisha-sand"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="rounded-xl border border-moisha-border bg-moisha-sand p-3.5 text-xs">
            <div className="flex items-center justify-between font-bold text-moisha-navy">
              <span>Server .env Gemini Bridge</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  proxyAvailable
                    ? 'bg-moisha-mint text-moisha-green'
                    : 'border border-moisha-border bg-white text-moisha-muted'
                }`}
              >
                {proxyAvailable ? `Connected (${proxyModel})` : 'Static / Offline Mode'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-moisha-muted">
              {proxyAvailable
                ? 'Local Vite server detected GEMINI_API_KEY in .env securely without exposing it in browser bundles.'
                : 'Running client-side deterministic pricing math. Add an optional key below to enable live Gemini calls on static hosting.'}
            </p>
          </div>

          <div>
            <span className="label">Pricing Advisor Mode</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={aiSettings.mode === 'auto'}
                onClick={() => onUpdateSettings({ mode: 'auto' })}
                className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                  aiSettings.mode === 'auto'
                    ? 'border-moisha-royal bg-moisha-sky font-bold text-moisha-royal'
                    : 'border-moisha-border bg-white text-moisha-navy'
                }`}
              >
                <div>Auto (Hybrid)</div>
                <div className="mt-0.5 text-[10px] font-normal text-moisha-muted">
                  Local math + Gemini AI
                </div>
              </button>

              <button
                type="button"
                aria-pressed={aiSettings.mode === 'local_only'}
                onClick={() => onUpdateSettings({ mode: 'local_only' })}
                className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                  aiSettings.mode === 'local_only'
                    ? 'border-moisha-royal bg-moisha-sky font-bold text-moisha-royal'
                    : 'border-moisha-border bg-white text-moisha-navy'
                }`}
              >
                <div>Local Deterministic</div>
                <div className="mt-0.5 text-[10px] font-normal text-moisha-muted">
                  100% offline engine
                </div>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="custom-gemini-key" className="label">
              Personal Gemini API Key (Optional for Static Deploy)
            </label>
            <input
              id="custom-gemini-key"
              type="password"
              placeholder={proxyAvailable ? 'Using .env key via local proxy' : 'AIzaSy...'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="field text-xs"
            />
            <p className="hint mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-moisha-green" />
              <span>Stored only in your browser&apos;s localStorage.</span>
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-moisha-border bg-moisha-sand/70 px-3.5 py-2.5 text-xs">
            <span className="flex items-center gap-2 font-semibold text-moisha-navy">
              {aiSettings.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-moisha-royal" />
              ) : (
                <VolumeX className="h-4 w-4 text-moisha-muted" />
              )}
              Alert Chime Sound
            </span>
            <button
              type="button"
              aria-pressed={aiSettings.soundEnabled}
              onClick={() => onUpdateSettings({ soundEnabled: !aiSettings.soundEnabled })}
              className="rounded-lg border border-moisha-border bg-white px-2.5 py-1 text-[11px] font-bold text-moisha-navy"
            >
              {aiSettings.soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-moisha-border pt-4">
            <button
              type="button"
              onClick={() => {
                onResetDemoData();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-moisha-red hover:bg-moisha-blush"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Saved Data</span>
            </button>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-quiet text-xs">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
