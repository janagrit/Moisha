import { PropertyHouse, AgentDecision, sanitizeExternalUrl } from '../types';
import { buildAirbnbMapSearchUrl } from './addressService';

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'property'
  );
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function triggerBlobDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsvReport(house: PropertyHouse, decision: AgentDecision): void {
  const today = new Date().toISOString().slice(0, 10);
  const { currentScenario, recommendedScenario } = decision.revenueProjection;
  const mapUrl = buildAirbnbMapSearchUrl(house);

  const rows: Array<Array<string | number | boolean>> = [
    ['MOISHA PRICING & PROFIT PROOF REPORT'],
    ['Generated At', `${today} ${decision.timestamp}`],
    ['Property Address', house.address],
    ['Neighborhood / ZIP', `${house.neighborhood} (${house.zipCode})`],
    ['Bedrooms / Bathrooms', `${house.bedrooms} BR / ${house.bathrooms} BA`],
    ['Unbooked Window', `${house.unbookedStartDate} to ${house.unbookedEndDate} (${house.unbookedDaysCount} nights)`],
    ['Live Airbnb Map Verification Link', mapUrl],
    [],
    ['PRICING VERDICT & FORMULA PROOF'],
    ['Current Nightly Rate ($)', house.currentPrice],
    ['Host Safety Floor ($)', decision.effectiveFloorPrice],
    ['Moisha Recommended Rate ($)', decision.recommendedPrice],
    ['Rate Adjustment ($)', decision.priceDelta],
    ['Data Source Status', decision.competitorSummary.verifiedCompsCount > 0 ? `Verified (${decision.competitorSummary.verifiedCompsCount} logged listings)` : 'Unverified Regional Estimate'],
    ['Trigger Rule', decision.primaryTriggerRule],
    ['Formula Summary', `max(Safety Floor $${decision.effectiveFloorPrice}, Benchmark Target) = $${decision.recommendedPrice}/nt`],
    [],
    ['COMPARABLE LISTINGS & PROOF LINKS'],
    ['Listing Name', 'Note / Street', 'Nightly Rate ($)', 'Status', 'Verification', 'Proof URL'],
    ...house.comps.map((c) => [
      c.name,
      c.address || '',
      c.currentPrice,
      c.isBooked ? 'Booked' : 'Vacant',
      c.isVerified ? 'Host Verified' : 'Regional Estimate',
      sanitizeExternalUrl(c.airbnbUrl),
    ]),
    [],
    ['NET PROFIT & EXPENSE BREAKDOWN', 'Current Rate', 'Moisha Recommended'],
    ['Nightly Rate ($)', currentScenario.nightlyRate, recommendedScenario.nightlyRate],
    ['Nights', currentScenario.nights, recommendedScenario.nights],
    ['Est. Booking Probability (%)', currentScenario.bookingProbability, recommendedScenario.bookingProbability],
    ['Gross Room Revenue ($)', currentScenario.grossRoomRevenue, recommendedScenario.grossRoomRevenue],
    ['Guest Cleaning Fee ($)', currentScenario.cleaningFeeRevenue, recommendedScenario.cleaningFeeRevenue],
    ['Platform Host Fee (-$)', -currentScenario.platformFee, -recommendedScenario.platformFee],
    ['Cleaner Turnover Cost (-$)', -currentScenario.cleanerPayout, -recommendedScenario.cleanerPayout],
    ['Fixed Holding Costs (-$)', -currentScenario.fixedCosts, -recommendedScenario.fixedCosts],
    ['Net Profit If Booked ($)', currentScenario.netProfitIfBooked, recommendedScenario.netProfitIfBooked],
    ['Odds-Weighted Expected Net Value ($)', currentScenario.expectedNetValue, recommendedScenario.expectedNetValue],
  ];

  const csvBody = '\uFEFF' + rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
  triggerBlobDownload(`moisha-pricing-proof-${slugify(house.nickname)}-${today}.csv`, csvBody, 'text/csv;charset=utf-8');
}

