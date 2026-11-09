import { DEFAULT_RULES, EMPTY_COSTS } from '../domain/config';
import { formatUsd } from '../domain/provenance';
import type { CostInputs, DateRange, Property } from '../domain/types';
import type { FlowId, Memory } from '../memory/schema';
import { mainChips, nameOf, newId, say, selectedProperty, todayOf, updateProperty, type Ctx } from './helpers';
import { parseDate, parseMoney, parseWhole } from './parse';

export type Answer = string | number | null;
export type Answers = Record<string, Answer>;

type Parsed = { ok: true; value: Answer } | { ok: false; error: string };

export interface FlowStep {
  key: string;
  input: 'text' | 'number' | 'date';
  placeholder?: string;
  skip?: (mem: Memory, answers: Answers) => boolean;
  ask: (mem: Memory, answers: Answers) => string;
  chips?: (mem: Memory, answers: Answers) => { label: string; value: string }[];
  parse: (raw: string, mem: Memory, ctx: Ctx, answers: Answers) => Parsed;
}

export interface FlowDef {
  needsProperty: boolean;
  steps: FlowStep[];
  complete: (mem: Memory, answers: Answers, ctx: Ctx) => Memory;
}

const NEED_NUMBER = 'Nu, I need a number. Something like 215.';
const KEEP = '__keep__';

const money = (raw: string): Parsed => {
  const value = parseMoney(raw);
  return value === null ? { ok: false, error: NEED_NUMBER } : { ok: true, value };
};

const moneyOrKeep = (raw: string): Parsed => {
  if (raw === KEEP) return { ok: true, value: null };
  const value = parseMoney(raw, { allowZero: true });
  return value === null ? { ok: false, error: NEED_NUMBER } : { ok: true, value };
};

const text = (raw: string, what: string, max = 80): Parsed => {
  const value = raw.trim().slice(0, max);
  return value ? { ok: true, value } : { ok: false, error: `I need ${what}.` };
};

function oneOf(raw: string, options: Record<string, RegExp>, error: string): Parsed {
  const input = raw.trim().toLowerCase();
  const found = Object.entries(options).find(([key, pattern]) => input === key || pattern.test(input));
  return found ? { ok: true, value: found[0] } : { ok: false, error };
}

const BEDROOM_CHIPS = ['1', '2', '3', '4', '5'].map((v) => ({ label: v, value: v }));
const bedrooms = (raw: string): Parsed => {
  const value = parseWhole(raw, 0, 20);
  return value === null ? { ok: false, error: 'How many bedrooms? Just the number.' } : { ok: true, value };
};

const numberOf = (answer: Answer): number => answer as number;

function keepLabel(field: keyof CostInputs, current: number): string {
  if (field === 'avgStayNights') return `Keep ${current}`;
  if (field === 'platformFeePct') return `Keep ${current}%`;
  return `Keep ${formatUsd(current)}`;
}

const costStep = (field: keyof CostInputs, question: string): FlowStep => ({
  key: field,
  input: 'number',
  placeholder: '0',
  ask: () => question,
  chips: (mem) => [{ label: keepLabel(field, selectedProperty(mem)?.costs[field] ?? 0), value: KEEP }],
  parse: moneyOrKeep,
});

