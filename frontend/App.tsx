import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart3, Layers, Calculator, Sliders } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PropertySelector } from './components/PropertySelector';
import { AgentAlertBanner } from './components/AgentAlertBanner';
import { MarketCharts } from './components/MarketCharts';
import { PocketAdvisorChat } from './components/PocketAdvisorChat';
import { CompsManager } from './components/CompsManager';
import { LiveMarketGroundingCard } from './components/LiveMarketGroundingCard';
import { RevenueCalculator } from './components/RevenueCalculator';
import { PromotionPlanner } from './components/PromotionPlanner';
import { RuleEngineCard } from './components/RuleEngineCard';
import { NotificationCenter } from './components/NotificationCenter';
import { SettingsModal } from './components/SettingsModal';
import { QuickStartBanner, HowItWorksModal } from './components/HowItWorksGuide';

import {
  PropertyHouse,
  ListingComp,
  PricingRule,
  AgentDecision,
  NotificationLog,
  NotificationChannel,
  AirbnbPromotion,
  AiSettings,
  ActiveWorkspaceTab,
} from './types';
import { evaluatePropertyPricing } from './services/pricingEngine';
import { checkGeminiProxyStatus, runMoishaAnalysis } from './services/aiService';
import {
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
} from './services/storageService';
import { sendBrowserAlertNotification } from './services/notificationService';
import { playAlertSound } from './services/audioService';

