import { DEFAULT_THRESHOLDS } from '../domain/config';
import { addDays, dayTypeOf, diffDays, formatDayAndDate, formatShortDate } from '../domain/dates';
import { matchCheapestPrice, vacancyValueAtRisk } from '../domain/existingPricing';
import { compFreshness, comparableComps, compareMarket, currentPriceFor, type MarketComparison } from '../domain/market';
import { formatUsd, known, unavailable } from '../domain/provenance';
import { recommendPrice, type Recommendation, type RecommendFlag } from '../domain/recommend';
import type { Figure, ISODate, Property } from '../domain/types';
import { firstOpenNight, findVacancyGaps } from '../domain/vacancy';
import type { CardRow, ChatCard, Memory } from '../memory/schema';

const t = DEFAULT_THRESHOLDS;

const NO_FEED_NOTE = 'No live market feed. Neighbor prices are as of the dates you entered them.';

const FLAG_NOTES: Record<RecommendFlag, string> = {
  'stale-comps-excluded': 'I left out comps more than a week old.',
  'baseline-stale': 'The public baseline is getting old.',
  conflict: 'Your comps and the public baseline disagree, so trust this less.',
  'wide-spread': 'Your comps are far apart, so trust this less.',
  'not-day-specific': 'The public baseline does not separate weekdays from weekends.',
};

export interface PriceView {
  card: ChatCard;
  advice: string;
  recommendation: Recommendation;
}

function positionNote(market: MarketComparison): string | null {
  const { band, percent } = market.position;
  if (band === null || percent.provenance === 'unavailable') return null;
  const size = `${Math.abs(Math.round(percent.value))}%`;
  const against = market.position.against === 'comps' ? 'your comps' : 'the public baseline';
  if (band === 'in-line') return `You are in line with ${against}.`;
  return `You are about ${size} ${band.endsWith('above') ? 'above' : 'below'} ${against}.`;
}

function matchCheapestFigure(mem: Memory, property: Property, today: ISODate, dayType: 'weekday' | 'weekend'): Figure | undefined {
  const floor = property.rules.minPriceUsd;
  const current = currentPriceFor(property, dayType);
  if (floor === null || current === null) return undefined;
  const open = comparableComps(mem.comps, property, dayType).filter(
    (c) => c.availability === 'vacant' && compFreshness(c, today, t) === 'fresh',
  );
  if (open.length === 0) return undefined;
  const price = matchCheapestPrice(floor, open.map((c) => ({ priceUsd: c.priceUsd, isBooked: false })), current);
  return known('estimate', price, 'usd', today, 'Cheapest open neighbor, held at your minimum');
}

function adviceFor(mem: Memory, rec: Recommendation, property: Property): string {
  const name = mem.preferences.hostName ?? 'host';
  if (rec.state === 'not-enough-data') {
    return `Nu, ${name}, I won't guess with your money. ${rec.needs}`;
  }

  const hedge = rec.confidence === 'low' ? ` With this little to go on, that's my rough read.` : '';
  const price = formatUsd(rec.priceUsd);
  const currentUsd = currentPriceFor(property, rec.dayType);

  if (rec.state === 'at-minimum') {
    return `Oy vey. The market is under your minimum, so I'm holding at ${price}. Better an empty night than a losing one, if you meant that minimum.${hedge}`;
  }
  if (currentUsd === null) {
    return `I'd say about ${price}. Tell me what you're charging and I'll tell you how far off you are.${hedge}`;
  }

  const lead = rec.state === 'booked-tonight' ? `You're booked tonight, mazel tov! For the next open night: ` : '';
  const diff = rec.priceUsd - currentUsd;
  const moved = (Math.abs(diff) / currentUsd) * 100;

  if (moved <= t.inLinePct) {
    return `${lead}Good news! ${formatUsd(currentUsd)} is right where it should be. Don't touch anything. Go enjoy your coffee.${hedge}`;
  }
  if (diff > 0) {
    return `${lead}Listen, my friend. You're asking ${formatUsd(currentUsd)} and the neighborhood supports ${price}. Don't leave money on the table.${hedge}`;
  }
  const stepNote = rec.stepLimited ? ' One step at a time, we can look again after.' : '';
  return `${lead}Nu, let's look at the numbers. You're at ${formatUsd(currentUsd)} and I'd consider ${price}. Your call. I'm just the uncle with the calculator.${stepNote}${hedge}`;
}