const FLOWS: Record<FlowId, FlowDef> = {
  setup: {
    needsProperty: false,
    steps: [
      {
        key: 'hostName',
        input: 'text',
        placeholder: 'Your name',
        skip: (mem) => mem.preferences.hostName !== null,
        ask: () => 'First things first. What should I call you?',
        parse: (raw) => text(raw, 'something to call you', 40),
      },
      {
        key: 'nickname',
        input: 'text',
        placeholder: 'e.g. The Rowhouse',
        ask: (mem, a) => `Good to meet you, ${a.hostName ?? nameOf(mem)}. What do you call this place?`,
        parse: (raw) => text(raw, 'a name for the place', 40),
      },
      {
        key: 'address',
        input: 'text',
        placeholder: 'Address or ZIP',
        ask: () => 'Where is it? An address or just the ZIP. It stays on this phone.',
        chips: () => [{ label: 'Skip', value: KEEP }],
        parse: (raw) => (raw === KEEP ? { ok: true, value: '' } : text(raw, 'an address or ZIP', 120)),
      },
      {
        key: 'bedrooms',
        input: 'number',
        ask: () => 'How many bedrooms?',
        chips: () => BEDROOM_CHIPS,
        parse: bedrooms,
      },
      {
        key: 'weekday',
        input: 'number',
        placeholder: '$ per night',
        ask: () => 'What are you charging on a regular weeknight?',
        parse: money,
      },
      {
        key: 'weekend',
        input: 'number',
        placeholder: '$ per night',
        ask: () => 'And Friday and Saturday nights?',
        chips: () => [{ label: 'Same as weeknights', value: KEEP }],
        parse: (raw) => (raw === KEEP ? { ok: true, value: null } : money(raw)),
      },
      {
        key: 'minimum',
        input: 'number',
        placeholder: '$ per night',
        ask: () => "Now the important one. What's the lowest you'd ever accept for a night? I guard this number like it's my own.",
        parse: money,
      },
    ],
    complete: (mem, a, ctx) => {
      const today = todayOf(ctx);
      const [id, withId] = newId(mem, 'p');
      const next: Memory = {
        ...withId,
        preferences: { ...withId.preferences, hostName: (a.hostName as string | undefined) ?? withId.preferences.hostName },
        selectedPropertyId: id,
        properties: [
          ...withId.properties,
          {
            id,
            nickname: a.nickname as string,
            address: a.address as string,
            bedrooms: numberOf(a.bedrooms),
            rules: { ...DEFAULT_RULES, minPriceUsd: numberOf(a.minimum) },
            currentPrice: { weekday: numberOf(a.weekday), weekend: a.weekend === null ? null : numberOf(a.weekend) },
            priceUpdatedOn: today,
            booked: [],
            blocked: [],
            costs: EMPTY_COSTS,
            createdAt: ctx.now.toISOString(),
          },
        ],
      };
      const menu = mainChips(next);
      return say(
        next,
        ctx,
        `Mazel tov, ${nameOf(next)}! ${a.nickname as string} is in the book. Now I need the neighbors. Give me 2 nearby prices and I can start talking numbers. Without them I'd be making it up, and I don't make things up.`,
        { chips: [{ label: 'Add a neighbor', action: { type: 'flow', flow: 'add-comp' } }, menu[0], menu[2], menu[3]] },
      );
    },
  },

  'add-comp': {
    needsProperty: true,
    steps: [
      {
        key: 'label',
        input: 'text',
        placeholder: 'e.g. Blue door on 8th',
        ask: () => 'Which neighbor? Give them a name you will recognize.',
        parse: (raw) => text(raw, 'a name for the neighbor'),
      },
      {
        key: 'bedrooms',
        input: 'number',
        ask: () => 'How many bedrooms do they have?',
        chips: (mem) => {
          const mine = selectedProperty(mem)?.bedrooms ?? 1;
          return [{ label: `Same as mine (${mine})`, value: String(mine) }, ...BEDROOM_CHIPS.filter((c) => c.value !== String(mine))];
        },
        parse: bedrooms,
      },
      {
        key: 'price',
        input: 'number',
        placeholder: '$ per night',
        ask: () => 'What are they asking per night? Look at their listing, not your memory.',
        parse: money,
      },
      {
        key: 'appliesTo',
        input: 'text',
        ask: () => 'Is that price for weeknights, weekends, or all nights?',
        chips: () => [
          { label: 'All nights', value: 'any' },
          { label: 'Weeknights', value: 'weekday' },
          { label: 'Weekends', value: 'weekend' },
        ],
        parse: (raw) => oneOf(raw, { any: /all|any|every/, weekday: /week ?night|week ?day/, weekend: /week ?end|fri|sat/ }, 'Weeknights, weekends, or all nights?'),
      },
      {
        key: 'availability',
        input: 'text',
        ask: () => 'Are they open or booked for the night you checked?',
        chips: () => [
          { label: 'Open', value: 'vacant' },
          { label: 'Booked', value: 'booked' },
          { label: 'Not sure', value: 'unknown' },
        ],
        parse: (raw) => oneOf(raw, { vacant: /open|vacant|free|empty/, booked: /book|taken|full/, unknown: /sure|know|unknown/ }, 'Open, booked, or not sure?'),
      },
    ],
    complete: (mem, a, ctx) => {
      const property = selectedProperty(mem)!;
      const [id, withId] = newId(mem, 'c');
      const next: Memory = {
        ...withId,
        comps: [
          ...withId.comps,
          {
            id,
            propertyId: property.id,
            label: a.label as string,
            bedrooms: numberOf(a.bedrooms),
            priceUsd: numberOf(a.price),
            appliesTo: a.appliesTo as 'any' | 'weekday' | 'weekend',
            availability: a.availability as 'vacant' | 'booked' | 'unknown',
            enteredOn: todayOf(ctx),
            priceHistory: [],
          },
        ],
      };
      return say(next, ctx, `Filed. ${a.label as string} at ${formatUsd(numberOf(a.price))}. I'll remember it, and I'll tell you when it gets old.`, {
        chips: [{ label: 'Add another', action: { type: 'flow', flow: 'add-comp' } }, ...mainChips(next)],
      });
    },
  },

  'update-comp': {
    needsProperty: true,
    steps: [
      {
        key: 'comp',
        input: 'text',
        placeholder: 'Neighbor name',
        ask: () => 'Which neighbor changed?',
        chips: (mem) =>
          mem.comps.filter((c) => c.propertyId === selectedProperty(mem)?.id).map((c) => ({ label: c.label, value: c.id })),
        parse: (raw, mem) => {
          const input = raw.trim().toLowerCase();
          const found = mem.comps.find((c) => c.id === raw || c.label.toLowerCase() === input);
          return found ? { ok: true, value: found.id } : { ok: false, error: "I don't have a neighbor by that name. Tap one of these." };
        },
      },
      {
        key: 'price',
        input: 'number',
        placeholder: '$ per night',
        ask: (mem, a) => {
          const comp = mem.comps.find((c) => c.id === a.comp);
          return `I have ${comp?.label} at ${formatUsd(comp?.priceUsd ?? 0)}. What are they asking now?`;
        },
        parse: money,
      },
    ],
    complete: (mem, a, ctx) => {
      const today = todayOf(ctx);
      const comp = mem.comps.find((c) => c.id === a.comp)!;
      const newPrice = numberOf(a.price);
      const changed = newPrice !== comp.priceUsd;
      const next: Memory = {
        ...mem,
        comps: mem.comps.map((c) =>
          c.id === comp.id
            ? {
                ...c,
                priceUsd: newPrice,
                enteredOn: today,
                priceHistory: changed ? [...c.priceHistory, { priceUsd: c.priceUsd, enteredOn: c.enteredOn }] : c.priceHistory,
              }
            : c,
        ),
      };
      const diff = newPrice - comp.priceUsd;
      const message = !changed
        ? `Still ${formatUsd(newPrice)}. Good, now I know it's current.`
        : diff < 0
          ? `Hey, ${nameOf(next)}! ${comp.label} just dropped ${formatUsd(-diff)}, from ${formatUsd(comp.priceUsd)} to ${formatUsd(newPrice)}. Nu, should we take a look?`
          : `${comp.label} went up ${formatUsd(diff)}, to ${formatUsd(newPrice)}. Interesting. Let's see if that's room for you too.`;
      return say(next, ctx, message, { chips: mainChips(next) });
    },
  },

  'update-price': {
    needsProperty: true,
    steps: [
      {
        key: 'weekday',
        input: 'number',
        placeholder: '$ per night',
        ask: (mem) => `What's your weeknight price at ${selectedProperty(mem)?.nickname} now?`,
        parse: money,
      },
      {
        key: 'weekend',
        input: 'number',
        placeholder: '$ per night',
        ask: () => 'And Friday and Saturday?',
        chips: () => [{ label: 'Same as weeknights', value: KEEP }],
        parse: (raw) => (raw === KEEP ? { ok: true, value: null } : money(raw)),
      },
    ],
    complete: (mem, a, ctx) => {
      const property = selectedProperty(mem)!;
      const next = updateProperty(mem, property.id, {
        currentPrice: { weekday: numberOf(a.weekday), weekend: a.weekend === null ? null : numberOf(a.weekend) },
        priceUpdatedOn: todayOf(ctx),
      });
      const floor = property.rules.minPriceUsd;
      const warning = floor !== null && numberOf(a.weekday) < floor ? ` Gevalt! That's under your ${formatUsd(floor)} minimum. Did you mean it?` : '';
      return say(next, ctx, `Written down: ${formatUsd(numberOf(a.weekday))} on weeknights. This only updates my notes. Your Airbnb listing is yours to change.${warning}`, {
        chips: mainChips(next),
      });
    },
  },

  'set-minimum': {
    needsProperty: true,
    steps: [
      {
        key: 'minimum',
        input: 'number',
        placeholder: '$ per night',
        ask: (mem) => {
          const floor = selectedProperty(mem)?.rules.minPriceUsd ?? null;
          return `${floor !== null ? `Your minimum is ${formatUsd(floor)}. ` : ''}What's the lowest you'd accept for a night?`;
        },
        parse: money,
      },
    ],
    complete: (mem, a, ctx) => {
      const property = selectedProperty(mem)!;
      const next = updateProperty(mem, property.id, { rules: { ...property.rules, minPriceUsd: numberOf(a.minimum) } });
      return say(next, ctx, `${formatUsd(numberOf(a.minimum))} it is. Nothing I recommend goes under that.`, { chips: mainChips(next) });
    },
  },

  expenses: {
    needsProperty: true,
    steps: [
      costStep('cleaningPerStayUsd', 'Nu, the money going out. What does cleaning cost per stay?'),
      costStep('avgStayNights', 'How many nights is a typical stay?'),
      costStep('utilitiesMonthlyUsd', 'Utilities per month?'),
      costStep('maintenanceMonthlyUsd', 'Maintenance per month, roughly?'),
      costStep('mortgageOrFixedMonthlyUsd', 'Mortgage or other fixed costs per month?'),
      costStep('platformFeePct', 'What percent does the platform take from you? Check your payout statement.'),
    ],
    complete: (mem, a, ctx) => {
      const property = selectedProperty(mem)!;
      const costs = { ...property.costs };
      for (const key of Object.keys(costs) as (keyof CostInputs)[]) {
        if (a[key] !== null && a[key] !== undefined) costs[key] = numberOf(a[key]);
      }
      const next = updateProperty(mem, property.id, { costs });
      return say(next, ctx, "Filed. Next time we talk money, I'll know what's going out, and you won't have to tell me again.", { chips: mainChips(next) });
    },
  },

  dates: {
    needsProperty: true,
    steps: [
      {
        key: 'kind',
        input: 'text',
        ask: () => 'What are we marking?',
        chips: () => [
          { label: 'Booked nights', value: 'booked' },
          { label: 'Blocked nights', value: 'blocked' },
          { label: 'Nothing booked', value: 'none' },
        ],
        parse: (raw) => oneOf(raw, { booked: /book/, blocked: /block/, none: /nothing|none|empty/ }, 'Booked, blocked, or nothing booked?'),
      },
      {
        key: 'start',
        input: 'date',
        skip: (_mem, a) => a.kind === 'none',
        ask: () => 'First night?',
        parse: (raw, _mem, ctx) => {
          const value = parseDate(raw, todayOf(ctx));
          return value ? { ok: true, value } : { ok: false, error: 'Give me a date like 11/12.' };
        },
      },
      {
        key: 'end',
        input: 'date',
        skip: (_mem, a) => a.kind === 'none',
        ask: () => 'And the checkout date?',
        parse: (raw, _mem, ctx, a) => {
          const value = parseDate(raw, todayOf(ctx));
          if (!value) return { ok: false, error: 'Give me a date like 11/15.' };
          return value > (a.start as string) ? { ok: true, value } : { ok: false, error: 'Checkout has to be after the first night.' };
        },
      },
    ],
    complete: (mem, a, ctx) => {
      const property = selectedProperty(mem)!;
      const today = todayOf(ctx);
      if (a.kind === 'none') {
        const next = updateProperty(mem, property.id, { calendarUpdatedOn: today });
        return say(next, ctx, 'Nothing booked. Noted, and I wish it were otherwise.', { chips: mainChips(next) });
      }
      const range: DateRange = { start: a.start as string, end: a.end as string };
      const patch: Partial<Property> =
        a.kind === 'booked'
          ? { booked: [...property.booked, range], calendarUpdatedOn: today }
          : { blocked: [...property.blocked, range], calendarUpdatedOn: today };
      const next = updateProperty(mem, property.id, patch);
      return say(next, ctx, `Marked as ${a.kind as string}. Anything else on the calendar?`, {
        chips: [
          { label: 'Mark more dates', action: { type: 'flow', flow: 'dates' } },
          { label: 'Empty nights', action: { type: 'show', view: 'gaps' } },
          mainChips(next)[0],
        ],
      });
    },
  },
};

export function flowDef(id: FlowId): FlowDef {
  return FLOWS[id];
}

/** The next step to ask, passing over any that do not apply. */
export function nextStepIndex(def: FlowDef, mem: Memory, answers: Answers, from: number): number {
  let index = from;
  while (index < def.steps.length && def.steps[index].skip?.(mem, answers)) index += 1;
  return index;
}

export function currentStep(mem: Memory): FlowStep | null {
  if (!mem.activeFlow) return null;
  return flowDef(mem.activeFlow.id).steps[mem.activeFlow.step] ?? null;
}
