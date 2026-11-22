import {
  PropertyHouse,
  PricingRule,
  AgentDecision,
  AirbnbPromotion,
  RevenueScenario,
  CompetitorSummary,
  ChatSuggestedAction,
  LiveMarketScanResult,
} from '../types';

export function daysBetweenIso(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function computeQuantile(sortedPrices: number[], q: number): number {
  if (sortedPrices.length === 0) return 0;
  if (sortedPrices.length === 1) return sortedPrices[0];
  const clampedQ = Math.min(1, Math.max(0, Number.isFinite(q) ? q : 0.5));
  const pos = (sortedPrices.length - 1) * clampedQ;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedPrices[base + 1] ?? sortedPrices[base];
  return Math.round(sortedPrices[base] + rest * (next - sortedPrices[base]));
}

export function getEffectiveFloorPrice(house: PropertyHouse, rules: PricingRule[]): number {
  const floorRule = rules.find((r) => r.kind === 'safety_floor');
  const cushion = floorRule && floorRule.enabled ? Math.max(0, floorRule.parameterValue) : 0;
  return Math.max(1, Math.round(house.floorPrice + cushion));
}

export function summarizeCompetitors(house: PropertyHouse): CompetitorSummary {
  const verifiedOnly = house.comps.filter((c) => c.isVerified);
  // Once the user logs 1+ verified real comps, compute benchmarks strictly from verified comps!
  const comps = verifiedOnly.length > 0 ? verifiedOnly : house.comps;

  if (comps.length === 0) {
    return {
      totalComps: 0,
      verifiedCompsCount: 0,
      vacantComps: 0,
      bookedComps: 0,
      avgVacantPrice: house.currentPrice,
      medianCompPrice: house.currentPrice,
      lowerRangePrice: Math.round(house.currentPrice * 0.9),
      upperRangePrice: Math.round(house.currentPrice * 1.1),
      cheapestNeighborPrice: house.currentPrice,
      cheapestNeighborName: 'No comps logged yet',
      cheapestNeighborUrl: 'https://www.airbnb.com',
      cheapestNeighborVerified: false,
      undercuttingCompsCount: 0,
    };
  }

  const allSorted = [...comps].map((c) => c.currentPrice).sort((a, b) => a - b);
  const vacant = comps.filter((c) => !c.isBooked);
  const booked = comps.filter((c) => c.isBooked);

  const avgAll = Math.round(allSorted.reduce((s, p) => s + p, 0) / allSorted.length);
  const avgVacantPrice =
    vacant.length > 0
      ? Math.round(vacant.reduce((s, c) => s + c.currentPrice, 0) / vacant.length)
      : avgAll;

  const poolForCheapest = vacant.length > 0 ? vacant : comps;
  const cheapest = poolForCheapest.reduce(
    (min, c) => (c.currentPrice < min.currentPrice ? c : min),
    poolForCheapest[0],
  );

  return {
    totalComps: comps.length,
    verifiedCompsCount: verifiedOnly.length,
    vacantComps: vacant.length,
    bookedComps: booked.length,
    avgVacantPrice,
    medianCompPrice: computeQuantile(allSorted, 0.5),
    lowerRangePrice: computeQuantile(allSorted, 0.25),
    upperRangePrice: computeQuantile(allSorted, 0.75),
    cheapestNeighborPrice: cheapest.currentPrice,
    cheapestNeighborName: cheapest.isVerified
      ? cheapest.address || cheapest.name
      : 'Regional Baseline Estimate (Unverified)',
    cheapestNeighborUrl: cheapest.airbnbUrl,
    cheapestNeighborVerified: Boolean(cheapest.isVerified),
    undercuttingCompsCount: vacant.filter((c) => c.currentPrice < house.currentPrice).length,
  };
}

export function estimateBookingProbability(
  price: number,
  summary: CompetitorSummary,
  unbookedDays: number,
): number {
  if (unbookedDays <= 0) return 100;
  const anchor = summary.vacantComps > 0 ? summary.avgVacantPrice : summary.medianCompPrice;
  if (anchor <= 0) return 50;

  // Relative gap against neighborhood benchmark; booked comps increase demand signal.
  const demandBoost = summary.totalComps > 0 ? (summary.bookedComps / summary.totalComps) * 18 : 0;
  const ratio = (price - anchor) / anchor;
  // At anchor price ~68% + demandBoost; +25% overpriced drops sharply; -10% undercutting lifts toward 92%.
  const raw = 68 + demandBoost - ratio * 175;
  return Math.max(8, Math.min(95, Math.round(raw)));
}

export function calculateScenario(
  house: PropertyHouse,
  label: string,
  nightlyRate: number,
  nights: number,
  bookingProbability: number,
  baselineExpectedNet?: number,
): RevenueScenario {
  const safeNights = Math.max(0, nights);
  const grossRoomRevenue = Math.round(nightlyRate * safeNights);
  const cleaningFeeRevenue = safeNights > 0 ? Math.round(house.cleaningFee) : 0;
  const totalGross = grossRoomRevenue + cleaningFeeRevenue;
  const platformFee = Math.round(totalGross * (house.hostServiceFeePercent / 100));
  const cleanerPayout = safeNights > 0 ? Math.round(house.cleaningCost) : 0;
  const fixedCosts = Math.round(house.nightlyFixedCost * safeNights);
  const netProfitIfBooked = totalGross - platformFee - cleanerPayout - fixedCosts;
  const expectedNetValue = Math.round(
    (bookingProbability / 100) * netProfitIfBooked +
      (1 - bookingProbability / 100) * -fixedCosts,
  );
  const deltaExpectedVsCurrent =
    typeof baselineExpectedNet === 'number' ? expectedNetValue - baselineExpectedNet : 0;

  return {
    label,
    nightlyRate,
    nights: safeNights,
    bookingProbability,
    grossRoomRevenue,
    cleaningFeeRevenue,
    platformFee,
    cleanerPayout,
    fixedCosts,
    netProfitIfBooked,
    expectedNetValue,
    deltaExpectedVsCurrent,
  };
}

export function buildPromotions(
  house: PropertyHouse,
  rules: PricingRule[],
  effectiveFloor: number,
  cheapestNeighborPrice: number,
): AirbnbPromotion[] {
  const promoRule = rules.find((r) => r.kind === 'promo_badge');
  if (promoRule && !promoRule.enabled) {
    return [];
  }
  const safeCurrentPrice = Math.max(1, house.currentPrice || 1);
  const baseDiscount = promoRule ? Math.min(50, Math.max(5, promoRule.parameterValue)) : 15;
  const lengthDiscount = Math.min(55, baseDiscount + 3);

  const lastMinuteEffective = Math.max(
    effectiveFloor,
    Math.round(safeCurrentPrice * (1 - baseDiscount / 100)),
  );
  const actualLastMinutePct = Math.max(
    1,
    Math.round(((safeCurrentPrice - lastMinuteEffective) / safeCurrentPrice) * 100),
  );

  const lengthEffective = Math.max(
    effectiveFloor,
    Math.round(safeCurrentPrice * (1 - lengthDiscount / 100)),
  );
  const actualLengthPct = Math.max(
    1,
    Math.round(((safeCurrentPrice - lengthEffective) / safeCurrentPrice) * 100),
  );

  const promos: AirbnbPromotion[] = [];

  if (lastMinuteEffective < safeCurrentPrice) {
    promos.push({
      id: `promo-${house.id}-last-minute`,
      name: `Last-Minute ${actualLastMinutePct}% Search Boost`,
      badge: `${actualLastMinutePct}% Off Last-Minute`,
      discountPercent: actualLastMinutePct,
      effectivePrice: lastMinuteEffective,
      startDate: house.unbookedStartDate,
      endDate: house.unbookedEndDate,
      reason: `Adds Airbnb's strikethrough badge for ${house.unbookedStartDate.slice(5)}–${house.unbookedEndDate.slice(5)} so ${house.nickname} competes directly with $${cheapestNeighborPrice}/nt neighbors without lowering your permanent base rate.`,
      status: house.activePromotion?.id === `promo-${house.id}-last-minute` ? 'applied' : 'recommended',
    });
  }

  if (house.unbookedDaysCount >= 3 && lengthEffective < house.currentPrice) {
    const stayMin = Math.max(2, house.unbookedDaysCount - 1);
    promos.push({
      id: `promo-${house.id}-length`,
      name: `Fill ${house.unbookedDaysCount}-Night Block (Stay ${stayMin}+ Nights)`,
      badge: `Length of Stay ${actualLengthPct}% Off`,
      discountPercent: actualLengthPct,
      effectivePrice: lengthEffective,
      startDate: house.unbookedStartDate,
      endDate: house.unbookedEndDate,
      reason: `Incentivizes one guest to book the full ${house.unbookedDaysCount}-night window at ${house.nickname}, avoiding split turnovers and extra cleaning coordination.`,
      status: house.activePromotion?.id === `promo-${house.id}-length` ? 'applied' : 'recommended',
    });
  }

  return promos;
}

export function evaluatePropertyPricing(
  house: PropertyHouse,
  rules: PricingRule[],
  timestamp?: string,
): AgentDecision {
  const timeLabel =
    timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const effectiveFloor = getEffectiveFloorPrice(house, rules);
  const summary = summarizeCompetitors(house);
  const nights = house.isBooked ? 0 : house.unbookedDaysCount;

  const orphanRule = rules.find((r) => r.kind === 'orphan_gap');
  const undercutRule = rules.find((r) => r.kind === 'neighbor_undercut');

  const safeCurrentPrice = Math.max(1, house.currentPrice || 1);
  const undercutThresholdPct =
    undercutRule && undercutRule.enabled ? undercutRule.parameterValue : 8;
  const orphanLimit = orphanRule && orphanRule.enabled ? Math.max(1, orphanRule.parameterValue) : 5;

  const undercutPct =
    summary.vacantComps > 0
      ? ((safeCurrentPrice - summary.cheapestNeighborPrice) / safeCurrentPrice) * 100
      : 0;

  const isNeighborUndercutting =
    Boolean(undercutRule?.enabled ?? true) &&
    summary.vacantComps > 0 &&
    undercutPct >= undercutThresholdPct;

  const hasUrgentOrphanGap =
    Boolean(orphanRule?.enabled ?? true) &&
    nights > 0 &&
    nights <= orphanLimit &&
    summary.vacantComps > 0 &&
    safeCurrentPrice > summary.avgVacantPrice;

  // Upside check: when neighborhood median/vacant rates sit >=10% higher than our current rate
  const benchmarkHigh =
    summary.vacantComps > 0
      ? Math.round((summary.avgVacantPrice + summary.medianCompPrice) / 2)
      : summary.medianCompPrice;
  const upsidePct =
    house.currentPrice > 0 ? ((benchmarkHigh - house.currentPrice) / house.currentPrice) * 100 : 0;
  const hasRevenueUpside = !isNeighborUndercutting && summary.totalComps > 0 && upsidePct >= 10;

  let status: AgentDecision['status'] = 'OK';
  let direction: AgentDecision['direction'] = 'hold';
  let rawTarget = house.currentPrice;
  let primaryTriggerRule = 'Market In Harmony';
  let headline = `${house.nickname} Is Well-Positioned for Your Neighborhood`;
  let reasoning = '';
  let neighborGapAnalysis = '';

  if (house.isBooked || nights === 0) {
    status = 'OK';
    direction = 'hold';
    rawTarget = Math.max(effectiveFloor, house.currentPrice);
    primaryTriggerRule = 'Calendar Booked · No Orphan Nights';
    headline = `Mazel Tov — ${house.nickname} Has Zero Empty Gap Nights`;
    reasoning = `Breathe easy, ${house.propertyManagerName}! ${house.nickname} is fully booked for this window. Neighbor median sits at $${summary.medianCompPrice}/night — keep your floor at $${effectiveFloor}/night and enjoy the occupancy.`;
    neighborGapAnalysis = `${summary.bookedComps} of ${summary.totalComps} nearby comps are also booked, with neighborhood rates ranging $${summary.lowerRangePrice}–$${summary.upperRangePrice}/night.`;
  } else if (isNeighborUndercutting || hasUrgentOrphanGap) {
    // Match or slightly beat cheapest vacant neighbor, clamped strictly to effectiveFloor
    const competitiveTarget = Math.min(summary.cheapestNeighborPrice, summary.avgVacantPrice);
    rawTarget = Math.max(effectiveFloor, competitiveTarget);

    if (rawTarget < house.currentPrice) {
      status = 'ALERT';
      direction = 'drop';
      primaryTriggerRule =
        isNeighborUndercutting && hasUrgentOrphanGap
          ? `Neighbor Undercutting & ${nights}-Night Orphan Gap`
          : isNeighborUndercutting
            ? 'Direct Neighbor Undercut Threshold'
            : `${nights}-Night Orphan Gap Watch`;
      headline = summary.cheapestNeighborVerified
        ? `${nights} Empty Nights at ${house.nickname} · Verified Comp Is $${house.currentPrice - summary.cheapestNeighborPrice}/nt Cheaper`
        : `${nights} Empty Nights at ${house.nickname} · Above $${summary.cheapestNeighborPrice}/nt Submarket Estimate`;
      reasoning = summary.cheapestNeighborVerified
        ? `Oy vey, ${house.propertyManagerName}! Leaving ${nights} nights empty at ${house.nickname} (${house.unbookedStartDate.slice(5)} to ${house.unbookedEndDate.slice(5)}) puts $${house.currentPrice * nights} of gross room revenue at risk. Verified comp (${summary.cheapestNeighborName}) is listed at $${summary.cheapestNeighborPrice}/night while you're asking $${house.currentPrice}. Adjust to $${rawTarget}/night${rawTarget === effectiveFloor ? ' (your safety floor)' : ''} or activate a promotion badge!`
        : `Heads up: ${house.nickname} has ${nights} empty nights (${house.unbookedStartDate.slice(5)} to ${house.unbookedEndDate.slice(5)}, $${house.currentPrice * nights} gross window). Based on our initial ${house.neighborhood} ${house.bedrooms}BR statistical baseline ($${summary.lowerRangePrice}–$${summary.upperRangePrice}/nt), your $${house.currentPrice}/nt rate sits above the $${summary.cheapestNeighborPrice}/nt lower quartile. Click "Open Airbnb Map" below to log 2–3 real neighbor prices on your street and lock in verified proof!`;
      neighborGapAnalysis = summary.cheapestNeighborVerified
        ? `${summary.undercuttingCompsCount} of ${summary.vacantComps} verified vacant comps are undercutting your $${house.currentPrice}/nt rate (cheapest: $${summary.cheapestNeighborPrice}/nt at ${summary.cheapestNeighborName}).`
        : `Using unverified ${house.neighborhood} ${house.bedrooms}BR statistical estimate ($${summary.lowerRangePrice} P25 / $${summary.medianCompPrice} median / $${summary.upperRangePrice} P75). Log real street listings below to replace estimates with verified proof.`;
    } else {
      // Already at or below floor price!
      status = 'OK';
      direction = 'hold';
      rawTarget = Math.max(effectiveFloor, house.currentPrice);
      primaryTriggerRule = 'Host Safety Floor Guardrail Active';
      headline = `Holding at Safety Floor ($${effectiveFloor}/nt) for ${house.nickname}`;
      reasoning = `Listen to Moisha: a neighbor is asking $${summary.cheapestNeighborPrice}/night, but dropping below your $${effectiveFloor}/night safety floor means working for free after cleaning and mortgage! Hold at $${rawTarget}/night and relax minimum-stay rules instead.`;
      neighborGapAnalysis = `Cheapest neighbor (${summary.cheapestNeighborName}) is at $${summary.cheapestNeighborPrice}/nt, below your $${effectiveFloor}/nt guardrail.`;
    }
  } else if (hasRevenueUpside) {
    rawTarget = Math.max(effectiveFloor, benchmarkHigh);
    status = 'UPSIDE';
    direction = 'raise';
    primaryTriggerRule = 'Neighborhood Demand Upside';
    headline = `Underpriced by $${rawTarget - house.currentPrice}/nt — Capture Higher Neighborhood Rates`;
    reasoning = `Listen to Uncle Moisha: don't leave good gelt on the table at ${house.nickname}! Comparable listings in ${house.neighborhood} average $${benchmarkHigh}/night (${summary.bookedComps}/${summary.totalComps} already booked), while you're only asking $${house.currentPrice}/night. Raising to $${rawTarget}/night captures +$${(rawTarget - house.currentPrice) * nights} across these ${nights} nights while staying competitive!`;
    neighborGapAnalysis = `Neighborhood range is $${summary.lowerRangePrice}–$${summary.upperRangePrice}/nt (median $${summary.medianCompPrice}/nt). Even vacant comps are asking $${summary.avgVacantPrice}/nt.`;
  } else {
    rawTarget = Math.max(effectiveFloor, house.currentPrice);
    status = 'OK';
    direction = 'hold';
    primaryTriggerRule = 'Competitive Neighborhood Alignment';
    headline = `${house.nickname} Is Competitive at $${rawTarget}/night`;
    reasoning = `Shalom ${house.propertyManagerName}! At $${house.currentPrice}/night, ${house.nickname} sits right in the sweet spot for ${house.neighborhood} (vacant neighbor average: $${summary.avgVacantPrice}/nt, safety floor: $${effectiveFloor}/nt). Keep a steady hand — or add a light strikethrough badge if you want extra search visibility.`;
    neighborGapAnalysis = `Tracking ${summary.totalComps} comps (${summary.vacantComps} vacant at $${summary.avgVacantPrice}/nt avg, ${summary.bookedComps} booked).`;
  }

  const recommendedPrice = Math.max(effectiveFloor, Math.round(rawTarget));
  const priceDelta = recommendedPrice - house.currentPrice;
  const percentDelta =
    house.currentPrice > 0 ? Math.round((priceDelta / house.currentPrice) * 100) : 0;

  const probCurrent = estimateBookingProbability(house.currentPrice, summary, nights);
  const probRecommended =
    recommendedPrice === house.currentPrice
      ? probCurrent
      : estimateBookingProbability(recommendedPrice, summary, nights);

  const currentScenario = calculateScenario(
    house,
    'Current Rate',
    house.currentPrice,
    nights,
    probCurrent,
  );
  const recommendedScenario = calculateScenario(
    house,
    'Moisha Target',
    recommendedPrice,
    nights,
    probRecommended,
    currentScenario.expectedNetValue,
  );

  const recommendedPromotions =
    direction === 'raise' || nights === 0
      ? []
      : buildPromotions(house, rules, effectiveFloor, summary.cheapestNeighborPrice);

  const recommendedActions: string[] = [];
  if (direction === 'drop') {
    recommendedActions.push(
      `Lower nightly rate from $${house.currentPrice} to $${recommendedPrice}/night for ${house.unbookedStartDate} → ${house.unbookedEndDate}.`,
    );
    if (recommendedPromotions[0]) {
      recommendedActions.push(
        `Or keep base price and activate "${recommendedPromotions[0].badge}" ($${recommendedPromotions[0].effectivePrice}/nt effective) for the Airbnb search boost.`,
      );
    }
    recommendedActions.push(
      `Allow 2-night minimum stays during this ${nights}-night window to capture weekend & business travelers.`,
    );
  } else if (direction === 'raise') {
    recommendedActions.push(
      `Increase nightly rate from $${house.currentPrice} to $${recommendedPrice}/night (+${percentDelta}%) to match ${house.neighborhood} demand.`,
    );
    recommendedActions.push(
      `Hold your ${Math.min(3, Math.max(2, nights - 1))}-night minimum stay first before offering any discounts.`,
    );
    recommendedActions.push(
      `Re-check ${summary.totalComps} neighborhood comps 72 hours before check-in (${house.unbookedStartDate}).`,
    );
  } else {
    recommendedActions.push(
      `Maintain current $${recommendedPrice}/night rate — aligned with ${house.neighborhood} comps ($${summary.lowerRangePrice}–$${summary.upperRangePrice}/nt).`,
    );
    if (nights > 0 && recommendedPromotions[0]) {
      recommendedActions.push(
        `Optional: enable "${recommendedPromotions[0].badge}" if unbooked 48 hours prior to ${house.unbookedStartDate}.`,
      );
    }
    recommendedActions.push(
      `Safety floor guardrail locked at $${effectiveFloor}/night for ${house.propertyManagerName}.`,
    );
  }

  const confidenceScore = Math.min(
    97,
    Math.max(72, 76 + summary.totalComps * 4 + (nights > 0 ? 5 : 0)),
  );

  return {
    status,
    direction,
    recommendedPrice,
    effectiveFloorPrice: effectiveFloor,
    priceDelta,
    percentDelta,
    confidenceScore,
    primaryTriggerRule,
    headline,
    reasoning,
    neighborGapAnalysis,
    recommendedPromotions,
    competitorSummary: summary,
    revenueProjection: {
      atRiskGross: house.currentPrice * nights,
      currentScenario,
      recommendedScenario,
      expectedValueGain: recommendedScenario.deltaExpectedVsCurrent,
    },
    recommendedActions,
    projectedBookingProbability: {
      atCurrentPrice: probCurrent,
      atRecommendedPrice: probRecommended,
    },
    source: 'deterministic',
    timestamp: timeLabel,
  };
}

export function generateLocalChatReply(
  house: PropertyHouse,
  userMessage: string,
  decision: AgentDecision,
): { text: string; action?: ChatSuggestedAction } {
  const q = userMessage.toLowerCase();
  const topPromo = decision.recommendedPromotions[0];
  const { currentScenario, recommendedScenario } = decision.revenueProjection;

  if (q.includes('promo') || q.includes('badge') || q.includes('strikethrough')) {
    if (topPromo) {
      return {
        text: `Listen to Uncle Moisha: an Airbnb promotion badge is a *mechaye* for search visibility! Instead of permanently cutting ${house.nickname}'s $${house.currentPrice} base rate, "${topPromo.badge}" shows guests a crossed-out $${house.currentPrice} → **$${topPromo.effectivePrice}/night** and boosts you in ${house.zipCode} search rankings while respecting your $${decision.effectiveFloorPrice} floor.`,
        action: {
          type: 'run_promo',
          value: topPromo.effectivePrice,
          label: `Activate ${topPromo.badge} ($${topPromo.effectivePrice}/nt)`,
        },
      };
    }
    return {
      text: `Right now at ${house.nickname}, you don't need a discount badge! Neighborhood median is $${decision.competitorSummary.medianCompPrice}/nt vs your $${house.currentPrice}/nt. Hold your margin strong!`,
      action:
        decision.direction !== 'hold'
          ? {
              type: 'set_price',
              value: decision.recommendedPrice,
              label: `Set rate to $${decision.recommendedPrice}/nt`,
            }
          : undefined,
    };
  }

  if (
    q.includes('profit') ||
    q.includes('clean') ||
    q.includes('floor') ||
    q.includes('margin') ||
    q.includes('expense')
  ) {
    return {
      text: `Let's do the real arithmetic on ${house.nickname}, ${house.propertyManagerName}: across ${house.unbookedDaysCount} nights, you collect $${house.cleaningFee} cleaning fee against $${house.cleaningCost} cleaner cost, pay ${house.hostServiceFeePercent}% Airbnb host fee, and carry $${house.nightlyFixedCost}/nt in fixed costs. At **$${decision.recommendedPrice}/nt**, a booked stay nets **$${recommendedScenario.netProfitIfBooked}** (${decision.projectedBookingProbability.atRecommendedPrice}% booking odds → **$${recommendedScenario.expectedNetValue}** expected value vs $${currentScenario.expectedNetValue} today). And we *never* touch a penny below your $${decision.effectiveFloorPrice}/nt floor!`,
      action:
        decision.recommendedPrice !== house.currentPrice
          ? {
              type: 'set_price',
              value: decision.recommendedPrice,
              label: `Apply $${decision.recommendedPrice}/nt target`,
            }
          : undefined,
    };
  }

  if (q.includes('neighbor') || q.includes('comp') || q.includes('cheaper') || q.includes('market')) {
    return {
      text: `Here's the neighborhood picture around ${house.address}: we're watching ${decision.competitorSummary.totalComps} comps (${decision.competitorSummary.vacantComps} vacant, ${decision.competitorSummary.bookedComps} booked). Rates span **$${decision.competitorSummary.lowerRangePrice}–$${decision.competitorSummary.upperRangePrice}/nt**, with cheapest vacant neighbor (${decision.competitorSummary.cheapestNeighborName}) at **$${decision.competitorSummary.cheapestNeighborPrice}/nt**. ${
        decision.direction === 'drop'
          ? `At $${house.currentPrice}/nt, shoppers book them first — move to $${decision.recommendedPrice}/nt to win the block.`
          : decision.direction === 'raise'
            ? `You're priced below the neighborhood! Step up to $${decision.recommendedPrice}/nt.`
            : `Your $${house.currentPrice}/nt rate is right on target.`
      }`,
      action:
        decision.recommendedPrice !== house.currentPrice
          ? {
              type: 'set_price',
              value: decision.recommendedPrice,
              label: `${decision.direction === 'raise' ? 'Raise' : 'Drop'} rate to $${decision.recommendedPrice}/nt`,
            }
          : undefined,
    };
  }

  // Default tailored counsel
  if (decision.direction === 'raise') {
    return {
      text: `Listen to your Moisha: ${house.nickname} in ${house.neighborhood} is a gem, and at $${house.currentPrice}/night you're pricing it like day-old challah! Neighbors average $${decision.competitorSummary.medianCompPrice}/night with ${decision.competitorSummary.bookedComps} already booked. Raise your rate to **$${decision.recommendedPrice}/night** for an extra **+$${(decision.recommendedPrice - house.currentPrice) * house.unbookedDaysCount}** gross on this ${house.unbookedDaysCount}-night window.`,
      action: {
        type: 'set_price',
        value: decision.recommendedPrice,
        label: `Raise rate to $${decision.recommendedPrice}/nt`,
      },
    };
  }

  if (decision.direction === 'drop') {
    return {
      text: `Oy, ${house.propertyManagerName}, don't let ${house.unbookedDaysCount} nights sit empty like a cold latke! At $${house.currentPrice}/nt, ${house.nickname} is $${house.currentPrice - decision.competitorSummary.cheapestNeighborPrice}/nt pricier than ${decision.competitorSummary.cheapestNeighborName} ($${decision.competitorSummary.cheapestNeighborPrice}/nt). Moving to **$${decision.recommendedPrice}/nt** jumps booking odds from ${decision.projectedBookingProbability.atCurrentPrice}% to **${decision.projectedBookingProbability.atRecommendedPrice}%** and boosts expected net payout by **+$${Math.max(0, decision.revenueProjection.expectedValueGain)}**.`,
      action: {
        type: 'set_price',
        value: decision.recommendedPrice,
        label: `Drop rate to $${decision.recommendedPrice}/nt`,
      },
    };
  }

  return {
    text: `Everything at ${house.nickname} ($${house.currentPrice}/nt) is in steady shape! Your safety floor is $${decision.effectiveFloorPrice}/nt and nearby comps run $${decision.competitorSummary.lowerRangePrice}–$${decision.competitorSummary.upperRangePrice}/nt. Ask me about promotions, cleaning margins, or neighbor comps anytime.`,
    action: topPromo
      ? {
          type: 'run_promo',
          value: topPromo.effectivePrice,
          label: `Optional: ${topPromo.badge}`,
        }
      : undefined,
  };
}

