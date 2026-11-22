import { useState, useEffect, useMemo } from 'react';
import { TopBar } from './components/TopBar';
import { PropertyOnboarding } from './components/PropertyOnboarding';
import { MyPropertyCard } from './components/MyPropertyCard';
import { MarketOverviewStrip } from './components/MarketOverviewStrip';
import { PriceChangesFeed } from './components/PriceChangesFeed';
import { CompetitorListingsSection } from './components/CompetitorListingsSection';
import { PropertyEditModal } from './components/PropertyEditModal';
import { CompetitorFormModal } from './components/CompetitorFormModal';
import { DailyCheckModal } from './components/DailyCheckModal';
import { EmailAlertsModal } from './components/EmailAlertsModal';

import {
  MonitoringState,
  HostProperty,
  CompetitorListing,
  PropertyType,
  Amenity,
  PriceChangeEvent,
} from './types';
import {
  partitionCompetitors,
  computeMarketOverview,
} from './services/competitorMatcher';
import {
  loadMonitoringState,
  saveMonitoringState,
  clearMonitoringState,
  recordPriceCheck,
} from './services/monitoringService';
import {
  checkAiAvailable,
  fetchConciseMarketSummary,
} from './services/aiSummaryService';

export default function App() {
  const [state, setState] = useState<MonitoringState>(() => loadMonitoringState());

  const [editPropertyOpen, setEditPropertyOpen] = useState(false);
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<CompetitorListing | null>(null);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    saveMonitoringState(state);
  }, [state]);

  useEffect(() => {
    let mounted = true;
    checkAiAvailable().then((ok) => {
      if (mounted) setAiAvailable(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const partitioned = useMemo(() => {
    if (!state.property) {
      return { primary: [], secondary: [], excluded: [] };
    }
    return partitionCompetitors(state.property, state.competitors);
  }, [state.property, state.competitors]);

  const overview = useMemo(() => {
    if (!state.property) return null;
    return computeMarketOverview(
      state.property,
      partitioned.primary,
      state.priceChanges,
      state.previousCheckAt,
      state.lastCheckChangesCount,
    );
  }, [
    state.property,
    partitioned.primary,
    state.priceChanges,
    state.previousCheckAt,
    state.lastCheckChangesCount,
  ]);

  const handleRegisterProperty = (property: HostProperty) => {
    setAiSummary(null);
    setState((prev) => ({
      ...prev,
      property,
    }));
  };

  const handleSaveProperty = (updated: HostProperty) => {
    setAiSummary(null);
    setState((prev) => ({
      ...prev,
      property: updated,
    }));
  };

  const handleResetProperty = () => {
    setEditPropertyOpen(false);
    setAiSummary(null);
    setState(clearMonitoringState());
  };

  const handleSaveCompetitor = (input: {
    id?: string;
    airbnbUrl: string;
    airbnbRoomId: string | null;
    name: string;
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number | null;
    guestCapacity: number | null;
    nightlyPrice: number;
    photoUrl: string | null;
    amenities: Amenity[];
  }) => {
    setAiSummary(null);
    const nowIso = new Date().toISOString();

    if (input.id) {
      const existing = state.competitors.find((c) => c.id === input.id);
      if (!existing) return;

      // Update non-price metadata first, then pass through recordPriceCheck if price changed
      const updatedMetaState: MonitoringState = {
        ...state,
        competitors: state.competitors.map((c) =>
          c.id === input.id
            ? {
                ...c,
                airbnbUrl: input.airbnbUrl,
                airbnbRoomId: input.airbnbRoomId,
                name: input.name,
                propertyType: input.propertyType,
                bedrooms: input.bedrooms,
                bathrooms: input.bathrooms,
                guestCapacity: input.guestCapacity,
                photoUrl: input.photoUrl,
                amenities: input.amenities,
              }
            : c,
        ),
      };

      if (input.nightlyPrice !== existing.nightlyPrice) {
        const { nextState } = recordPriceCheck(
          updatedMetaState,
          { [existing.id]: input.nightlyPrice },
          nowIso,
        );
        setState(nextState);
      } else {
        setState(updatedMetaState);
      }
      return;
    }

    const created: CompetitorListing = {
      id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      airbnbUrl: input.airbnbUrl,
      airbnbRoomId: input.airbnbRoomId,
      name: input.name,
      propertyType: input.propertyType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      guestCapacity: input.guestCapacity,
      nightlyPrice: input.nightlyPrice,
      previousPrice: null,
      photoUrl: input.photoUrl,
      locationNote: null,
      amenities: input.amenities,
      lastCheckedAt: nowIso,
      priceHistory: [{ price: input.nightlyPrice, recordedAt: nowIso }],
    };

    setState((prev) => ({
      ...prev,
      competitors: [...prev.competitors, created],
      lastCheckedAt: prev.lastCheckedAt ?? nowIso,
    }));
  };

  const handleDeleteCompetitor = (id: string) => {
    setAiSummary(null);
    setState((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((c) => c.id !== id),
    }));
  };

  const handleSubmitPriceCheck = (
    observedPricesById: Record<string, number>,
  ): PriceChangeEvent[] => {
    setAiSummary(null);
    const { nextState, detectedChanges } = recordPriceCheck(state, observedPricesById);
    setState(nextState);
    return detectedChanges;
  };

  const handleRequestAiSummary = async () => {
    if (!state.property || !overview) return;
    setAiLoading(true);
    try {
      const summary = await fetchConciseMarketSummary(
        state.property,
        overview,
        state.priceChanges,
      );
      if (summary) setAiSummary(summary);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900">
      <TopBar
        property={state.property}
        lastCheckedAt={state.lastCheckedAt}
        emailConfig={state.emailConfig}
        competitorCount={state.competitors.length}
        onOpenCheckModal={() => setCheckModalOpen(true)}
        onOpenEmailModal={() => setEmailModalOpen(true)}
      />

      {!state.property || !overview ? (
        <main className="flex-1">
          <PropertyOnboarding onRegisterProperty={handleRegisterProperty} />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          <MyPropertyCard
            property={state.property}
            overview={overview}
            aiSummary={aiSummary}
            aiAvailable={aiAvailable}
            aiLoading={aiLoading}
            onRequestAiSummary={() => void handleRequestAiSummary()}
            onQuickSetPrice={(price) =>
              handleSaveProperty({ ...state.property!, nightlyPrice: price })
            }
            onEditProperty={() => setEditPropertyOpen(true)}
          />

          <MarketOverviewStrip property={state.property} overview={overview} />

          <PriceChangesFeed
            changes={state.priceChanges}
            hasCompetitors={state.competitors.length > 0}
            lastCheckedAt={state.lastCheckedAt}
            onOpenCheckModal={() => setCheckModalOpen(true)}
            onOpenAddCompetitor={() => {
              setEditingComp(null);
              setCompModalOpen(true);
            }}
          />

          <CompetitorListingsSection
            property={state.property}
            primary={partitioned.primary}
            secondary={partitioned.secondary}
            excluded={partitioned.excluded}
            onAddCompetitor={() => {
              setEditingComp(null);
              setCompModalOpen(true);
            }}
            onEditCompetitor={(comp) => {
              setEditingComp(comp);
              setCompModalOpen(true);
            }}
            onDeleteCompetitor={handleDeleteCompetitor}
          />
        </main>
      )}

      {editPropertyOpen && state.property && (
        <PropertyEditModal
          property={state.property}
          onClose={() => setEditPropertyOpen(false)}
          onSave={handleSaveProperty}
          onResetProperty={handleResetProperty}
        />
      )}

      {compModalOpen && state.property && (
        <CompetitorFormModal
          hostProperty={state.property}
          editingCompetitor={editingComp}
          onClose={() => {
            setCompModalOpen(false);
            setEditingComp(null);
          }}
          onSaveCompetitor={handleSaveCompetitor}
        />
      )}

      {checkModalOpen && state.property && (
        <DailyCheckModal
          property={state.property}
          competitors={state.competitors}
          emailConfig={state.emailConfig}
          onClose={() => setCheckModalOpen(false)}
          onSubmitCheck={handleSubmitPriceCheck}
        />
      )}

      {emailModalOpen && state.property && (
        <EmailAlertsModal
          property={state.property}
          emailConfig={state.emailConfig}
          recentChanges={state.priceChanges}
          onClose={() => setEmailModalOpen(false)}
          onSaveConfig={(emailConfig) =>
            setState((prev) => ({ ...prev, emailConfig }))
          }
        />
      )}
    </div>
  );
}
