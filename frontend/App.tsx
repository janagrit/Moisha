import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PropertySelector } from './components/PropertySelector';
import { AgentAlertBanner } from './components/AgentAlertBanner';
import { PromotionPlanner } from './components/PromotionPlanner';
import { PocketAdvisorChat } from './components/PocketAdvisorChat';
import { LiveMarketGroundingCard } from './components/LiveMarketGroundingCard';
import { CompsManager } from './components/CompsManager';
import { RuleEngineCard } from './components/RuleEngineCard';
import { MarketCharts } from './components/MarketCharts';
import { NotificationCenter } from './components/NotificationCenter';
import { AutomationExporter } from './components/AutomationExporter';

import {
  INITIAL_HOUSES,
  INITIAL_RULES,
} from './constants';
import {
  PropertyHouse,
  ListingComp,
  PricingRule,
  AgentDecision,
  NotificationLog,
  AirbnbPromotion,
} from './types';
import { runMoishaAiAnalysis } from './services/geminiService';
import { playAlertSound } from './services/audioService';

export default function App() {
  const [houses, setHouses] = useState<PropertyHouse[]>(INITIAL_HOUSES);
  const [selectedHouseId, setSelectedHouseId] = useState<string>(INITIAL_HOUSES[0].id);
  const [rules, setRules] = useState<PricingRule[]>(INITIAL_RULES);

  const selectedHouse = houses.find((h) => h.id === selectedHouseId) || houses[0];

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>("Today 08:00 AM");
  const [agentStatus, setAgentStatus] = useState<'standby' | 'scanning' | 'alert' | 'ok'>('alert');

  const [decision, setDecision] = useState<AgentDecision>({
    status: 'ALERT',
    recommendedPrice: 215,
    priceDelta: -70,
    confidenceScore: 95,
    primaryTriggerRule: 'Neighbor Undercutting & 5-Day Empty Gap',
    reasoning: `Oy vey, Carlos! Five days empty at 1114 Florida Ave NE (Apr 16 - Apr 21) is $1,425 flying out the window! Your direct neighbor 3 doors down at 1108 Florida Ave dropped to $215/night ($70 cheaper than your $285). Drop your base rate to $215 or activate the 15% Last-Minute Promo badge, and we will win the booking before sundown!`,
    neighborGapAnalysis: `Direct neighbor at 1108 Florida Ave NE dropped from $270 to $215/night with 4.93 stars. At $285/night, your 3BR brownstone is being bypassed by guests searching DC 20002.`,
    recommendedPromotions: [
      {
        id: 'promo-1',
        name: 'Last-Minute 15% Off Badge',
        badge: '15% Off Last-Minute',
        discountPercent: 15,
        effectivePrice: 242,
        startDate: selectedHouse.unbookedStartDate,
        endDate: selectedHouse.unbookedEndDate,
        reason: 'Displays official Airbnb strikethrough badge in DC search results for travelers looking this week.',
        status: 'recommended'
      },
      {
        id: 'promo-2',
        name: 'Fill 5-Day Orphan Gap (Stay 4+ Nights)',
        badge: 'Length of Stay 18% Off',
        discountPercent: 18,
        effectivePrice: 233,
        startDate: selectedHouse.unbookedStartDate,
        endDate: selectedHouse.unbookedEndDate,
        reason: 'Incentivizes travelers to book the entire 5-day unbooked block in a single reservation.',
        status: 'recommended'
      }
    ],
    competitorSummary: {
      totalComps: 4,
      vacantComps: 3,
      avgVacantPrice: 216,
      cheapestNeighborPrice: 210,
      undercuttingCompsCount: 3,
    },
    recommendedActions: [
      'Drop price to $215/night or launch 15% Last-Minute Airbnb Promo.',
      'Allow 2-night minimum stays for this 5-day gap to capture weekend spillover.',
      'Notify property manager Carlos R. to prepare cleaning turnover schedule.'
    ],
    projectedBookingProbability: {
      atCurrentPrice: 18,
      atRecommendedPrice: 89,
    },
    timestamp: '08:00 AM',
  });

  const [logs, setLogs] = useState<NotificationLog[]>([
    {
      id: 'log-1',
      timestamp: 'Today 08:00 AM',
      channel: 'telegram',
      recipient: 'Carlos R. (Lead PM)',
      propertyNickname: '1114 Florida Ave NE, DC 20002',
      message: '🏠 MOISHA REMINDER: 1114 Florida Ave NE has 5 empty days! Neighbor at 1108 Florida Ave dropped to $215/nt. Recommend 15% promo or drop to $215.',
      delivered: true,
      status: 'sent',
    },
  ]);

  // Run AI scan on selected house
  const handleTriggerScan = useCallback(async () => {
    setIsScanning(true);
    setAgentStatus('scanning');

    try {
      const result = await runMoishaAiAnalysis(selectedHouse, rules);
      setDecision(result);
      setLastScannedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      if (result.status === 'ALERT') {
        setAgentStatus('alert');
        playAlertSound();

        const newLog: NotificationLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          channel: 'telegram',
          recipient: `${selectedHouse.propertyManagerName}`,
          propertyNickname: selectedHouse.nickname,
          message: `🚨 MOISHA REMINDER [${selectedHouse.nickname}]: ${result.reasoning.slice(0, 110)}... Drop to $${result.recommendedPrice}/nt or run promotion.`,
          delivered: true,
          status: 'sent',
        };
        setLogs((prev) => [newLog, ...prev]);
      } else {
        setAgentStatus('ok');
      }
    } catch (e) {
      console.error(e);
      setAgentStatus('standby');
    } finally {
      setIsScanning(false);
    }
  }, [selectedHouse, rules]);

  // When changing house, update advisory
  const handleSelectHouse = (id: string) => {
    setSelectedHouseId(id);
    const target = houses.find((h) => h.id === id);
    if (!target) return;

    const vacant = target.comps.filter((c) => !c.isBooked);
    const minComp = vacant.reduce(
      (m, c) => (c.currentPrice < m.currentPrice ? c : m),
      vacant[0] || target.comps[0]
    );

    const targetPrice = Math.max(target.floorPrice, minComp ? minComp.currentPrice : target.currentPrice);

    setDecision((prev) => ({
      ...prev,
      recommendedPrice: targetPrice,
      priceDelta: targetPrice - target.currentPrice,
      reasoning: `Listen to Uncle Moisha: ${target.nickname} (${target.address}) has ${target.unbookedDaysCount} unbooked days. Cheapest neighbor is asking $${minComp?.currentPrice}/night ($${target.currentPrice - (minComp?.currentPrice || 0)} cheaper than you). Let us not sleep on this!`,
      neighborGapAnalysis: `Neighbor at ${minComp?.address} is listed at $${minComp?.currentPrice}/night.`,
      competitorSummary: {
        totalComps: target.comps.length,
        vacantComps: vacant.length,
        avgVacantPrice: Math.round(vacant.reduce((a, b) => a + b.currentPrice, 0) / (vacant.length || 1)),
        cheapestNeighborPrice: minComp?.currentPrice || target.currentPrice,
        undercuttingCompsCount: vacant.filter((c) => c.currentPrice < target.currentPrice).length,
      },
      recommendedPromotions: [
        {
          id: `promo-${target.id}-1`,
          name: '15% Last-Minute Conversion Deal',
          badge: '15% Off Badge',
          discountPercent: 15,
          effectivePrice: Math.max(target.floorPrice, Math.round(target.currentPrice * 0.85)),
          startDate: target.unbookedStartDate,
          endDate: target.unbookedEndDate,
          reason: `Fills the ${target.unbookedDaysCount}-day gap for ${target.nickname}.`,
          status: 'recommended'
        }
      ]
    }));
  };

  const handleEditAddress = (houseId: string, newAddress: string) => {
    setHouses((prev) =>
      prev.map((h) => (h.id === houseId ? { ...h, address: newAddress } : h))
    );
  };

  const handleUpdateComp = (id: string, updates: Partial<ListingComp>) => {
    setHouses((prev) =>
      prev.map((h) =>
        h.id === selectedHouseId
          ? {
              ...h,
              comps: h.comps.map((c) => (c.id === id ? { ...c, ...updates } : c)),
            }
          : h
      )
    );
  };

  const handleAddComp = (newComp: Omit<ListingComp, 'id'>) => {
    const created: ListingComp = {
      ...newComp,
      id: `comp-${Date.now()}`,
    };
    setHouses((prev) =>
      prev.map((h) =>
        h.id === selectedHouseId ? { ...h, comps: [...h.comps, created] } : h
      )
    );
  };

  const handleDeleteComp = (id: string) => {
    setHouses((prev) =>
      prev.map((h) =>
        h.id === selectedHouseId
          ? { ...h, comps: h.comps.filter((c) => c.id !== id) }
          : h
      )
    );
  };

  const handleSimulateNeighborDrop = () => {
    setHouses((prev) =>
      prev.map((h) => {
        if (h.id === selectedHouseId) {
          const updatedComps = h.comps.map((c, idx) => {
            if (idx === 0) {
              return {
                ...c,
                originalPrice: c.currentPrice,
                currentPrice: Math.max(160, c.currentPrice - 25),
              };
            }
            return c;
          });
          return { ...h, comps: updatedComps };
        }
        return h;
      })
    );
    setTimeout(() => {
      handleTriggerScan();
    }, 200);
  };

  const handleApplyPriceChange = (newPrice: number) => {
    setHouses((prev) =>
      prev.map((h) => (h.id === selectedHouseId ? { ...h, currentPrice: newPrice } : h))
    );
    setDecision((prev) => ({
      ...prev,
      status: 'OK',
      priceDelta: 0,
      reasoning: `Mazel tov! Rate for ${selectedHouse.nickname} adjusted to $${newPrice}/night. You are now the sharpest deal on Florida Ave!`,
    }));
    setAgentStatus('ok');
  };

  const handleApplyPromotion = (promo: AirbnbPromotion) => {
    setHouses((prev) =>
      prev.map((h) =>
        h.id === selectedHouseId ? { ...h, activePromotion: promo } : h
      )
    );
    playAlertSound();
    const newLog: NotificationLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: 'telegram',
      recipient: selectedHouse.propertyManagerName,
      propertyNickname: selectedHouse.nickname,
      message: `🎉 PROMO ACTIVATED [${selectedHouse.nickname}]: "${promo.badge}" now live on Airbnb at $${promo.effectivePrice}/night to fill the ${selectedHouse.unbookedDaysCount}-day empty gap.`,
      delivered: true,
      status: 'sent',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleSendReminderToPM = (promo?: AirbnbPromotion) => {
    playAlertSound();
    const promoText = promo
      ? `Activate ${promo.badge} at $${promo.effectivePrice}/nt`
      : `Drop price to $${decision.recommendedPrice}/nt`;

    const newLog: NotificationLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: 'telegram',
      recipient: `${selectedHouse.propertyManagerName} (${selectedHouse.managerPhone})`,
      propertyNickname: selectedHouse.nickname,
      message: `🔔 MOISHA PM REMINDER: Action required for ${selectedHouse.nickname} (${selectedHouse.address}). 5 empty days upcoming. Neighbor is cheaper. Recommendation: ${promoText}.`,
      delivered: true,
      status: 'sent',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleSendCustomNotification = (
    channel: 'telegram' | 'twilio_sms' | 'slack',
    text: string
  ) => {
    playAlertSound();
    const newLog: NotificationLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: channel === 'twilio_sms' ? 'twilio_sms' : 'telegram',
      recipient: selectedHouse.propertyManagerName,
      propertyNickname: selectedHouse.nickname,
      message: text,
      delivered: true,
      status: 'sent',
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 flex flex-col font-sans">
      <Navbar
        isScanning={isScanning}
        onTriggerScan={handleTriggerScan}
        lastScannedTime={lastScannedTime}
        agentStatus={agentStatus}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* 1. Pocket House Selector: 1114 Florida Ave NE, DC 20002 & House 2 */}
        <PropertySelector
          houses={houses}
          selectedHouseId={selectedHouseId}
          onSelectHouse={handleSelectHouse}
          onEditAddress={handleEditAddress}
        />

        {/* 2. Core Alert Banner for Selected House */}
        <AgentAlertBanner
          decision={decision}
          house={selectedHouse}
          onApplyPriceChange={handleApplyPriceChange}
          onApplyPromotion={handleApplyPromotion}
          onSimulateReminder={() => handleSendReminderToPM()}
        />

        {/* 3. Live Public Market Grounding Scanner (Google Search Grounding for DC 20002) */}
        <LiveMarketGroundingCard
          house={selectedHouse}
        />

        {/* 4. Airbnb Promotion Strategizer (Fix the 5 Empty Days Gap) */}
        <PromotionPlanner
          house={selectedHouse}
          promotions={decision.recommendedPromotions}
          onApplyPromotion={handleApplyPromotion}
          onSendReminderToPM={handleSendReminderToPM}
        />

        {/* 5. Pocket Advisor Chat: PM Interactive Copilot */}
        <PocketAdvisorChat
          house={selectedHouse}
          decision={decision}
          onApplyAction={(type, val) => {
            if (type === 'drop_price') handleApplyPriceChange(val);
            else if (decision.recommendedPromotions[0]) handleApplyPromotion(decision.recommendedPromotions[0]);
          }}
        />

        {/* 6. Live Market Benchmark Charts */}
        <MarketCharts
          comps={selectedHouse.comps}
          myListing={{
            name: selectedHouse.title,
            location: selectedHouse.address,
            bedrooms: selectedHouse.bedrooms,
            bathrooms: selectedHouse.bathrooms,
            currentPrice: selectedHouse.currentPrice,
            floorPrice: selectedHouse.floorPrice,
            targetCheckIn: selectedHouse.unbookedStartDate,
            targetCheckOut: selectedHouse.unbookedEndDate,
            isBooked: selectedHouse.isBooked,
            cleaningFee: selectedHouse.cleaningFee,
          }}
          recommendedPrice={decision.recommendedPrice}
        />

        {/* 7. Handpicked Neighbor Comps Manager (Florida Ave, Orren St, H St NE) */}
        <CompsManager
          house={selectedHouse}
          comps={selectedHouse.comps}
          myPrice={selectedHouse.currentPrice}
          onUpdateComp={handleUpdateComp}
          onAddComp={handleAddComp}
          onDeleteComp={handleDeleteComp}
          onSimulateNeighborUndercut={handleSimulateNeighborDrop}
        />

        {/* 8. Moisha Autonomous Rules Engine */}
        <RuleEngineCard
          rules={rules}
          onToggleRule={(id) => setRules((r) => r.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)))}
          onUpdateParam={(id, val) => setRules((r) => r.map((item) => (item.id === id ? { ...item, parameterValue: val } : item)))}
          myListing={{
            name: selectedHouse.title,
            location: selectedHouse.address,
            bedrooms: selectedHouse.bedrooms,
            bathrooms: selectedHouse.bathrooms,
            currentPrice: selectedHouse.currentPrice,
            floorPrice: selectedHouse.floorPrice,
            targetCheckIn: selectedHouse.unbookedStartDate,
            targetCheckOut: selectedHouse.unbookedEndDate,
            isBooked: selectedHouse.isBooked,
            cleaningFee: selectedHouse.cleaningFee,
          }}
          onUpdateListingFloor={(floor) => setHouses((prev) => prev.map((h) => (h.id === selectedHouseId ? { ...h, floorPrice: floor } : h)))}
          onUpdateListingPrice={(price) => setHouses((prev) => prev.map((h) => (h.id === selectedHouseId ? { ...h, currentPrice: price } : h)))}
        />

        {/* 9. Alert Dispatch & Reminder Logs */}
        <NotificationCenter
          logs={logs}
          decision={decision}
          myListing={{
            name: selectedHouse.title,
            location: selectedHouse.address,
            bedrooms: selectedHouse.bedrooms,
            bathrooms: selectedHouse.bathrooms,
            currentPrice: selectedHouse.currentPrice,
            floorPrice: selectedHouse.floorPrice,
            targetCheckIn: selectedHouse.unbookedStartDate,
            targetCheckOut: selectedHouse.unbookedEndDate,
            isBooked: selectedHouse.isBooked,
            cleaningFee: selectedHouse.cleaningFee,
          }}
          onSendCustomNotification={handleSendCustomNotification}
        />

        {/* 10. Deployment Code & Cron Automation */}
        <AutomationExporter
          myListing={{
            name: selectedHouse.title,
            location: selectedHouse.address,
            bedrooms: selectedHouse.bedrooms,
            bathrooms: selectedHouse.bathrooms,
            currentPrice: selectedHouse.currentPrice,
            floorPrice: selectedHouse.floorPrice,
            targetCheckIn: selectedHouse.unbookedStartDate,
            targetCheckOut: selectedHouse.unbookedEndDate,
            isBooked: selectedHouse.isBooked,
            cleaningFee: selectedHouse.cleaningFee,
          }}
          comps={selectedHouse.comps}
        />

      </main>

      <footer className="border-t border-[#E8DFD3] bg-white py-6 text-center text-xs text-slate-500 font-mono">
        Moisha Pocket AI • 1114 Florida Ave NE, Washington, DC 20002 • Wise Real Estate Mindset • Shalom & High Occupancy
      </footer>
    </div>
  );
}
