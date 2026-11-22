# Moisha | Airbnb Pocket Advisor

<p align="center">
  <img src="screenshots/moisha-dashboard.png" alt="Moisha neighborhood pricing advisor" width="100%" />
</p>

**Live Web App:** **[https://janagrit.github.io/Moisha/](https://janagrit.github.io/Moisha/)**

Moisha helps short-term rental hosts and property managers decide what to charge tonight based on nearby neighbor rates, upcoming empty calendar dates, and strict floor-price guardrails—with zero login or setup required.

---

## First-Time User Guide (4 Easy Steps)

*(These instructions are also built directly into the web app via the top **How to Use** button and first-visit banner.)*

1. **Enter Your Property Address:** Open the app, type your street address, city, or ZIP code into **Enter Your Rental Property Address**, set your bedrooms, current nightly rate, minimum **Safety Floor** price, and empty nights, and click **`Check Address`**.
2. **Enter Nearby Neighbor Prices:** Go to the **`Comps & Submarket`** tab and click **`+ Add Neighbor`** to enter 2–4 similar Airbnb listings nearby (their nightly price and whether they are *Vacant* or *Booked*).
3. **Review Moisha's Verdict & Real Profit:** Check **`Verdict & Copilot`** to see whether to **drop**, **raise**, or **hold** your rate—then open **`Profit & Promotions`** to test any nightly price on the slider and verify exact net profit after cleaning & platform fees.
4. **Ask Moisha or Share the Plan:** Type any question in the **Ask Uncle Moisha** chat box, or click **`Copy Plan`** / **`Share via WhatsApp`** (under *Rules & Alerts*) to send the recommendation straight to your host or property manager.

> **Privacy Note:** Everything entered in Moisha is saved privately in each user's own browser (`localStorage`). Sharing the link with your property manager lets them manage their own portfolio without overwriting yours.

---

## Core Capabilities

| Capability | What It Does |
|---|---|
| **Built-In Onboarding** | Automatic 4-step quick-start banner for first-time visitors plus an anytime **`How to Use`** walkthrough modal. |
| **Multi-Property Portfolio** | Switch between properties or add/edit your own rentals with automatic browser persistence. |
| **Neighborhood Benchmark** | Compare your current rate against local 25th/50th/75th percentile ranges and individual vacant vs. booked neighbor comps. |
| **Revenue & Net Profit Calculator** | Models gross room revenue, guest cleaning fees, cleaner turnover costs, platform fees, fixed holding costs, and odds-weighted expected net profit. |
| **One-Tap Team Sharing** | Copy ready-made pricing plans to your clipboard or share directly via WhatsApp / browser push notifications. |
| **Optional Gemini AI** | Works 100% standalone in any browser; optionally connect a Gemini API key (locally via `.env` or in `⚙️ Settings`) for live AI commentary & Google Search market grounding. |

---

## Publishing on GitHub Pages (One-Time Repo Setting)

This repository includes an automated GitHub Pages deployment workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml). To ensure the live link is active:

1. Open your repository on GitHub → **Settings** → **Pages** (`https://github.com/janagrit/Moisha/settings/pages`).
2. Under **Build and deployment → Source**, select **`GitHub Actions`**.
3. Every push to `master` automatically runs typechecks, tests, builds `frontend/dist`, and publishes to **`https://janagrit.github.io/Moisha/`**.

---

## Run Locally (For Developers)

**Requirements:** Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Optional local Gemini key (`.env` in repo root, never bundled into client builds):

```env
GEMINI_API_KEY=your_gemini_api_key
```

### Scripts

```bash
npm run dev             # Start Vite dev server
npm run typecheck       # Run strict TypeScript compiler checks
npm test                # Run Vitest unit, property-based (fast-check), and UI tests
npm run build           # Build static PWA bundle into frontend/dist
npm run build-baseline  # Compute p25/median/p75 baselines from demo or CSV data
```