export function downloadHtmlProofReport(house: PropertyHouse, decision: AgentDecision): void {
  const today = new Date().toISOString().slice(0, 10);
  const { currentScenario, recommendedScenario } = decision.revenueProjection;
  const mapUrl = sanitizeExternalUrl(buildAirbnbMapSearchUrl(house));
  const verifiedCount = decision.competitorSummary.verifiedCompsCount;

  const compsRowsHtml = house.comps
    .map(
      (c) => `<tr>
        <td><strong>${escapeHtml(c.name)}</strong><br><small>${escapeHtml(c.address || '')}</small></td>
        <td>$${c.currentPrice}/nt</td>
        <td>${c.isBooked ? 'Booked' : 'Vacant'}</td>
        <td>${c.isVerified ? '✓ Host Verified' : '⚠️ Regional Estimate'}</td>
        <td><a href="${escapeHtml(sanitizeExternalUrl(c.airbnbUrl))}" target="_blank" rel="noopener noreferrer">Open Proof Link ↗</a></td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Moisha Pricing Proof — ${escapeHtml(house.address)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F264A; background: #FAF8F5; margin: 0; padding: 32px; line-height: 1.5; }
    .sheet { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #E8DFD3; border-radius: 16px; padding: 32px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    h2 { margin: 26px 0 10px; font-size: 17px; border-bottom: 1px solid #E8DFD3; padding-bottom: 6px; }
    .meta { color: #55637A; font-size: 14px; margin-bottom: 20px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi { border: 1px solid #E8DFD3; border-radius: 12px; padding: 14px; background: #FAF8F5; }
    .kpi strong { display: block; font-size: 22px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
    th, td { border: 1px solid #E8DFD3; padding: 10px 12px; text-align: left; }
    th { background: #FAF8F5; font-weight: 700; }
    a { color: #2563EB; text-decoration: none; font-weight: 600; }
    .print-btn { background: #0F264A; color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; margin-bottom: 16px; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: none; padding: 0; } .print-btn { display: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
    <h1>Moisha Pricing &amp; Profit Proof Sheet</h1>
    <div class="meta">
      <strong>Property:</strong> ${escapeHtml(house.address)} (${house.bedrooms} BR / ${house.bathrooms} BA) &nbsp;•&nbsp;
      <strong>Dates:</strong> ${escapeHtml(house.unbookedStartDate)} to ${escapeHtml(house.unbookedEndDate)} (${house.unbookedDaysCount} nights) &nbsp;•&nbsp;
      <strong>Generated:</strong> ${escapeHtml(today)} ${escapeHtml(decision.timestamp)}
    </div>

    <div class="kpis">
      <div class="kpi"><span>Current Rate</span><strong>$${house.currentPrice}/nt</strong></div>
      <div class="kpi"><span>Safety Floor</span><strong>$${decision.effectiveFloorPrice}/nt</strong></div>
      <div class="kpi"><span>Moisha Target</span><strong style="color:#2563EB">$${decision.recommendedPrice}/nt</strong></div>
      <div class="kpi"><span>Proof Status</span><strong>${verifiedCount > 0 ? `${verifiedCount} Verified` : 'Estimate'}</strong></div>
    </div>

    <p><strong>Headline:</strong> ${escapeHtml(decision.headline)}</p>
    <p><strong>Reasoning:</strong> ${escapeHtml(decision.reasoning)}</p>
    <p><strong>Live Map Verification:</strong> <a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener noreferrer">Open Airbnb Map for Exact Dates &amp; Bedrooms ↗</a></p>

    <h2>1. Comparable Listings &amp; Proof Sources</h2>
    <table>
      <thead><tr><th>Listing</th><th>Rate</th><th>Status</th><th>Source Type</th><th>Proof Link</th></tr></thead>
      <tbody>${compsRowsHtml}</tbody>
    </table>

    <h2>2. Step-by-Step Revenue &amp; Net Profit Proof (${currentScenario.nights} Nights)</h2>
    <table>
      <thead><tr><th>Line Item</th><th>At Current ($${currentScenario.nightlyRate}/nt)</th><th>At Moisha Target ($${recommendedScenario.nightlyRate}/nt)</th></tr></thead>
      <tbody>
        <tr><td>Room Revenue (${currentScenario.nights} nights)</td><td>$${currentScenario.grossRoomRevenue}</td><td>$${recommendedScenario.grossRoomRevenue}</td></tr>
        <tr><td>Guest Cleaning Fee</td><td>+$${currentScenario.cleaningFeeRevenue}</td><td>+$${recommendedScenario.cleaningFeeRevenue}</td></tr>
        <tr><td>Airbnb Host Fee (${house.hostServiceFeePercent}%)</td><td>-$${currentScenario.platformFee}</td><td>-$${recommendedScenario.platformFee}</td></tr>
        <tr><td>Cleaner Turnover Payout</td><td>-$${currentScenario.cleanerPayout}</td><td>-$${recommendedScenario.cleanerPayout}</td></tr>
        <tr><td>Fixed Holding Costs ($${house.nightlyFixedCost}/nt)</td><td>-$${currentScenario.fixedCosts}</td><td>-$${recommendedScenario.fixedCosts}</td></tr>
        <tr><td><strong>Net Profit (If Booked)</strong></td><td><strong>$${currentScenario.netProfitIfBooked}</strong></td><td><strong>$${recommendedScenario.netProfitIfBooked}</strong></td></tr>
        <tr><td>Estimated Booking Probability</td><td>${currentScenario.bookingProbability}%</td><td>${recommendedScenario.bookingProbability}%</td></tr>
        <tr><td><strong>Odds-Weighted Expected Net Value</strong></td><td><strong>$${currentScenario.expectedNetValue}</strong></td><td><strong>$${recommendedScenario.expectedNetValue}</strong></td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

  triggerBlobDownload(`moisha-pricing-proof-${slugify(house.nickname)}-${today}.html`, html, 'text/html;charset=utf-8');
}
