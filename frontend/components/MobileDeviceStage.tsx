import React from 'react';
import {
  Home,
  TrendingDown,
  Building2,
  Bell,
  RefreshCw,
  Smartphone,
  PlusCircle,
  Sparkles,
  Wifi,
  BatteryFull,
  Signal,
  CheckCircle2,
} from 'lucide-react';
import { PriceChangeEvent } from '../types';

export type MobileTabId = 'home' | 'changes' | 'comps' | 'alerts';

interface MobileDeviceStageProps {
  activeTab: MobileTabId;
  onSelectTab: (tab: MobileTabId) => void;
  hasProperty: boolean;
  isPrototype: boolean;
  isSimulatingCheck: boolean;
  changesCount: number;
  compsCount: number;
  neighborhoodLabel: string;
  pushBannerChange: PriceChangeEvent | null;
  onDismissPushBanner: () => void;
  onTapPushBanner: () => void;
  onTriggerCheck: () => void;
  onSwitchToOwnProperty: () => void;
  onLoadPrototype: () => void;
  children: React.ReactNode;
}

export const MobileDeviceStage: React.FC<MobileDeviceStageProps> = ({
  activeTab,
  onSelectTab,
  hasProperty,
  isPrototype,
  isSimulatingCheck,
  changesCount,
  compsCount,
  neighborhoodLabel,
  pushBannerChange,
  onDismissPushBanner,
  onTapPushBanner,
  onTriggerCheck,
  onSwitchToOwnProperty,
  onLoadPrototype,
  children,
}) => {
  const navItems: Array<{
    id: MobileTabId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'home', label: 'Overview', icon: Home },
    {
      id: 'changes',
      label: 'Changes',
      icon: TrendingDown,
      badge: changesCount > 0 ? changesCount : undefined,
    },
    {
      id: 'comps',
      label: 'Comps',
      icon: Building2,
      badge: compsCount > 0 ? compsCount : undefined,
    },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F1F5F9] md:flex md:items-center md:justify-center md:gap-12 md:px-8 md:py-8 lg:gap-16">
      {/* Desktop Showcase Pitch Panel (hidden on mobile phones) */}
      <aside className="hidden max-w-md space-y-6 md:block">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
          <Smartphone className="h-3.5 w-3.5 text-slate-900" />
          <span>Moisha Mobile App · iOS &amp; Android Prototype</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
            Know the moment a neighbor Airbnb cuts rates.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Hosts check prices on their phone—not on spreadsheets. Register your US Airbnb once, and Moisha watches comparable properties nearby every day.
          </p>
        </div>

        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              <strong className="font-semibold text-slate-900">True comps only:</strong> Matches your 3BR home strictly against nearby 3BR entire homes—filtering out 1BR basements &amp; studios.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              <strong className="font-semibold text-slate-900">Daily price memory:</strong> Catches overnight rate drops (e.g.{' '}
              <span className="font-semibold text-rose-600 tabular">$220 → $183, -16.8%</span>) that Airbnb’s map hides.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              <strong className="font-semibold text-slate-900">8:00 AM push &amp; email alert:</strong> Glance at your phone in 5 seconds and only adjust pricing when neighbors move.
            </span>
          </li>
        </ul>

        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="block text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Interactive phone controls
          </span>
          <div className="flex flex-wrap gap-2.5">
            {isPrototype && hasProperty ? (
              <>
                <button
                  type="button"
                  onClick={onTriggerCheck}
                  disabled={isSimulatingCheck}
                  className="btn-primary h-10 px-4 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {isSimulatingCheck ? 'Scanning 3BRs...' : 'Simulate 8:00 AM Push Alert'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onSwitchToOwnProperty}
                  className="btn-secondary h-10 px-3.5 text-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Test my own listing</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onLoadPrototype}
                className="btn-secondary h-10 px-4 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Load DC 20002 Demo Listing</span>
              </button>
            )}
          </div>
          <p className="pt-1 text-xs text-slate-500">
            Open <strong className="text-slate-700">janagrit.github.io/Moisha</strong> on your iPhone and tap <strong>Share → Add to Home Screen</strong> to install full-screen.
          </p>
        </div>
      </aside>

      {/* Single Mobile App Viewport: Full-bleed on phones (<768px), iPhone 16 Pro frame on desktop (>=768px) */}
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white md:h-[832px] md:w-[396px] md:shrink-0 md:rounded-[52px] md:border-[11px] md:border-slate-900 md:shadow-2xl md:ring-1 md:ring-slate-900/10">
        {/* iOS Status Bar + Dynamic Island (desktop preview only) */}
        <div className="relative hidden h-11 shrink-0 items-center justify-between bg-white px-7 text-xs font-semibold text-slate-900 select-none md:flex">
          <span className="tabular">9:41</span>
          <div className="absolute top-2 left-1/2 h-6 w-28 -translate-x-1/2 rounded-full bg-slate-950" />
          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <BatteryFull className="h-4 w-4" />
          </div>
        </div>

        {/* App Shell */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F8FAFC] text-slate-900">
          {/* Live iOS Push Notification Banner */}
          {pushBannerChange && (
            <div
              role="status"
              className="absolute top-2.5 right-3 left-3 z-40 rounded-2xl border border-slate-800 bg-slate-900/95 p-3.5 text-white shadow-xl backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-2.5">
                <button
                  type="button"
                  onClick={onTapPushBanner}
                  className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                      <span>MOISHA PRICE ALERT</span>
                      <span className="text-slate-400">· now</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-semibold text-white">
                      {pushBannerChange.competitorName}
                    </p>
                    <p className="text-xs text-slate-300 tabular">
                      Rate moved ${pushBannerChange.previousPrice} → ${pushBannerChange.newPrice}/nt (
                      {pushBannerChange.deltaAmount > 0 ? '+' : ''}
                      {pushBannerChange.percentChange}%). Tap for digest.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={onDismissPushBanner}
                  aria-label="Dismiss notification"
                  className="rounded-lg px-1.5 py-0.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Mobile App Header */}
          <header className="shrink-0 border-b border-slate-200/80 bg-white/95 px-4 pt-3 pb-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 10.5L12 3l9 7.5" />
                    <path d="M5 9.5V20h14V9.5" />
                    <path d="M8.5 15.5l2.3-2.5 2.2 1.8 2.8-3.3" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold tracking-tight text-slate-900">
                      Moisha
                    </span>
                    {isPrototype && hasProperty && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Demo
                      </span>
                    )}
                  </div>
                  {hasProperty && (
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      {neighborhoodLabel}
                    </p>
                  )}
                </div>
              </div>

              {hasProperty && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {isPrototype && (
                    <button
                      type="button"
                      onClick={onSwitchToOwnProperty}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Use my Airbnb
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onTriggerCheck}
                    disabled={isSimulatingCheck || (!isPrototype && compsCount === 0)}
                    aria-label={isPrototype ? 'Simulate daily check' : 'Check prices'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-45"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isSimulatingCheck ? 'animate-spin' : ''}`}
                    />
                    <span>{isPrototype ? 'Check' : 'Check prices'}</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Scrollable Mobile Content */}
          <main className="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-6">{children}</main>

          {/* Fixed iOS Bottom Tab Bar */}
          {hasProperty && (
            <nav
              aria-label="Mobile navigation"
              className="shrink-0 border-t border-slate-200/90 bg-white/95 px-2 pt-1.5 pb-2 backdrop-blur-md"
            >
              <div className="grid grid-cols-4 gap-1">
                {navItems.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onSelectTab(tab.id)}
                      className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${
                        active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <div className="relative">
                        <Icon className={`h-5 w-5 ${active ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                        {tab.badge !== undefined && (
                          <span className="absolute -top-1.5 -right-3 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white tabular">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
        </div>

        {/* iOS Home Indicator (desktop preview only) */}
        <div className="hidden h-5 shrink-0 items-center justify-center bg-white md:flex">
          <div className="h-1 w-32 rounded-full bg-slate-900/80" />
        </div>
      </div>
    </div>
  );
};
