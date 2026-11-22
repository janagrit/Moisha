import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { computeQuantile } from '../services/pricingEngine';
import { INITIAL_HOUSES } from '../constants';

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
    const summary = INITIAL_HOUSES.map((house) => {
      const sorted = house.comps.map((c) => c.currentPrice).sort((a, b) => a - b);
      return {
        property: house.nickname,
        neighborhood: house.neighborhood,
        compsCount: sorted.length,
        p25: computeQuantile(sorted, 0.25),
        median: computeQuantile(sorted, 0.5),
        p75: computeQuantile(sorted, 0.75),
      };
    });
    console.log(JSON.stringify({ source: 'demo-portfolio', baselines: summary }, null, 2));
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
