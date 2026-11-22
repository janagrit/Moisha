import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { computeQuantile } from '../services/pricingEngine';

interface RawCsvRow {
  price?: string;
  bedrooms?: string;
  neighbourhood_cleansed?: string;
  neighborhood?: string;
}

function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null;
  const numeric = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function main(): void {
  const csvArg = process.argv[2];

  if (!csvArg || csvArg === '--demo') {
    console.log(
      JSON.stringify(
        {
          usage: 'npm run build-baseline -- <path-to-listings.csv>',
          note: 'Pass an Airbnb / rental CSV with a "price" column to compute p25, median, and p75 nightly rates.',
        },
        null,
        2,
      ),
    );
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), csvArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`CSV file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');
  const records = parse(content, { columns: true, skip_empty_lines: true }) as RawCsvRow[];
  const prices = records
    .map((r) => parsePrice(r.price))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    console.error(`No valid positive price rows found in ${resolvedPath}`);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        source: path.basename(resolvedPath),
        listingsParsed: prices.length,
        p25: computeQuantile(prices, 0.25),
        median: computeQuantile(prices, 0.5),
        p75: computeQuantile(prices, 0.75),
      },
      null,
      2,
    ),
  );
}

main();
