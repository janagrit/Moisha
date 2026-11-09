import { z } from 'zod';

// Stops zod from testing for eval, which the site's security policy forbids.
z.config({ jitless: true });

const figureSchema = z.union([
  z.object({
    provenance: z.enum(['verified-public', 'user-entered', 'estimate']),
    value: z.number(),
    unit: z.enum(['usd', 'pct', 'nights', 'count']),
    asOf: z.string(),
    source: z.string(),
    sampleSize: z.number().optional(),
    stale: z.boolean().optional(),
    caveat: z.string().optional(),
  }),
  z.object({
    provenance: z.literal('unavailable'),
    reason: z.enum([
      'no-comps',
      'too-few-comps',
      'all-stale',
      'no-baseline',
      'no-minimum-set',
      'no-current-price',
      'no-calendar',
      'no-open-nights',
      'no-booked-nights',
    ]),
  }),
]);

const dateRangeSchema = z.object({ start: z.string(), end: z.string() });

const propertySchema = z.object({
  id: z.string(),
  nickname: z.string(),
  address: z.string(),
  bedrooms: z.number(),
  baselineNeighbourhoodId: z.string().optional(),
  rules: z.object({
    minPriceUsd: z.number().nullable(),
    positioningPct: z.number(),
    maxStepPct: z.number(),
  }),
  currentPrice: z.object({ weekday: z.number().nullable(), weekend: z.number().nullable() }),
  priceUpdatedOn: z.string().optional(),
  booked: z.array(dateRangeSchema),
  blocked: z.array(dateRangeSchema),
  calendarUpdatedOn: z.string().optional(),
  costs: z.object({
    cleaningPerStayUsd: z.number(),
    avgStayNights: z.number(),
    utilitiesMonthlyUsd: z.number(),
    maintenanceMonthlyUsd: z.number(),
    mortgageOrFixedMonthlyUsd: z.number(),
    platformFeePct: z.number(),
  }),
  createdAt: z.string(),
});

const compSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  label: z.string(),
  bedrooms: z.number(),
  priceUsd: z.number(),
  appliesTo: z.enum(['weekday', 'weekend', 'any']),
  availability: z.enum(['vacant', 'booked', 'unknown']),
  enteredOn: z.string(),
  priceHistory: z.array(z.object({ priceUsd: z.number(), enteredOn: z.string() })),
});

const recommendationRecordSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  createdAt: z.string(),
  targetDate: z.string(),
  priceUsd: z.number(),
  currentUsd: z.number().nullable(),
  basis: z.enum(['comps', 'baseline', 'comps+baseline']),
  confidence: z.enum(['high', 'medium', 'low']),
  status: z.enum(['pending', 'accepted', 'declined']),
});

const decisionRecordSchema = z.object({
  id: z.string(),
  recommendationId: z.string().nullable(),
  propertyId: z.string(),
  decidedAt: z.string(),
  decision: z.enum(['accepted', 'declined']),
  outcome: z.string().nullable(),
  outcomeRecordedAt: z.string().nullable(),
});

export const FLOW_IDS = ['setup', 'add-comp', 'update-comp', 'update-price', 'set-minimum', 'expenses', 'dates'] as const;
const flowIdSchema = z.enum(FLOW_IDS);

const chipActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('answer'), value: z.string() }),
  z.object({ type: z.literal('flow'), flow: flowIdSchema }),
  z.object({ type: z.literal('show'), view: z.enum(['price', 'comps', 'gaps', 'memory', 'menu', 'more', 'properties']) }),
  z.object({ type: z.literal('select-property'), id: z.string() }),
  z.object({ type: z.literal('cancel-flow') }),
  z.object({ type: z.literal('backup') }),
  z.object({ type: z.literal('restore') }),
  z.object({ type: z.literal('import-confirm') }),
  z.object({ type: z.literal('import-cancel') }),
  z.object({ type: z.literal('undo-import') }),
  z.object({ type: z.literal('start-sample') }),
  z.object({ type: z.literal('exit-sample') }),
  z.object({ type: z.literal('reset-ask') }),
  z.object({ type: z.literal('reset-confirm') }),
]);

const chipSchema = z.object({ label: z.string(), action: chipActionSchema });

const cardRowSchema = z.object({ label: z.string(), note: z.string().optional(), figure: figureSchema.optional(), text: z.string().optional() });

const chatCardSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('price'),
    propertyName: z.string(),
    nightLabel: z.string(),
    recommended: figureSchema,
    recommendedNote: z.string().optional(),
    rows: z.array(cardRowSchema),
    matchCheapest: figureSchema.optional(),
    notes: z.array(z.string()),
  }),
  z.object({ type: z.literal('comps'), propertyName: z.string(), rows: z.array(cardRowSchema), notes: z.array(z.string()) }),
  z.object({
    type: z.literal('gaps'),
    propertyName: z.string(),
    rows: z.array(cardRowSchema),
    atMost: figureSchema.optional(),
    notes: z.array(z.string()),
  }),
  z.object({ type: z.literal('memory'), rows: z.array(cardRowSchema), notes: z.array(z.string()) }),
]);

const messageSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  author: z.enum(['moisha', 'host']),
  text: z.string(),
  card: chatCardSchema.optional(),
  chips: z.array(chipSchema).optional(),
});

const activeFlowSchema = z.object({
  id: flowIdSchema,
  step: z.number(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});

export const memorySchema = z.object({
  schemaVersion: z.literal(1),
  preferences: z.object({
    hostName: z.string().nullable(),
    managerName: z.string().nullable(),
    soundOn: z.boolean(),
    horizonDays: z.number(),
  }),
  selectedPropertyId: z.string().nullable(),
  properties: z.array(propertySchema),
  comps: z.array(compSchema),
  recommendations: z.array(recommendationRecordSchema),
  decisions: z.array(decisionRecordSchema),
  messages: z.array(messageSchema),
  activeFlow: activeFlowSchema.nullable(),
  nextId: z.number(),
  lastGreetingOn: z.string().nullable(),
  lastBackupAt: z.string().nullable(),
  updatedAt: z.string(),
});

export type Memory = z.infer<typeof memorySchema>;
export type ChatMessage = z.infer<typeof messageSchema>;
export type ChatCard = z.infer<typeof chatCardSchema>;
export type CardRow = z.infer<typeof cardRowSchema>;
export type Chip = z.infer<typeof chipSchema>;
export type ChipAction = z.infer<typeof chipActionSchema>;
export type FlowId = (typeof FLOW_IDS)[number];
export type ActiveFlow = z.infer<typeof activeFlowSchema>;
export type RecommendationRecord = z.infer<typeof recommendationRecordSchema>;

export const CURRENT_SCHEMA_VERSION = 1;
export const MESSAGE_CAP = 1000;
export const RECOMMENDATION_CAP = 300;

export function createEmptyMemory(now: Date): Memory {
  return {
    schemaVersion: 1,
    preferences: { hostName: null, managerName: null, soundOn: false, horizonDays: 30 },
    selectedPropertyId: null,
    properties: [],
    comps: [],
    recommendations: [],
    decisions: [],
    messages: [],
    activeFlow: null,
    nextId: 1,
    lastGreetingOn: null,
    lastBackupAt: null,
    updatedAt: now.toISOString(),
  };
}
