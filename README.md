# Moisha | Airbnb Pocket Advisor

<p align="center">
  <img src="screenshots/moisha-dashboard.png" alt="Moisha neighborhood pricing advisor" width="100%" />
</p>

Moisha helps short-term rental hosts decide what to charge for their properties.

It compares nearby rental prices, tracks market changes, calculates potential revenue, and suggests when to adjust nightly rates.

## What It Does

| Feature | Description |
|---|---|
| Market Research | Check rental prices in your neighborhood. |
| Competitor Analysis | Compare your rates with similar properties nearby. |
| Pricing Advice | Get recommendations for nightly rates. |
| Revenue Calculator | Calculate income, expenses, and potential profit. |
| Vacancy Analysis | Identify empty dates and potential lost revenue. |
| Price Alerts | Get notified when market conditions may require attention. |

## How It Works

1. Select your rental property.
2. Review your current nightly rate and available dates.
3. Check prices of comparable properties nearby.
4. Review Moisha's pricing recommendation.
5. Calculate the financial impact before changing your rate.

## Technology

React · TypeScript · Vite · Node.js · Express · Google Gemini

## Run Locally

**Requirements:** Node.js, npm, and Google Cloud credentials with Vertex AI access.

```bash
gcloud init
gcloud auth application-default login
npm install
npm run dev
```

Configure the required environment variables in `backend/.env.local`.

## Note

Market information and pricing recommendations depend on available data. Estimates are not guaranteed booking or revenue forecasts.



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
