import React, { useState } from 'react';
import { NotificationLog, AgentDecision, MyListingConfig } from '../types';
import { Send, Smartphone, CheckCheck, MessageSquare } from 'lucide-react';

interface NotificationCenterProps {
  logs: NotificationLog[];
  decision: AgentDecision;
  myListing: MyListingConfig;
  onSendCustomNotification: (channel: 'telegram' | 'twilio_sms' | 'slack', text: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  logs,
  decision,
  myListing,
  onSendCustomNotification
}) => {
  const [activeChannel, setActiveChannel] = useState<'telegram' | 'twilio_sms' | 'slack'>('telegram');
  const [customMsg, setCustomMsg] = useState('');

  const defaultFormattedAlert = `🏠 MOISHA REMINDER FOR CARLOS:
5 empty days upcoming for ${myListing.name}!
• Current: $${myListing.currentPrice}/nt
• Moisha Recommended: $${decision.recommendedPrice}/nt (-$${Math.abs(decision.priceDelta)})
• Why: ${decision.reasoning}
Reply 1 to auto-update on Airbnb, or PROMO to activate 15% badge.`;

  const handleSend = () => {
    onSendCustomNotification(activeChannel, customMsg || defaultFormattedAlert);
    setCustomMsg('');
  };

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center text-lg shadow-xs">
            📢
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-blue-950">Moisha Dispatch Hub: Telegram, WhatsApp & SMS</h3>
            <p className="text-xs text-slate-500">Instant reminders to property manager Carlos R. so no days rot on Florida Ave</p>
          </div>
        </div>

        {/* Channel selector */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1.5 rounded-2xl border border-stone-200 text-xs">
          <button
            onClick={() => setActiveChannel('telegram')}
            className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 font-bold ${
              activeChannel === 'telegram' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>Telegram Bot</span>
          </button>
          <button
            onClick={() => setActiveChannel('twilio_sms')}
            className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 font-bold ${
              activeChannel === 'twilio_sms' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>SMS / WhatsApp</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Phone Mockup Preview */}
        <div className="bg-[#FAF8F5] rounded-3xl border border-stone-200 p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🕎</span>
              <span className="text-xs font-mono font-bold text-blue-950 uppercase">
                {activeChannel === 'telegram' ? '@MoishaAdvisorBot' : '+1 (202) 555-0189 (Carlos R.)'}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Active Sentinel
            </span>
          </div>

          <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
            {defaultFormattedAlert}
            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-2">
              <span>{decision.timestamp}</span>
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Custom notification message..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="flex-1 bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
            />
            <button
              onClick={handleSend}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-[#FAF8F5] rounded-3xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs font-mono uppercase text-slate-500 font-bold">Recent Dispatches to PM</span>
            <span className="text-[10px] text-slate-400 font-mono">{logs.length} sent</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-white border border-stone-200 text-xs shadow-2xs">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-mono text-blue-700 uppercase font-bold">
                    [{log.channel.toUpperCase()}] → {log.recipient}
                  </span>
                  <span className="text-slate-400 font-mono">{log.timestamp}</span>
                </div>
                <p className="text-slate-700 font-mono text-[11px] line-clamp-2">
                  {log.message}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
