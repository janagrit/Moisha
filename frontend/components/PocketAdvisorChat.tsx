import React, { useState } from 'react';
import { PropertyHouse, AgentDecision, ChatMessage } from '../types';
import { askMoishaPocketAdvisor } from '../services/geminiService';
import { Send, Sparkles, Zap, User } from 'lucide-react';

interface PocketAdvisorChatProps {
  house: PropertyHouse;
  decision: AgentDecision;
  onApplyAction: (type: 'drop_price' | 'run_promo', value: number) => void;
}

export const PocketAdvisorChat: React.FC<PocketAdvisorChatProps> = ({
  house,
  decision,
  onApplyAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: `Shalom Carlos! Uncle Moisha here looking after ${house.nickname} at ${house.address}. Listen to me: you have ${house.unbookedDaysCount} empty days (${house.unbookedStartDate.slice(5)} - ${house.unbookedEndDate.slice(5)}). Your neighbor at ${decision.competitorSummary.cheapestNeighborPrice ? '$' + decision.competitorSummary.cheapestNeighborPrice : 'next door'} dropped their rate! How can your Moisha help you book these dates today?`,
      timestamp: '08:00 AM',
      suggestedAction: {
        type: 'drop_price',
        value: decision.recommendedPrice,
        label: `Drop price to $${decision.recommendedPrice}/nt`
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Quick preset prompts for property managers
  const presets = [
    `Moisha, the neighbor is cheaper for my 5 empty days, what should I do?`,
    `Should I run an Airbnb promotion or drop base price?`,
    `Will dropping to $215 guarantee a booking?`,
    `Can I protect my cleaning fee and still win guests?`
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await askMoishaPocketAdvisor(house, text, decision);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: response.action,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `Listen to your Moisha: to beat the Florida Ave neighbor at $${decision.competitorSummary.cheapestNeighborPrice}, activate the 15% Last-Minute promo or drop to $${decision.recommendedPrice}/night immediately!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-5 sm:p-6 flex flex-col h-[520px] shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl shadow-xs">
            🕎
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-serif font-bold text-blue-950">Moisha Pocket Advisor Chat</h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                Online for {house.nickname}
              </span>
            </div>
            <p className="text-xs text-slate-500">Ask Moisha anything about Florida Ave rates, promotions & guest psychology</p>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-500 hidden sm:inline bg-stone-100 px-2.5 py-1 rounded-lg">
          {house.address.split(',')[0]}
        </span>
      </div>

      {/* Preset Quick Chips */}
      <div className="py-2.5 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-400 text-[10px] uppercase font-mono font-bold shrink-0">Ask Moisha:</span>
        {presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(preset)}
            className="shrink-0 px-3 py-1 rounded-full bg-[#FAF8F5] hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-stone-200 hover:border-amber-300 transition-colors font-medium shadow-2xs"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
        {messages.map((m) => {
          const isAi = m.role === 'assistant';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
            >
              {isAi && (
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300 mt-0.5 text-sm">
                  🕎
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                isAi
                  ? 'bg-[#FAF8F5] border border-stone-200 text-slate-800 shadow-2xs'
                  : 'bg-blue-700 text-white shadow-sm'
              }`}>
                <p className="whitespace-pre-wrap font-medium">{m.content}</p>

                {/* 1-click suggested action pill */}
                {m.suggestedAction && isAi && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-amber-800 font-mono font-bold">Moisha's Recommendation:</span>
                    <button
                      onClick={() => onApplyAction(m.suggestedAction!.type, m.suggestedAction!.value)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>{m.suggestedAction.label}</span>
                    </button>
                  </div>
                )}

                <span className={`block text-[10px] text-right mt-1 font-mono ${isAi ? 'text-slate-400' : 'text-blue-200'}`}>
                  {m.timestamp}
                </span>
              </div>

              {!isAi && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-amber-800 font-mono py-2 bg-amber-50 px-3 rounded-xl border border-amber-200 w-fit">
            <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
            <span>Uncle Moisha is calculating neighbor rates on Florida Ave...</span>
          </div>
        )}
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 border-t border-stone-200 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={`Ask Moisha about 1114 Florida Ave's 5 empty days or neighbor prices...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-[#FAF8F5] border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask Moisha</span>
        </button>
      </form>

    </div>
  );
};
