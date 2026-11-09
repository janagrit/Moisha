# Moisha | Airbnb Pocket Advisor

<p align="center">
  <img src="screenshots/moisha-dashboard.png" alt="Moisha neighborhood pricing advisor" width="100%" />
</p>

Moisha helps short-term rental hosts decide what to charge for their properties.

It compares nearby rental prices, tracks market changes, calculates potential revenue, and suggests when to adjust nightly rates.

## What It Does

| Feature | Description |
|---|---|
| Market Research | Record rental prices in your neighborhood and see when each was last updated. |
| Competitor Analysis | Compare your rates with similar properties nearby. |
| Pricing Advice | Get recommendations for nightly rates. |
| Revenue Calculator | Income, expense and profit calculations are built. The chat screen for them is planned. |
| Vacancy Analysis | Identify empty dates and potential lost revenue. |
| Price Alerts | Planned. |

## How It Works

1. Select your rental property.
2. Review your current nightly rate and available dates.
3. Check prices of comparable properties nearby.
4. Review Moisha's pricing recommendation.
5. Calculate the financial impact before changing your rate.

Moisha is a conversation. You talk to him, he remembers what you tell him, and he shows the numbers in small cards in the chat.

## Technology

React · TypeScript · Vite · Tailwind CSS · browser storage

There is no backend, AI service, paid API or database. All calculations run on the device.

## Run Locally

**Requirements:** Node.js 20.19 or newer, and npm.

```bash
npm install
npm run dev
```

No environment variables or credentials are needed.

Other commands:

```bash
npm test
npm run typecheck
npm run build
```

## Project Structure

```text
Moisha/
├── frontend/
│   ├── domain/          Pricing, market, vacancy and revenue calculations
│   ├── memory/          Saved data, export/import, encrypted backups
│   ├── conversation/    Moisha's conversation logic and messages
│   ├── components/      Chat screen and cards
│   ├── services/        Offline support and file sharing
│   ├── public/          App icons, manifest and hosting headers
│   ├── sw.ts            Offline cache
│   ├── App.tsx
│   └── package.json
├── docs/
├── package.json
└── README.md
```

## Your Data

Everything you enter stays in the browser on that device, encrypted with a passcode you choose. Nothing is sent to a server.

- The app locks after 5 minutes without activity, and whenever it is closed or reloaded.
- **Nobody can reset a lost passcode.** The only way forward is to erase the device and restore an encrypted backup. Without a backup, the data is gone.
- Each device keeps its own copy. There is no automatic sync.
- "Erase this device" removes Moisha's stored data, cached app files and offline worker from that browser. It cannot reach backup files saved elsewhere or any other device.
- Backups are encrypted with a passphrase you choose. If the passphrase is lost, the backup cannot be opened.
- Restoring a backup always shows what will be replaced and asks first.
- Clearing browser data or removing the installed app can erase your information, so back up regularly.
- Do not enter guest names or other guest details, and never enter your Airbnb password.

## Install and Offline Use

After one successful online visit, Moisha opens and works without an internet connection, including saved data and calculations.

- **Android and desktop Chrome or Edge:** use the browser's Install option.
- **iPhone and iPad:** in Safari, tap Share, then Add to Home Screen. The installed app keeps its data separately from Safari, so enter your information inside the installed app or restore a backup there.

New versions wait for you to tap Refresh. Moisha only checks anything while the app is open, and there is no background monitoring.

## Market Data

You enter nearby prices yourself, and each one shows when it was entered. Moisha has no live market feed, online or offline, and he never changes your listing.

Market estimates may differ from actual Airbnb booking prices and availability. Recommendations should be reviewed before changing listing prices.

## Note

Market information and pricing recommendations depend on available data. Estimates are not guaranteed booking or revenue forecasts.

## Why Moisha?

I built Moisha to make rental pricing easier to understand.

When a property sits empty, the question is whether the price is too high, demand is low, or nearby properties offer something more competitive.

Moisha brings those numbers together so hosts can make pricing decisions based on what is happening around their property, rather than relying on guesswork.
