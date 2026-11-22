import React, { useState } from 'react';
import { Send, Smartphone, Bell, CheckCircle2, Copy, Check, Share2 } from 'lucide-react';
import {
  NotificationLog,
  NotificationChannel,
  AgentDecision,
  PropertyHouse,
} from '../types';

interface NotificationCenterProps {
  logs: NotificationLog[];
  decision: AgentDecision;
  house: PropertyHouse;
  onSendCustomNotification: (channel: NotificationChannel, text: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  logs,
  decision,
  house,
  onSendCustomNotification,
}) => {
  const [activeChannel, setActiveChannel] = useState<NotificationChannel>('telegram');
  const [customMsg, setCustomMsg] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const deltaLabel =
    decision.priceDelta > 0
      ? `+$${decision.priceDelta}`
      : decision.priceDelta < 0
        ? `-$${Math.abs(decision.priceDelta)}`
        : '$0';

  const defaultFormattedAlert = `🏠 MOISHA ALERT · ${house.nickname}
• Gap: ${house.unbookedDaysCount} nights (${house.unbookedStartDate.slice(5)}–${house.unbookedEndDate.slice(5)})
• Current: $${house.currentPrice}/nt → Recommended: $${decision.recommendedPrice}/nt (${deltaLabel})
• Floor Guardrail: $${decision.effectiveFloorPrice}/nt
• Note: ${decision.headline}`;

  const effectiveMessage = customMsg.trim() || defaultFormattedAlert;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(effectiveMessage)}`;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(effectiveMessage);
      setCopiedMsg(true);
      window.setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleSend = () => {
    onSendCustomNotification(activeChannel, effectiveMessage);
    setCustomMsg('');
  };

  const channelButtons: Array<{ id: NotificationChannel; label: string; icon: React.ReactNode }> = [
    { id: 'telegram', label: 'Telegram', icon: <Send className="h-3 w-3" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <Smartphone className="h-3 w-3" /> },
    { id: 'twilio_sms', label: 'SMS', icon: <Smartphone className="h-3 w-3" /> },
    { id: 'browser', label: 'Browser Push', icon: <Bell className="h-3 w-3" /> },
  ];

  return (
    <section aria-label="Alert dispatch center" className="card p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300 bg-moisha-butter text-lg">
            📢
          </div>
          <div>
            <h3 className="text-base font-bold text-moisha-navy">
              Price Alert Dispatch & Browser Notifications
            </h3>
            <p className="text-xs text-moisha-muted">
              Dispatch pricing alerts to {house.propertyManagerName} or trigger a live browser notification.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-moisha-border bg-moisha-sand p-1.5 text-xs">
          {channelButtons.map((ch) => (
            <button
              key={ch.id}
              type="button"
              aria-pressed={activeChannel === ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition-colors ${
                activeChannel === ch.id
                  ? 'bg-moisha-navy text-white'
                  : 'text-moisha-muted hover:text-moisha-navy'
              }`}
            >
              {ch.icon}
              <span>{ch.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Preview & Send */}
        <div className="rounded-2xl border border-moisha-border bg-moisha-sand/70 p-5">
          <div className="mb-3 flex items-center justify-between border-b border-moisha-border pb-2.5 text-xs">
            <span className="font-bold text-moisha-navy">
              Channel:{' '}
              {activeChannel === 'telegram'
                ? '@MoishaAdvisorBot'
                : activeChannel === 'browser'
                  ? 'PWA Service Worker Push'
                  : `${house.propertyManagerName} (${house.managerPhone})`}
            </span>
            <span className="rounded-full border border-emerald-200 bg-moisha-mint px-2.5 py-0.5 text-[10px] font-bold text-moisha-green">
              Ready
            </span>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-4 text-xs leading-relaxed whitespace-pre-wrap text-moisha-navy">
            {defaultFormattedAlert}
            <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-moisha-muted">
              <span>{decision.timestamp}</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-moisha-royal" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-moisha-border pt-3">
            <input
              type="text"
              aria-label="Custom alert message"
              placeholder="Optional custom note..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="field min-h-10 flex-1 text-xs"
            />
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-moisha-royal px-4 text-xs font-bold text-white hover:bg-blue-700"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Dispatch</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyMessage()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-moisha-border bg-white px-3 py-1.5 text-xs font-bold text-moisha-navy hover:bg-moisha-sand"
            >
              {copiedMsg ? (
                <>
                  <Check className="h-3.5 w-3.5 text-moisha-green" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-moisha-royal" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-moisha-mint px-3 py-1.5 text-xs font-bold text-moisha-green hover:bg-emerald-100"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share via WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Logs */}
        <div className="rounded-2xl border border-moisha-border bg-moisha-sand/70 p-5">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-bold text-moisha-muted uppercase">Recent Dispatches</span>
            <span className="text-[11px] font-semibold text-moisha-muted">{logs.length} total</span>
          </div>

          <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-moisha-border bg-white p-3 text-xs"
              >
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-moisha-royal uppercase">
                    [{log.channel}] → {log.recipient}
                  </span>
                  <span className="text-moisha-muted">{log.timestamp}</span>
                </div>
                <p className="line-clamp-2 text-[11px] text-moisha-navy">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
