# Moisha

**Live App:** **[https://janagrit.github.io/Moisha/](https://janagrit.github.io/Moisha/)**

Moisha is an Airbnb competitor-monitoring assistant for US properties. Register your listing once to monitor comparable entire-home listings in your neighborhood, track nightly rates, spot competitor price increases and decreases, and prepare email alerts.

## Features

- **Simple US Property Setup:** Register with your Airbnb listing URL, US property address or ZIP code, and bedroom count. Non-US locations are validated and rejected automatically.
- **Strict Comparable Matching:** Prioritizes same-bedroom entire homes, ranks by bathrooms, guest capacity, and shared amenities, separates `±1` bedroom secondary matches, and excludes studios and private rooms from your primary benchmark.
- **Price Change Activity Feed:** Highlights every observed competitor price increase or decrease (`previous → new`, `% change`, and timestamp).
- **Market Overview & Competitor Table:** Displays comparable count, your price vs. competitor average, cheapest and most expensive comparable listings, and sortable competitor cards/tables without inventing missing property details.

## Development

```bash
npm install
npm run dev
```

### Verification

```bash
npm run typecheck
npm test
npm run build
```

> **Note on Monitoring & Email Delivery:** The static GitHub Pages deployment stores data locally in your browser, records price changes when checks are run, and composes formatted email alerts via `mailto:`. Unattended 24/7 background scraping and automatic SMTP delivery require a server-side worker.
