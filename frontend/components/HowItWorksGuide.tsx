import React, { useEffect } from 'react';
import { BookOpen, X, ChevronRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ActiveWorkspaceTab } from '../types';

interface QuickStartBannerProps {
  onDismiss: () => void;
  onOpenFullGuide: () => void;
  onNavigateTab: (tab: ActiveWorkspaceTab) => void;
}

export const QuickStartBanner: React.FC<QuickStartBannerProps> = ({
  onDismiss,
  onOpenFullGuide,
  onNavigateTab,
}) => {
  const steps: Array<{
    num: string;
    title: string;
    body: string;
    ctaLabel?: string;
    targetTab?: ActiveWorkspaceTab;
  }> = [
    {
      num: '1',
      title: 'Enter Any Rental Address',
      body: 'Type your street address, city, or ZIP into "Check Any Rental Address" right below—along with your current rate, minimum floor price, and empty nights.',
    },
    {
      num: '2',
      title: 'Add Nearby Neighbor Prices',
      body: 'Open Comps & Submarket and enter 2–4 similar Airbnb listings near you—their nightly price and whether they are Vacant or Booked.',
      ctaLabel: 'Open Comps',
      targetTab: 'comps',
    },
    {
      num: '3',
      title: 'Check Verdict & Real Profit',
      body: 'See whether Moisha says to lower, raise, or hold your rate—then test exact net profit after cleaning & fees in Profit & Promotions.',
      ctaLabel: 'Open Calculator',
      targetTab: 'revenue',
    },
    {
      num: '4',
      title: 'Ask Moisha or Share Plan',
      body: 'Ask questions in the Uncle Moisha chat box, or copy/send a ready-to-share pricing summary to WhatsApp or SMS.',
      ctaLabel: 'Rules & Share',
      targetTab: 'rules',
    },
  ];

  return (
    <section
      aria-label="First-time user quick start guide"
      className="rounded-3xl border border-blue-200 bg-gradient-to-br from-white via-[#F8FAFF] to-moisha-sky p-5 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moisha-royal text-white">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-moisha-navy">
              First time here? How to use Moisha in 4 easy steps
            </h2>
            <p className="text-xs text-moisha-muted">
              No login or setup needed — try the sample listings or enter your own rental in under a minute.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFullGuide}
            className="rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-moisha-royal transition-colors hover:bg-moisha-sky"
          >
            Full Guide
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss quick start guide"
            className="inline-flex items-center gap-1 rounded-xl border border-moisha-border bg-white px-3 py-1.5 text-xs font-semibold text-moisha-muted transition-colors hover:bg-moisha-sand hover:text-moisha-navy"
          >
            <span>Got it, hide</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex flex-col justify-between rounded-2xl border border-moisha-border bg-white p-4"
          >
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moisha-navy text-xs font-extrabold text-white">
                  {step.num}
                </span>
                <h3 className="text-xs font-extrabold text-moisha-navy">{step.title}</h3>
              </div>
              <p className="text-xs leading-relaxed text-moisha-muted">{step.body}</p>
            </div>

            {step.ctaLabel && step.targetTab && (
              <button
                type="button"
                onClick={() => onNavigateTab(step.targetTab!)}
                className="mt-3 inline-flex items-center gap-1 self-start text-[11px] font-bold text-moisha-royal hover:underline"
              >
                <span>{step.ctaLabel}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-blue-200/60 pt-3 text-[11px] text-moisha-muted">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-moisha-green" />
          <span>
            <strong>Private to your browser:</strong> Any properties or prices you enter stay saved on your own device only and never affect other visitors.
          </span>
        </span>
        <span>Re-open anytime via &ldquo;How to Use&rdquo; at the top right.</span>
      </div>
    </section>
  );
};

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreQuickBanner: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onRestoreQuickBanner,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-moisha-border bg-white p-6 shadow-xl sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-moisha-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-moisha-butter text-lg border border-amber-300">
              🕎
            </div>
            <div>
              <h2 id="how-it-works-dialog-title" className="text-lg font-extrabold text-moisha-navy">
                How to Use Moisha — Step-by-Step Guide
              </h2>
              <p className="text-xs text-moisha-muted">
                A pocket pricing & profit advisor for Airbnb hosts and property managers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="rounded-lg p-1.5 text-moisha-muted hover:bg-moisha-sand"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs leading-relaxed text-moisha-navy">
          {/* What Moisha Solves */}
          <div className="rounded-2xl border border-moisha-border bg-moisha-sand p-4">
            <p className="font-semibold text-moisha-navy">
              What problem does Moisha solve?
            </p>
            <p className="mt-1 text-moisha-muted">
              When upcoming calendar dates sit empty, guessing whether to drop your rate, run an Airbnb promotion, or hold firm costs money. Moisha compares your nightly price against nearby listings, protects your minimum <strong>Safety Floor</strong>, and calculates your real net profit before you change your rate on Airbnb.
            </p>
          </div>

          {/* Step by step */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-moisha-navy">
              Step-by-Step Instructions
            </h3>

            <div className="rounded-2xl border border-moisha-border p-3.5">
              <div className="font-bold text-moisha-navy">
                Step 1 · Enter Any Property Address
              </div>
              <p className="mt-1 text-moisha-muted">
                Type any street address, city, or ZIP code into <strong>Check Any Rental Address</strong> at the top. Enter your bedrooms, current nightly price (e.g. $250), your <strong>Safety Floor</strong> (lowest acceptable rate, e.g. $175), and empty nights, then click <strong>Check Address</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-moisha-border p-3.5">
              <div className="font-bold text-moisha-navy">
                Step 2 · Enter 2–4 Comparable Neighbor Listings
              </div>
              <p className="mt-1 text-moisha-muted">
                Click the <strong>Comps & Submarket</strong> tab and click <strong>+ Add Neighbor</strong>. Check Airbnb for similar-sized homes nearby for those same dates and enter their current nightly price and whether they are <strong>Vacant</strong> or <strong>Booked</strong>.
              </p>
            </div>

            <div className="rounded-2xl border border-moisha-border p-3.5">
              <div className="font-bold text-moisha-navy">
                Step 3 · Read Moisha&apos;s Verdict
              </div>
              <p className="mt-1 text-moisha-muted">
                Go to <strong>Verdict & Copilot</strong>. Moisha automatically shows one of three clear recommendations:
              </p>
              <ul className="mt-2 space-y-1.5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 rounded bg-moisha-butter px-1.5 py-0.5 text-[10px] font-bold text-moisha-amber">
                    ALERT
                  </span>
                  <span className="text-moisha-muted">
                    Vacant neighbors are cheaper while you have empty nights — lower your rate (never below your Safety Floor) or run a 15% strikethrough promotion badge.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 rounded bg-moisha-sky px-1.5 py-0.5 text-[10px] font-bold text-moisha-royal">
                    UPSIDE
                  </span>
                  <span className="text-moisha-muted">
                    Nearby listings are booked or priced significantly higher — raise your rate to capture extra revenue.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 rounded bg-moisha-mint px-1.5 py-0.5 text-[10px] font-bold text-moisha-green">
                    ALIGNED
                  </span>
                  <span className="text-moisha-muted">
                    Your price matches the neighborhood or your dates are already booked — hold steady.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-moisha-border p-3.5">
              <div className="font-bold text-moisha-navy">
                Step 4 · Verify Net Profit Before Updating Airbnb
              </div>
              <p className="mt-1 text-moisha-muted">
                Open <strong>Profit & Promotions</strong> and use the <strong>Test What-If Nightly Rate</strong> slider. Enter your guest cleaning fee, actual cleaner payout, and fixed nightly cost to compare exact net profit side by side.
              </p>
            </div>

            <div className="rounded-2xl border border-moisha-border p-3.5">
              <div className="font-bold text-moisha-navy">
                Step 5 · Copy or Send the Plan to Your Team
              </div>
              <p className="mt-1 text-moisha-muted">
                Click <strong>Copy Plan</strong> on the Verdict banner (or open <strong>Rules & Alerts</strong>) to copy a clean summary or open it directly in WhatsApp / SMS for your host or property manager, then apply the rate on Airbnb!
              </p>
            </div>
          </div>

          {/* Good to know */}
          <div className="rounded-2xl border border-emerald-200 bg-moisha-mint/50 p-4">
            <div className="flex items-center gap-1.5 font-bold text-moisha-green">
              <CheckCircle2 className="h-4 w-4" />
              <span>Good to Know</span>
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-moisha-navy">
              <li>
                <strong>Safe to experiment:</strong> Everything saves privately in your own web browser. Editing or deleting sample properties only affects your device.
              </li>
              <li>
                <strong>Works without any API key:</strong> All pricing, promotion, and profit calculations run automatically in your browser. (Advanced users can optionally add a Gemini API key in ⚙️ Settings.)
              </li>
              <li>
                <strong>Start fresh anytime:</strong> Click the ⚙️ gear icon at the top right and select <strong>Reset Demo Data</strong>.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-moisha-border pt-4">
          <button
            type="button"
            onClick={() => {
              onRestoreQuickBanner();
              onClose();
            }}
            className="text-xs font-semibold text-moisha-royal hover:underline"
          >
            Show 4-step banner on main screen
          </button>
          <button type="button" onClick={onClose} className="btn-primary text-xs">
            Got It — Let&apos;s Price Smart
          </button>
        </div>
      </div>
    </div>
  );
};