export function buildFallbackMarketGrounding(
  house: PropertyHouse,
  decision: AgentDecision,
  scannedAt?: string,
): LiveMarketScanResult {
  const { lowerRangePrice, upperRangePrice, medianCompPrice, bookedComps, totalComps } =
    decision.competitorSummary;
  const wkMin = Math.max(house.floorPrice, lowerRangePrice);
  const wkMax = Math.max(wkMin + 20, medianCompPrice);
  const wkndMin = Math.round(medianCompPrice * 1.08);
  const wkndMax = Math.max(wkndMin + 25, Math.round(upperRangePrice * 1.15));

  return {
    summary: `Neighborhood baseline for ${house.address} (${house.neighborhood}, ZIP ${house.zipCode}): ${house.bedrooms}-bedroom short-term rentals currently cluster around $${medianCompPrice}/night median (${bookedComps} of ${totalComps} tracked neighbors booked). Listings with ${house.unbookedDaysCount || 3}+ unbooked nights inside a 7-day lead window convert fastest when priced near $${decision.recommendedPrice}/night or paired with a 15% strikethrough badge.`,
    weekdayRange: `$${wkMin} – $${wkMax}/nt`,
    weekendRange: `$${wkndMin} – $${wkndMax}/nt`,
    sources: [
      {
        title: `Airbnb Search · ${house.neighborhood} (${house.zipCode})`,
        uri: `https://www.airbnb.com/s/${encodeURIComponent(`${house.neighborhood} ${house.zipCode}`)}`,
      },
      {
        title: 'Inside Airbnb · Open Short-Term Rental Market Data',
        uri: 'https://insideairbnb.com/explore/',
      },
      {
        title: 'AirDNA · Market Rentalizer & Neighborhood ADR Trends',
        uri: 'https://www.airdna.co',
      },
    ],
    scannedAt:
      scannedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isLiveGrounded: false,
  };
}
