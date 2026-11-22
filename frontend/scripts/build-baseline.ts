import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

interface RawCsvRow {
  price?: string;
}

function computeQuantile(sortedPrices: number[], q: number): number {
  if (sortedPrices.length === 0) return 0;
  if (sortedPrices.length === 1) return sortedPrices[0];
  const clampedQ = Math.min(1, Math.max(0, Number.isFinite(q) ? q : 0.5));
  const pos = (sortedPrices.length - 1) * clampedQ;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedPrices[base + 1] ?? sortedPrices[base];
  return Math.round(sortedPrices[base] + rest * (next - sortedPrices[base]));
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
          note: 'Pass an Airbnb CSV with a "price" column to compute p25, median, and p75 nightly rates.',
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
