# Moisha — Your Airbnb Pocket Advisor

Moisha helps short-term rental hosts decide how much to charge for their properties.

It compares nightly rates, looks at rental prices in the surrounding area, identifies empty dates, and calculates how pricing changes could affect revenue.

The idea came from a simple problem: setting a nightly rate shouldn't be guesswork. A property might be priced too high for its neighborhood, or too low when demand is strong. Moisha helps hosts see the difference and decide what to do.

## Features

### Local Market Research
- Look up rental prices in the property's ZIP code and neighborhood.
- Compare weekday and weekend rates.
- Review available market information and pricing trends.
- Identify how similar properties are priced.

### Competitor Analysis
- Compare nightly rates with nearby properties.
- Identify competitors charging less.
- Calculate price differences.
- Review available competitor information before adjusting rates.

### Pricing Recommendations
- Get suggested nightly rates based on available market and property data.
- Identify when a price adjustment may help attract bookings.
- Set a minimum nightly rate.
- Compare the current rate with the suggested rate.

### Revenue Calculations
- Calculate potential income from available nights.
- Estimate revenue lost to vacant dates.
- Compare different nightly rate scenarios.
- Understand the financial impact of discounts.

### Vacancy Management
- Identify gaps in the booking calendar.
- Review upcoming unbooked dates.
- Consider last-minute discounts.
- Evaluate discounts for longer stays.

### Pricing Rules
- Set minimum acceptable nightly rates.
- Configure competitor price alerts.
- Define pricing thresholds.
- Review recommendations before changing rates.

## How It Works

| Step | Host | Moisha |
|---|---|---|
| 1. Select Property | Select a rental property. | Loads its address, property details, current rate, and minimum price. |
| 2. Review Calendar | Check upcoming available dates. | Identifies empty nights and calculates potential revenue at risk. |
| 3. Check Local Market | Review the property's location. | Searches for rental prices and market information in the surrounding area. |
| 4. Compare Prices | Review similar nearby properties. | Compares available rates and highlights pricing differences. |
| 5. Review Suggestions | Check the pricing analysis. | Recommends rate adjustments and possible promotions. |
| 6. Adjust Pricing | Decide whether to change the nightly rate. | Calculates the difference and checks the minimum price limit. |

## Technology

- React
- TypeScript
- Vite
- Node.js
- Express
- Google Gemini 2.5 Flash
- Google Cloud Vertex AI
- Google Search Grounding

## Project Structure

```text
Moisha/
├── backend/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── components/
│   ├── services/
│   ├── App.tsx
│   ├── constants.ts
│   ├── types.ts
│   └── package.json
├── Dockerfile
├── package.json
└── README.md
```

## Requirements

Before running the project, install:

- Node.js and npm
- Google Cloud SDK
- A Google Cloud project with Vertex AI enabled

[Google Cloud SDK Installation](https://cloud.google.com/sdk/docs/install)

## Google Cloud Setup

Initialize the CLI:

```bash
gcloud init
```

Authenticate:

```bash
gcloud auth application-default login
```

Make sure your account has permission to access Vertex AI.

## Environment Variables

Configure the backend using `backend/.env.local`.

| Variable | Description |
|---|---|
| `API_BACKEND_PORT` | Port used by the backend server |
| `API_PAYLOAD_MAX_SIZE` | Maximum API request size |
| `GOOGLE_CLOUD_LOCATION` | Google Cloud region |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID |

Keep credentials and secret keys out of the repository.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm run dev
```

## Market Data

Moisha uses Google Search Grounding to retrieve publicly available rental market information. Competitor comparisons also use property records maintained by the application.

Market estimates may differ from actual Airbnb booking prices and availability. Recommendations should be reviewed before changing listing prices.

## Why Moisha?

I built Moisha to make rental pricing easier to understand.

When a property sits empty, the question is whether the price is too high, demand is low, or nearby properties offer something more competitive.

Moisha brings those numbers together so hosts can make pricing decisions based on what is happening around their property, rather than relying on guesswork.
