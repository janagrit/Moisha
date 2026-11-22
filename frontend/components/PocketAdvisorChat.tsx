import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Zap, User } from 'lucide-react';
import { PropertyHouse, AgentDecision, ChatMessage, AiSettings } from '../types';
import { askMoishaAdvisor } from '../services/aiService';

interface PocketAdvisorChatProps {
  house: PropertyHouse;
  decision: AgentDecision;
  aiSettings: AiSettings;
  proxyAvailable: boolean;
  onApplyAction: (type: 'set_price' | 'run_promo', value: number) => void;
}

function createOpeningMessage(house: PropertyHouse, decision: AgentDecision): ChatMessage {
  const actionLabel =
    decision.direction === 'raise'
      ? `Raise Rate to $${decision.recommendedPrice}/nt`
      : `Drop Rate to $${decision.recommendedPrice}/nt`;

  return {
    id: `msg-init-${house.id}`,
    role: 'assistant',
    content:
      decision.direction === 'raise'
        ? `Shalom ${house.propertyManagerName}! Uncle Moisha here watching ${house.nickname}. Nearby listings in ${house.neighborhood} average $${decision.competitorSummary.medianCompPrice}/night while you're at $${house.currentPrice}/night. Ask me about raising your rate, weekend pricing, or net profit!`
        : decision.direction === 'drop'
          ? `Shalom ${house.propertyManagerName}! Uncle Moisha here watching ${house.nickname}. You have ${house.unbookedDaysCount} empty nights (${house.unbookedStartDate.slice(5)}–${house.unbookedEndDate.slice(5)}) and cheapest vacant neighbor is at $${decision.competitorSummary.cheapestNeighborPrice}/night. How should we fill this calendar gap?`
          : `Shalom ${house.propertyManagerName}! ${house.nickname} is sitting nicely at $${house.currentPrice}/night (floor: $${decision.effectiveFloorPrice}/night). Ask me anything about neighbor comps, promotion badges, or cleaning margins!`,
    timestamp: decision.timestamp,
    suggestedAction:
      decision.recommendedPrice !== house.currentPrice
        ? {
            type: 'set_price',
            value: decision.recommendedPrice,
            label: actionLabel,
          }
        : undefined,
  };
}

export const PocketAdvisorChat: React.FC<PocketAdvisorChatProps> = ({
  house,
  decision,
  aiSettings,
  proxyAvailable,
  onApplyAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createOpeningMessage(house, decision),
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const presets = [
    'Should I run a promo badge or adjust base price?',
    'Break down my net profit & cleaning margin',
    'How do my rates compare to nearby neighbors?',
  ];

  const handleSend = async (presetText?: string) => {
    const text = (presetText ?? input).trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!presetText) setInput('');
    setIsThinking(true);

    try {
      const response = await askMoishaAdvisor(
        house,
        text,
        decision,
        aiSettings,
        proxyAvailable,
      );
      if (!mountedRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction: response.action,
        },
      ]);
    } finally {
      if (mountedRef.current) {
        setIsThinking(false);
      }
    }
  };

  return (
    <section
      aria-label="Pocket advisor chat"
      className="card flex h-[600px] flex-col justify-between p-6"
    >
      <div className="flex items-center justify-between border-b border-moisha-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300 bg-moisha-butter text-xl">
            🕎
          </div>
          <div>
            <h3 className="text-lg font-bold text-moisha-navy sm:text-xl">Ask Uncle Moisha</h3>
            <p className="text-sm text-moisha-muted">
              Copilot for {house.nickname} · Floor ${decision.effectiveFloorPrice}/nt
            </p>
          </div>
        </div>
        <span className="rounded-full border border-blue-200 bg-moisha-sky px-3 py-1 text-xs font-bold text-moisha-royal">
          Online
        </span>
      </div>

      <div className="flex flex-wrap gap-2 py-3">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => void handleSend(preset)}
            className="rounded-full border border-moisha-border bg-moisha-sand px-3.5 py-1.5 text-xs font-semibold text-moisha-navy transition-colors hover:border-amber-300 hover:bg-moisha-butter sm:text-sm"
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto py-2 pr-1">
        {messages.map((m) => {
          const isAi = m.role === 'assistant';
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
            >
              {isAi && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-moisha-butter text-sm">
                  🕎
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl p-4 text-sm leading-relaxed sm:text-base ${
                  isAi
                    ? 'border border-moisha-border bg-moisha-sand text-moisha-navy'
                    : 'bg-moisha-royal text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                {isAi && m.suggestedAction && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-moisha-border pt-2.5">
                    <span className="text-xs font-bold text-moisha-amber">
                      Quick Action:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyAction(m.suggestedAction!.type, m.suggestedAction!.value)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-moisha-green px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 sm:text-sm"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>{m.suggestedAction.label}</span>
                    </button>
                  </div>
                )}

                <span
                  className={`mt-1.5 block text-right text-xs ${
                    isAi ? 'text-moisha-muted' : 'text-blue-100'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>

              {!isAi && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-moisha-navy">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isThinking && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-moisha-butter px-3.5 py-2.5 text-sm font-medium text-moisha-amber">
            <Sparkles className="h-4 w-4 animate-spin" />
            <span>Moisha is checking the numbers...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex items-center gap-2.5 border-t border-moisha-border pt-3.5"
      >
        <input
          type="text"
          aria-label="Ask Uncle Moisha a pricing question"
          placeholder={`Ask about ${house.nickname} rates, promos, or profit...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="field flex-1 text-base"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-moisha-navy px-5 text-sm font-bold text-white transition-opacity disabled:opacity-40 sm:text-base"
        >
          <Send className="h-4 w-4" />
          <span>Send</span>
        </button>
      </form>
    </section>
  );
};