export function buildPriceView(mem: Memory, property: Property, today: ISODate): PriceView {
  const recommendation = recommendPrice({
    today,
    property,
    comps: mem.comps,
    baseline: null,
    thresholds: t,
    horizonDays: mem.preferences.horizonDays,
  });

  const targetDate = firstOpenNight(property, today, mem.preferences.horizonDays) ?? today;
  const dayType = dayTypeOf(targetDate);
  const market = compareMarket({ today, property, comps: mem.comps, baseline: null, thresholds: t, dayType });

  const floorUsd = property.rules.minPriceUsd;
  const floor: Figure =
    floorUsd !== null
      ? known('user-entered', floorUsd, 'usd', property.priceUpdatedOn ?? today, 'Your minimum')
      : unavailable('no-minimum-set');

  const rows: CardRow[] = [
    { label: 'Your price', figure: market.current },
    { label: 'Neighborhood average', figure: market.average },
    { label: 'Lowest comparable', figure: market.low, note: market.lowLabel },
    { label: 'Highest comparable', figure: market.high, note: market.highLabel },
    { label: 'Your minimum', figure: floor },
  ];

  const notes: string[] = [];
  const position = positionNote(market);
  if (position) notes.push(position);
  if (recommendation.state !== 'not-enough-data') {
    notes.push(...recommendation.flags.map((f) => FLAG_NOTES[f]));
    if (recommendation.stepLimited) notes.push(`Limited to a ${property.rules.maxStepPct}% move from your current price.`);
    if (recommendation.floorBinding) notes.push('Held at your minimum.');
  }
  if (market.bookedPricedHigher) notes.push('Your booked neighbors are priced above your open ones.');
  notes.push(NO_FEED_NOTE);
  notes.push('I never change your listing. You do.');

  const isTonight = targetDate === today;
  const card: ChatCard = {
    type: 'price',
    propertyName: property.nickname,
    nightLabel: `${isTonight ? 'Tonight' : formatDayAndDate(targetDate)} · ${dayType}`,
    recommended: recommendation.state === 'not-enough-data' ? unavailable(recommendation.reason) : recommendation.price,
    recommendedNote:
      recommendation.state === 'not-enough-data'
        ? recommendation.needs
        : `${recommendation.confidence[0].toUpperCase()}${recommendation.confidence.slice(1)} confidence. ${
            recommendation.price.provenance === 'unavailable' ? '' : recommendation.price.source
          }.`,
    rows,
    matchCheapest: matchCheapestFigure(mem, property, today, dayType),
    notes,
  };

  return { card, advice: adviceFor(mem, recommendation, property), recommendation };
}

export function buildCompsCard(mem: Memory, property: Property, today: ISODate): ChatCard {
  const rows: CardRow[] = mem.comps
    .filter((c) => c.propertyId === property.id)
    .map((c) => {
      const freshness = compFreshness(c, today, t);
      const age = Math.max(0, diffDays(today, c.enteredOn));
      const status = c.availability === 'vacant' ? 'open' : c.availability === 'booked' ? 'booked' : 'status unknown';
      const previous = c.priceHistory[c.priceHistory.length - 1];
      const parts = [
        `${c.bedrooms}BR`,
        c.appliesTo === 'any' ? 'all nights' : `${c.appliesTo}s`,
        status,
        previous ? `was ${formatUsd(previous.priceUsd)}` : null,
        freshness === 'fresh' ? null : `${age} days old, not used for pricing`,
      ];
      return {
        label: c.label,
        note: parts.filter(Boolean).join(' · '),
        figure: known('user-entered', c.priceUsd, 'usd', c.enteredOn, 'You entered this', { stale: freshness !== 'fresh' }),
      };
    });

  return {
    type: 'comps',
    propertyName: property.nickname,
    rows,
    notes: [`Only prices from the last ${t.freshDays} days count toward a recommendation.`, NO_FEED_NOTE],
  };
}

export interface GapsView {
  card: ChatCard;
  advice: string;
}