export default function App() {
  const initialState = useMemo(() => loadPersistedState(), []);

  const [houses, setHouses] = useState<PropertyHouse[]>(initialState.houses);
  const [selectedHouseId, setSelectedHouseId] = useState<string>(initialState.selectedHouseId);
  const [rules, setRules] = useState<PricingRule[]>(initialState.rules);
  const [logs, setLogs] = useState<NotificationLog[]>(initialState.logs);
  const [aiSettings, setAiSettings] = useState<AiSettings>(initialState.aiSettings);

  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [quickGuideHidden, setQuickGuideHidden] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('moisha_guide_dismissed_v1') === '1';
    } catch {
      return false;
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>('08:00 AM');
  const [proxyAvailable, setProxyAvailable] = useState(false);
  const [proxyModel, setProxyModel] = useState('gemini-2.5-flash');

  // Monotonic token to discard stale in-flight Gemini scans if user edits state mid-request
  const analysisRequestIdRef = useRef(0);

  const [aiDecisionOverride, setAiDecisionOverride] = useState<{
    houseId: string;
    decision: AgentDecision;
  } | null>(null);

  const invalidateAiOverride = useCallback(() => {
    analysisRequestIdRef.current += 1;
    setAiDecisionOverride(null);
  }, []);

  const selectedHouse = useMemo(
    () => houses.find((h) => h.id === selectedHouseId) || houses[0],
    [houses, selectedHouseId],
  );

  const baseDecision = useMemo(
    () => evaluatePropertyPricing(selectedHouse, rules, lastScannedTime || undefined),
    [selectedHouse, rules, lastScannedTime],
  );

  const decision = useMemo<AgentDecision>(() => {
    if (aiDecisionOverride && aiDecisionOverride.houseId === selectedHouse.id) {
      return {
        ...baseDecision,
        headline: aiDecisionOverride.decision.headline,
        reasoning: aiDecisionOverride.decision.reasoning,
        neighborGapAnalysis: aiDecisionOverride.decision.neighborGapAnalysis,
        recommendedActions: aiDecisionOverride.decision.recommendedActions,
        source: 'gemini',
      };
    }
    return baseDecision;
  }, [aiDecisionOverride, baseDecision, selectedHouse.id]);

  useEffect(() => {
    savePersistedState({
      houses,
      selectedHouseId,
      rules,
      logs,
      aiSettings,
    });
  }, [houses, selectedHouseId, rules, logs, aiSettings]);

  useEffect(() => {
    let active = true;
    checkGeminiProxyStatus().then((status) => {
      if (active) {
        setProxyAvailable(status.proxyAvailable);
        setProxyModel(status.model);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const triggerChime = useCallback(() => {
    if (aiSettings.soundEnabled) {
      playAlertSound();
    }
  }, [aiSettings.soundEnabled]);

  const appendLog = useCallback(
    (channel: NotificationChannel, message: string, delivered = true) => {
      const entry: NotificationLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel,
        recipient:
          channel === 'browser'
            ? 'This Device (PWA)'
            : `${selectedHouse.propertyManagerName}`,
        propertyNickname: selectedHouse.nickname,
        message,
        delivered,
        status: delivered ? 'sent' : 'failed',
      };
      setLogs((prev) => [entry, ...prev.slice(0, 49)]);
    },
    [selectedHouse.nickname, selectedHouse.propertyManagerName],
  );

  const runAnalysisForHouse = useCallback(
    async (targetHouse: PropertyHouse, currentRules: PricingRule[]) => {
      const reqId = ++analysisRequestIdRef.current;
      setIsScanning(true);
      try {
        const analyzed = await runMoishaAnalysis(
          targetHouse,
          currentRules,
          aiSettings,
          proxyAvailable,
        );
        if (reqId !== analysisRequestIdRef.current) {
          return;
        }
        const nowStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastScannedTime(nowStr);

        if (analyzed.source === 'gemini') {
          setAiDecisionOverride({ houseId: targetHouse.id, decision: analyzed });
        } else {
          setAiDecisionOverride(null);
        }

        if (analyzed.status === 'ALERT' || analyzed.status === 'UPSIDE') {
          triggerChime();
        }
      } finally {
        if (reqId === analysisRequestIdRef.current) {
          setIsScanning(false);
        }
      }
    },
    [aiSettings, proxyAvailable, triggerChime],
  );

  const handleSelectHouse = (id: string) => {
    setSelectedHouseId(id);
  };

  const handleUpdateHouse = (houseId: string, updates: Partial<PropertyHouse>) => {
    invalidateAiOverride();
    setHouses((prev) =>
      prev.map((h) => (h.id === houseId ? { ...h, ...updates } : h)),
    );
  };

  const handleAddHouse = (created: PropertyHouse) => {
    invalidateAiOverride();
    setHouses((prev) => [...prev, created]);
    setSelectedHouseId(created.id);
  };

  const handleDeleteHouse = (houseId: string) => {
    invalidateAiOverride();
    setHouses((prev) => {
      const remaining = prev.filter((h) => h.id !== houseId);
      if (remaining.length > 0 && selectedHouseId === houseId) {
        setSelectedHouseId(remaining[0].id);
      }
      return remaining.length > 0 ? remaining : prev;
    });
  };

  const handleUpdateComp = (compId: string, updates: Partial<ListingComp>) => {
    invalidateAiOverride();
    setHouses((prev) =>
      prev.map((h) =>
        h.id === selectedHouse.id
          ? {
              ...h,
              comps: h.comps.map((c) => (c.id === compId ? { ...c, ...updates } : c)),
            }
          : h,
      ),
    );
  };

  const handleAddComp = (newComp: Omit<ListingComp, 'id'>) => {
    invalidateAiOverride();
    const created: ListingComp = {
      ...newComp,
      id: `comp-${Date.now()}`,
    };
    setHouses((prev) =>
      prev.map((h) =>
        h.id === selectedHouse.id ? { ...h, comps: [...h.comps, created] } : h,
      ),
    );
  };

  const handleDeleteComp = (compId: string) => {
    invalidateAiOverride();
    setHouses((prev) =>
      prev.map((h) =>
        h.id === selectedHouse.id
          ? { ...h, comps: h.comps.filter((c) => c.id !== compId) }
          : h,
      ),
    );
  };

  const handleSimulateNeighborDrop = () => {
    const targetCompIndex = selectedHouse.comps.findIndex((c) => !c.isBooked);
    const idxToDrop = targetCompIndex >= 0 ? targetCompIndex : 0;
    if (selectedHouse.comps.length === 0) return;

    const updatedComps = selectedHouse.comps.map((c, idx) =>
      idx === idxToDrop
        ? {
            ...c,
            originalPrice: c.currentPrice,
            currentPrice: Math.max(120, c.currentPrice - 25),
            isBooked: false,
          }
        : c,
    );
    const updatedHouse: PropertyHouse = { ...selectedHouse, comps: updatedComps };

    invalidateAiOverride();
    setHouses((prev) =>
      prev.map((h) => (h.id === selectedHouse.id ? updatedHouse : h)),
    );
    void runAnalysisForHouse(updatedHouse, rules);
  };

  const handleApplyPriceChange = (newPrice: number) => {
    const clamped = Math.max(decision.effectiveFloorPrice, Math.round(newPrice));
    invalidateAiOverride();
    setHouses((prev) =>
      prev.map((h) => (h.id === selectedHouse.id ? { ...h, currentPrice: clamped } : h)),
    );
    triggerChime();
    appendLog(
      'telegram',
      `Rate updated for ${selectedHouse.nickname}: now $${clamped}/night (floor $${decision.effectiveFloorPrice}/nt).`,
    );
  };

  const handleApplyPromotion = (promo: AirbnbPromotion | null) => {
    invalidateAiOverride();
    setHouses((prev) =>
      prev.map((h) => (h.id === selectedHouse.id ? { ...h, activePromotion: promo } : h)),
    );
    triggerChime();
    if (promo) {
      appendLog(
        'telegram',
        `Promo activated on ${selectedHouse.nickname}: "${promo.badge}" at $${promo.effectivePrice}/night.`,
      );
    }
  };

  const handleSendReminderToPM = (promo?: AirbnbPromotion) => {
    triggerChime();
    const actionSummary = promo
      ? `Activate "${promo.badge}" ($${promo.effectivePrice}/nt)`
      : `Adjust rate to $${decision.recommendedPrice}/nt`;
    appendLog(
      'whatsapp',
      `PM Reminder [${selectedHouse.nickname}]: ${selectedHouse.unbookedDaysCount} nights open. Recommended: ${actionSummary}.`,
    );
  };

  const handleSendCustomNotification = async (
    channel: NotificationChannel,
    text: string,
  ) => {
    triggerChime();
    if (channel === 'browser') {
      const ok = await sendBrowserAlertNotification(
        `Moisha · ${selectedHouse.nickname}`,
        text,
      );
      appendLog('browser', text, ok);
      return;
    }
    appendLog(channel, text, true);
  };

  const updateQuickGuideHidden = (hidden: boolean) => {
    setQuickGuideHidden(hidden);
    try {
      if (hidden) {
        window.localStorage.setItem('moisha_guide_dismissed_v1', '1');
      } else {
        window.localStorage.removeItem('moisha_guide_dismissed_v1');
      }
    } catch {
      // Ignore private browsing storage restrictions
    }
  };

  const handleResetDemoData = () => {
    invalidateAiOverride();
    const fresh = clearPersistedState();
    setHouses(fresh.houses);
    setSelectedHouseId(fresh.selectedHouseId);
    setRules(fresh.rules);
    setLogs(fresh.logs);
    setAiSettings(fresh.aiSettings);
    updateQuickGuideHidden(false);
  };

  const aiActive =
    aiSettings.mode === 'auto' &&
    (proxyAvailable || Boolean(aiSettings.customApiKey.trim()));

  const tabs: Array<{
    id: ActiveWorkspaceTab;
    label: string;
    badge?: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'overview',
      label: 'Verdict & Copilot',
      badge:
        decision.status === 'ALERT'
          ? 'Alert'
          : decision.status === 'UPSIDE'
            ? 'Upside'
            : undefined,
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: 'comps',
      label: 'Comps & Submarket',
      badge: String(selectedHouse.comps.length),
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: 'revenue',
      label: 'Profit & Promotions',
      badge:
        decision.recommendedPromotions.length > 0
          ? String(decision.recommendedPromotions.length)
          : undefined,
      icon: <Calculator className="h-4 w-4" />,
    },
    {
      id: 'rules',
      label: 'Rules & Alerts',
      badge: String(rules.filter((r) => r.enabled).length),
      icon: <Sliders className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-moisha-sand font-sans text-moisha-navy">
      <Navbar
        selectedHouse={selectedHouse}
        decision={decision}
        isScanning={isScanning}
        onTriggerScan={() => void runAnalysisForHouse(selectedHouse, rules)}
        lastScannedTime={lastScannedTime}
        aiActive={aiActive}
        onOpenGuide={() => setGuideModalOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {!quickGuideHidden && (
          <QuickStartBanner
            onDismiss={() => updateQuickGuideHidden(true)}
            onOpenFullGuide={() => setGuideModalOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        <PropertySelector
          houses={houses}
          selectedHouseId={selectedHouse.id}
          onSelectHouse={handleSelectHouse}
          onUpdateHouse={handleUpdateHouse}
          onAddHouse={handleAddHouse}
          onDeleteHouse={handleDeleteHouse}
        />

        <nav
          aria-label="Workspace sections"
          className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-moisha-border bg-white p-1.5 shadow-sm"
        >
          {tabs.map((tab) => {
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                  isCurrent
                    ? 'bg-moisha-navy text-white shadow-sm'
                    : 'text-moisha-muted hover:bg-moisha-sand hover:text-moisha-navy'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : tab.badge === 'Alert'
                          ? 'bg-moisha-butter text-moisha-amber'
                          : 'bg-moisha-sand text-moisha-navy'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AgentAlertBanner
              decision={decision}
              house={selectedHouse}
              onApplyPriceChange={handleApplyPriceChange}
              onApplyPromotion={(promo) => handleApplyPromotion(promo)}
              onDispatchReminder={() => handleSendReminderToPM()}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <MarketCharts house={selectedHouse} decision={decision} />
              <PocketAdvisorChat
                key={selectedHouse.id}
                house={selectedHouse}
                decision={decision}
                aiSettings={aiSettings}
                proxyAvailable={proxyAvailable}
                onApplyAction={(type, value) => {
                  if (type === 'set_price') {
                    handleApplyPriceChange(value);
                  } else if (decision.recommendedPromotions[0]) {
                    handleApplyPromotion({
                      ...decision.recommendedPromotions[0],
                      status: 'applied',
                    });
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'comps' && (
          <div className="space-y-6">
            <CompsManager
              house={selectedHouse}
              comps={selectedHouse.comps}
              myPrice={selectedHouse.currentPrice}
              onUpdateComp={handleUpdateComp}
              onAddComp={handleAddComp}
              onDeleteComp={handleDeleteComp}
              onSimulateNeighborUndercut={handleSimulateNeighborDrop}
            />
            <LiveMarketGroundingCard
              key={selectedHouse.id}
              house={selectedHouse}
              decision={decision}
              aiSettings={aiSettings}
              proxyAvailable={proxyAvailable}
            />
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <RevenueCalculator
              house={selectedHouse}
              decision={decision}
              onUpdateHouseCosts={(updates) => handleUpdateHouse(selectedHouse.id, updates)}
              onApplyPrice={handleApplyPriceChange}
            />
            <PromotionPlanner
              house={selectedHouse}
              promotions={decision.recommendedPromotions}
              effectiveFloorPrice={decision.effectiveFloorPrice}
              onApplyPromotion={handleApplyPromotion}
              onSendReminderToPM={(promo) => handleSendReminderToPM(promo)}
            />
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <RuleEngineCard
              house={selectedHouse}
              rules={rules}
              onToggleRule={(id) => {
                invalidateAiOverride();
                setRules((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
                );
              }}
              onUpdateParam={(id, val) => {
                invalidateAiOverride();
                setRules((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, parameterValue: val } : r)),
                );
              }}
              onUpdateHouse={(updates) => handleUpdateHouse(selectedHouse.id, updates)}
            />
            <NotificationCenter
              logs={logs}
              decision={decision}
              house={selectedHouse}
              onSendCustomNotification={(ch, text) =>
                void handleSendCustomNotification(ch, text)
              }
            />
          </div>
        )}
      </main>

      {guideModalOpen && (
        <HowItWorksModal
          isOpen={guideModalOpen}
          onClose={() => setGuideModalOpen(false)}
          onRestoreQuickBanner={() => updateQuickGuideHidden(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          aiSettings={aiSettings}
          proxyAvailable={proxyAvailable}
          proxyModel={proxyModel}
          onUpdateSettings={(updates) =>
            setAiSettings((prev) => ({ ...prev, ...updates }))
          }
          onResetDemoData={handleResetDemoData}
        />
      )}

      <footer className="mt-10 border-t border-moisha-border bg-white py-5 text-center text-xs text-moisha-muted">
        Moisha Pocket Advisor · Neighborhood Rental Pricing, Floor Guardrails & Profit Calculator
      </footer>
    </div>
  );
}
