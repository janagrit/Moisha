import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Mail, PlusCircle, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { MobileDeviceStage, MobileTabId } from './components/MobileDeviceStage';
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
  buildPriceChangeMailtoHref,
  formatShortDate,
} from './services/monitoringService';
import {
  createPrototypeMonitoringState,
  simulateDailyMonitoringRun,
  ParsedAirbnbCardCandidate,
} from './services/prototypeData';
import {
  buildComparableAirbnbSearchUrl,
  runLiveCompetitorPriceCheckViaApi,
} from './services/usLocationService';
import {
  checkAiAvailable,
  fetchConciseMarketSummary,
} from './services/aiSummaryService';

export default function App() {
  const [state, setState] = useState<MonitoringState>(() => loadMonitoringState());
  const [activeTab, setActiveTab] = useState<MobileTabId>('home');

  const [editPropertyOpen, setEditPropertyOpen] = useState(false);
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<CompetitorListing | null>(null);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [isSimulatingCheck, setIsSimulatingCheck] = useState(false);
  const [pushBannerChange, setPushBannerChange] = useState<PriceChangeEvent | null>(null);

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

  const handleCompleteIngest = (payload: {
    property: HostProperty;
    competitors: CompetitorListing[];
    priceChanges: PriceChangeEvent[];
  }) => {
    setAiSummary(null);
    setPushBannerChange(payload.priceChanges[0] ?? null);
    setActiveTab('home');
    const nowIso = new Date().toISOString();
    setState({
      ...createInitialMonitoringState(),
      isPrototype: false,
      property: payload.property,
      competitors: payload.competitors,
      priceChanges: payload.priceChanges,
      lastCheckedAt: payload.competitors.length > 0 ? nowIso : null,
      lastCheckChangesCount: payload.priceChanges.length,
    });
  };

  const handleSwitchToOwnProperty = () => {
    setAiSummary(null);
    setPushBannerChange(null);
    setState(createInitialMonitoringState());
  };

  const handleLoadPrototype = () => {
    setAiSummary(null);
    setPushBannerChange(null);
    setActiveTab('home');
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
        setPushBannerChange(detectedChanges[0]);
      }
    }, 400);
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
    setPushBannerChange(null);
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
        const { nextState, detectedChanges } = recordPriceCheck(
          updatedMetaState,
          { [existing.id]: input.nightlyPrice },
          nowIso,
        );
        setState(nextState);
        if (detectedChanges.length > 0) setPushBannerChange(detectedChanges[0]);
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
    setActiveTab('comps');
  };

  const handleDeleteCompetitor = (id: string) => {
    setAiSummary(null);
    setState((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((c) => c.id !== id),
    }));
  };

  const handleRunLiveOrManualCheck = async () => {
    if (!state.property || state.competitors.length === 0 || isSimulatingCheck) return;
    setIsSimulatingCheck(true);
    setAiSummary(null);
    try {
      const liveResult = await runLiveCompetitorPriceCheckViaApi(
        state.property,
        state.competitors,
      );
      if (liveResult.ok && Object.keys(liveResult.observedById).length > 0) {
        const { nextState, detectedChanges } = recordPriceCheck(
          state,
          liveResult.observedById,
        );
        setState(nextState);
        if (detectedChanges.length > 0) {
          setPushBannerChange(detectedChanges[0]);
        }
        return;
      }
      // Fallback to manual check sheet when running offline / static hosting
      setCheckModalOpen(true);
    } finally {
      setIsSimulatingCheck(false);
    }
  };

  const handleSubmitPriceCheck = (
    observedPricesById: Record<string, number>,
  ): PriceChangeEvent[] => {
    setAiSummary(null);
    const { nextState, detectedChanges } = recordPriceCheck(state, observedPricesById);
    setState(nextState);
    if (detectedChanges.length > 0) {
      setPushBannerChange(detectedChanges[0]);
    }
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
  const neighborhoodLabel = state.property
    ? `${state.property.neighborhood} · ${state.property.bedrooms}BR`
    : '';

  return (
    <>
      <MobileDeviceStage
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasProperty={Boolean(state.property && overview)}
        isPrototype={isPrototype}
        isSimulatingCheck={isSimulatingCheck}
        changesCount={state.priceChanges.length}
        compsCount={partitioned.primary.length}
        neighborhoodLabel={neighborhoodLabel}
        pushBannerChange={pushBannerChange}
        onDismissPushBanner={() => setPushBannerChange(null)}
        onTapPushBanner={() => {
          setPushBannerChange(null);
          setEmailModalOpen(true);
        }}
        onTriggerCheck={() => {
          if (isPrototype) {
            handleRunPrototypeCheck();
          } else {
            void handleRunLiveOrManualCheck();
          }
        }}
        onSwitchToOwnProperty={handleSwitchToOwnProperty}
        onLoadPrototype={handleLoadPrototype}
      >
        {!state.property || !overview ? (
          <PropertyOnboarding
            onCompleteIngest={handleCompleteIngest}
            onLoadPrototype={handleLoadPrototype}
          />
        ) : activeTab === 'home' ? (
          <div className="space-y-3">
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

            <PriceChangesFeed
              changes={state.priceChanges}
              limit={3}
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
              onSeeAllChanges={
                state.priceChanges.length > 3 ? () => setActiveTab('changes') : undefined
              }
            />

            <MarketOverviewStrip
              property={state.property}
              overview={overview}
              excludedCount={partitioned.excluded.length}
            />

            <button
              type="button"
              onClick={() => setActiveTab('comps')}
              className="surface flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <span>
                Browse {partitioned.primary.length} comparable {state.property.bedrooms}BR listings
                {partitioned.excluded.length > 0
                  ? ` (${partitioned.excluded.length} non-${state.property.bedrooms}BR excluded)`
                  : ''}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        ) : activeTab === 'changes' ? (
          <div className="space-y-3.5">
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
          </div>
        ) : activeTab === 'comps' ? (
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
        ) : (
          /* Alerts & Account Tab */
          <div className="space-y-3.5">
            <section className="surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    8:00 AM Price-Change Digest
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Sent whenever monitored {state.property.bedrooms}BR neighbors change rates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(true)}
                  className="btn-secondary h-8 px-2.5 text-xs"
                >
                  Edit email
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                <div className="font-semibold text-slate-900">
                  To: {state.emailConfig.email || 'Not set'}
                </div>
                <div className="mt-2 divide-y divide-slate-200/70 rounded-lg border border-slate-200 bg-white px-2.5">
                  {state.priceChanges.slice(0, 3).map((chg) => {
                    const isDrop = chg.deltaAmount < 0;
                    return (
                      <div
                        key={chg.id}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {chg.competitorName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatShortDate(chg.changedAt)}
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular ${
                            isDrop
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isDrop ? (
                            <TrendingDown className="h-2.5 w-2.5" />
                          ) : (
                            <TrendingUp className="h-2.5 w-2.5" />
                          )}
                          ${chg.previousPrice}→${chg.newPrice}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {state.emailConfig.email && state.priceChanges.length > 0 && (
                  <a
                    href={buildPriceChangeMailtoHref(
                      state.emailConfig.email,
                      state.property.name,
                      state.priceChanges.slice(0, 10),
                    )}
                    className="btn-primary mt-3 h-9 w-full text-xs"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Open digest in Mail app</span>
                  </a>
                )}
              </div>
            </section>

            <section className="surface space-y-2.5 p-4">
              <h3 className="text-xs font-semibold text-slate-700">Switch property</h3>
              {isPrototype ? (
                <button
                  type="button"
                  onClick={handleSwitchToOwnProperty}
                  className="btn-secondary h-9 w-full text-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Register my own US Airbnb</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLoadPrototype}
                  className="btn-secondary h-9 w-full text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Load DC 20002 Demo Listing</span>
                </button>
              )}
            </section>
          </div>
        )}
      </MobileDeviceStage>

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
    </>
  );
}