export function buildGapsView(mem: Memory, property: Property, today: ISODate): GapsView {
  const name = mem.preferences.hostName ?? 'host';
  const result = findVacancyGaps(property, today, mem.preferences.horizonDays, t);

  if (result.status === 'no-calendar') {
    return {
      card: { type: 'gaps', propertyName: property.nickname, rows: [], notes: ["You haven't told me your calendar yet, so I don't know which nights are empty."] },
      advice: `I can't count empty nights I can't see, ${name}. Tell me what's booked.`,
    };
  }

  const horizonEnd = addDays(today, mem.preferences.horizonDays);
  const rows: CardRow[] = result.gaps.map((g) => ({
    label: `${formatDayAndDate(g.start)} to ${formatShortDate(g.end)}`,
    text: `${g.nights} ${g.nights === 1 ? 'night' : 'nights'}`,
    note: [g.isOrphan ? 'short gap between stays' : null, g.includesWeekend ? 'includes a weekend' : null, g.end === horizonEnd ? 'may run longer' : null]
      .filter(Boolean)
      .join(' · ') || undefined,
  }));

  let weekdayNights = 0;
  let weekendNights = 0;
  for (const gap of result.gaps) {
    for (let i = 0; i < gap.nights; i += 1) {
      if (dayTypeOf(addDays(gap.start, i)) === 'weekend') weekendNights += 1;
      else weekdayNights += 1;
    }
  }
  const totalNights = weekdayNights + weekendNights;
  const weekdayUsd = currentPriceFor(property, 'weekday');
  const weekendUsd = currentPriceFor(property, 'weekend');
  const atMost: Figure | undefined =
    totalNights > 0 && weekdayUsd !== null && weekendUsd !== null
      ? known(
          'estimate',
          vacancyValueAtRisk(weekdayUsd, weekdayNights) + vacancyValueAtRisk(weekendUsd, weekendNights),
          'usd',
          today,
          'Every empty night at your current price',
        )
      : undefined;

  const notes = [`Looking ${mem.preferences.horizonDays} days ahead.`];
  if (result.calendarStale) notes.push('Your calendar is a few days old, so this may be out of date.');
  if (atMost) notes.push('That is the most those nights could earn at your current price, not a forecast.');

  const card: ChatCard = { type: 'gaps', propertyName: property.nickname, rows, atMost, notes };

  if (result.gaps.length === 0) {
    return { card, advice: `Not one empty night in the next ${mem.preferences.horizonDays} days. Mazel tov! Go enjoy your coffee.` };
  }
  const first = result.gaps[0];
  const nights = first.nights === 1 ? 'One empty night' : `${first.nights} empty nights`;
  const when = first.startsInDays === 0 ? 'starting tonight' : `starting ${formatDayAndDate(first.start)}`;
  // The sentence is about the first gap, so its dollar figure must be too.
  let firstGapUsd: number | null = 0;
  for (let i = 0; i < first.nights; i += 1) {
    const nightly = currentPriceFor(property, dayTypeOf(addDays(first.start, i)));
    firstGapUsd = nightly === null || firstGapUsd === null ? null : firstGapUsd + vacancyValueAtRisk(nightly, 1);
  }
  const sum = firstGapUsd !== null ? ` At most, that's ${formatUsd(firstGapUsd)} sitting on the calendar doing nothing.` : '';
  return { card, advice: `Oy vey! ${nights} ${when}.${sum}` };
}

export function buildMemoryCard(mem: Memory, property: Property | undefined, storagePersisted?: boolean | null): ChatCard {
  const rows: CardRow[] = [
    { label: 'I call you', text: mem.preferences.hostName ?? 'host' },
    { label: 'Properties', text: mem.properties.map((p) => p.nickname).join(', ') || 'None yet' },
    { label: 'Neighbors on file', text: String(mem.comps.length) },
    { label: 'Past recommendations', text: String(mem.recommendations.length) },
    { label: 'Decisions recorded', text: String(mem.decisions.length) },
    { label: 'Messages kept', text: String(mem.messages.length) },
    { label: 'Last backup', text: mem.lastBackupAt ? formatShortDate(mem.lastBackupAt.slice(0, 10)) : 'Never' },
  ];
  if (storagePersisted === true) rows.push({ label: 'Browser storage', text: 'Protected' });
  if (storagePersisted === false) rows.push({ label: 'Browser storage', text: 'Could be cleared' });
  if (property) {
    const c = property.costs;
    const monthly = c.utilitiesMonthlyUsd + c.maintenanceMonthlyUsd + c.mortgageOrFixedMonthlyUsd;
    rows.push(
      { label: 'Minimum price', text: property.rules.minPriceUsd !== null ? formatUsd(property.rules.minPriceUsd) : 'Not set' },
      { label: 'Monthly costs', text: monthly > 0 ? formatUsd(monthly) : 'Not entered' },
    );
  }
  return {
    type: 'memory',
    rows,
    notes: ['All of this lives only on this device. Back it up to move it to another phone.'],
  };
}
