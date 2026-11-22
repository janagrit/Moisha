# Moisha | Airbnb Pocket Advisor

<p align="center">
  <img src="screenshots/moisha-dashboard.png" alt="Moisha neighborhood pricing advisor" width="100%" />
</p>

Moisha helps short-term rental hosts decide what to charge tonight based on real neighborhood comps, calendar gaps, and strict floor-price guardrails.

It combines an instant, deterministic pricing & net-profit engine with optional Google Gemini AI advisory, interactive Q&A copilot chat, and live Google Search submarket grounding.

## Core Capabilities

| Capability | What It Does |
|---|---|
| **Multi-Property Portfolio** | Switch between properties (undercut alerts, orphan calendar gaps, and underpriced upside scenarios), or add/edit your own rentals with `localStorage` persistence. |
| **Neighborhood Benchmark** | Compare your current rate against local 25th/50th/75th percentile ranges and individual vacant vs. booked neighbor comps. |
| **Reactive Pricing & Rules Engine** | Enforces your host safety floor, neighbor undercut threshold, orphan-night watch, and Airbnb strikethrough promotion badges in real time. |
| **Revenue & Net Profit Calculator** | Models gross room revenue, guest cleaning fees, cleaner turnover costs, platform fees, fixed holding costs, and odds-weighted expected net profit. |
| **Uncle Moisha Copilot & Search Grounding** | Interactive Q&A advisor with 1-click rate/promo actions plus optional Gemini 2.5 Flash + Google Search market grounding. |
| **Alerts & PWA Notifications** | Dispatch reminders across Telegram, WhatsApp, SMS previews, or trigger live browser push notifications via the built-in Service Worker. |

## Quick Start

**Requirements:** Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

### Optional: Enable Live Gemini AI & Search Grounding

Moisha works **100% offline out of the box** using its deterministic pricing and profit engine.

To enable live Gemini AI commentary, conversational responses, and Google Search submarket grounding during local development, add `GEMINI_API_KEY` to `.env` in the repository root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Vite's local dev server proxies `/api/gemini/*` requests server-side so your `.env` key is never bundled into client assets. On static deployments (such as GitHub Pages), you can optionally enter a personal key in the in-app **Settings** modal.

## Project Scripts

```bash
npm run dev             # Start Vite dev server (+ optional .env Gemini bridge)
npm run typecheck       # Run strict TypeScript compiler checks
npm test                # Run Vitest unit, property-based (fast-check), and UI tests
npm run build           # Build static PWA bundle into frontend/dist
npm run build-baseline  # Compute p25/median/p75 baselines from demo or CSV data
```

## Project Structure

```text
Moisha/
├── .github/workflows/pages.yml    # CI typecheck, test, build & GitHub Pages deploy
├── frontend/
│   ├── __tests__/                 # Vitest + fast-check + Testing Library suites
│   ├── components/                # Portfolio, Verdict, Benchmark, Chat, Profit, Rules
│   ├── public/                    # Logo, PWA manifest, notification Service Worker
│   ├── scripts/build-baseline.ts  # CSV / portfolio quantile baseline CLI
│   ├── services/                  # Pricing engine, Gemini bridge, storage, audio/push
│   ├── App.tsx                    # Main 4-tab pocket advisor workspace
│   ├── constants.ts               # Sample portfolio & default pricing rules
│   └── types.ts                   # Zod schemas & TypeScript domain contracts
└── README.md
```

## Note

Market estimates, booking probabilities, and pricing recommendations depend on available comparable data and are not guaranteed booking or revenue forecasts. Always review recommendations before updating live listing rates.
