import { useState, useEffect, useMemo } from 'react';
import { Sparkles, CheckCircle2, Mail } from 'lucide-react';
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
  createInitialMonitoringState,
  recordPriceCheck,
} from './services/monitoringService';
import {
  createPrototypeMonitoringState,
  simulateDailyMonitoringRun,
  ParsedAirbnbCardCandidate,
} from './services/prototypeData';
import { buildComparableAirbnbSearchUrl } from './services/usLocationService';
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

  const [isSimulatingCheck, setIsSimulatingCheck] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    setToastMessage(null);
    setState({
      ...createInitialMonitoringState(),
      isPrototype: false,
      property,
    });
  };

  const handleSwitchToOwnProperty = () => {
    setAiSummary(null);
    setToastMessage(null);
    setState(createInitialMonitoringState());
  };

  const handleLoadPrototype = () => {
    setAiSummary(null);
    setToastMessage(null);
    setState(createPrototypeMonitoringState());
  };

  const handleRunPrototypeCheck = () => {
    if (isSimulatingCheck) return;
    setIsSimulatingCheck(true);
    setAiSummary(null);
    window.setTimeout(() => {
      const { nextState, detectedChanges } = simulateDailyMonitoringRun(state);
      setState(nextState);
      setIsSimulatingCheck(false);
      if (detectedChanges.length > 0) {
        setToastMessage(
          `Daily check complete: ${detectedChanges.length} competitor price ${
            detectedChanges.length === 1 ? 'change' : 'changes'
          } detected & morning email alert updated.`,
        );
      }
    }, 450);
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
    setToastMessage(null);
    setState(createInitialMonitoringState());
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

  const handleBulkImportCompetitors = (items: ParsedAirbnbCardCandidate[]) => {
    if (!state.property || items.length === 0) return;
    setAiSummary(null);
    const nowIso = new Date().toISOString();
    const searchUrl = buildComparableAirbnbSearchUrl(state.property);

    const createdList: CompetitorListing[] = items.map((cand, idx) => ({
      id: `comp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      airbnbUrl: searchUrl,
      airbnbRoomId: null,
      name: cand.name,
      propertyType: cand.propertyType,
      bedrooms: cand.bedrooms,
      bathrooms: cand.bathrooms,
      guestCapacity: null,
      nightlyPrice: cand.nightlyPrice,
      previousPrice: null,
      photoUrl: null,
      locationNote: null,
      amenities: [],
      lastCheckedAt: nowIso,
      priceHistory: [{ price: cand.nightlyPrice, recordedAt: nowIso }],
    }));

    setState((prev) => ({
      ...prev,
      competitors: [...prev.competitors, ...createdList],
      lastCheckedAt: nowIso,
    }));
    setToastMessage(`Imported ${createdList.length} listings from Airbnb and sorted comparable matches.`);
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

  const isPrototype = Boolean(state.isPrototype);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-slate-900">
      <TopBar
        property={state.property}
        isPrototype={isPrototype}
        isSimulatingCheck={isSimulatingCheck}
        lastCheckedAt={state.lastCheckedAt}
        emailConfig={state.emailConfig}
        competitorCount={state.competitors.length}
        onRunPrototypeCheck={handleRunPrototypeCheck}
        onOpenCheckModal={() => setCheckModalOpen(true)}
        onOpenEmailModal={() => setEmailModalOpen(true)}
        onSwitchToOwnProperty={handleSwitchToOwnProperty}
      />

      {!state.property || !overview ? (
        <main className="flex-1">
          <PropertyOnboarding
            onRegisterProperty={handleRegisterProperty}
            onLoadPrototype={handleLoadPrototype}
          />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-7 sm:px-6 lg:px-8">
          {/* Concise Prototype Banner */}
          {isPrototype && (
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 px-5 py-3.5 text-xs text-indigo-950 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2.5 sm:items-center">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 sm:mt-0" />
                <span>
                  <strong>Interactive Prototype (DC 20002):</strong> Airbnb’s map mixes 111 units with no price history. Moisha isolates your <strong>5 true 3BR competitors</strong>, catches daily rate drops, and prepares your morning email alert.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSwitchToOwnProperty}
                className="shrink-0 font-semibold text-indigo-700 underline hover:text-indigo-900"
              >
                Register my own listing →
              </button>
            </div>
          )}

          {/* Live Check Confirmation Banner */}
          {toastMessage && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-3 text-xs text-emerald-950"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{toastMessage}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline hover:text-emerald-950"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Open morning email preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-emerald-700 hover:text-emerald-950"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

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

          <MarketOverviewStrip
            property={state.property}
            overview={overview}
            excludedCount={partitioned.excluded.length}
          />

          <PriceChangesFeed
            changes={state.priceChanges}
            hasCompetitors={state.competitors.length > 0}
            isPrototype={isPrototype}
            isSimulatingCheck={isSimulatingCheck}
            lastCheckedAt={state.lastCheckedAt}
            onRunPrototypeCheck={handleRunPrototypeCheck}
            onOpenCheckModal={() => setCheckModalOpen(true)}
            onOpenEmailModal={() => setEmailModalOpen(true)}
            onOpenAddCompetitor={() => {
              setEditingComp(null);
              setCompModalOpen(true);
            }}
          />

          <CompetitorListingsSection
            property={state.property}
            isPrototype={isPrototype}
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
          onBulkImportCompetitors={handleBulkImportCompetitors}
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

      {emailModalOpen && state.property && overview && (
        <EmailAlertsModal
          property={state.property}
          overview={overview}
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
