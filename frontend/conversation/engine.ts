import { diffDays, formatShortDate } from '../domain/dates';
import { currentPriceFor } from '../domain/market';
import type { ImportSummary } from '../memory/exportImport';
import { RECOMMENDATION_CAP, type Chip, type ChipAction, type FlowId, type Memory } from '../memory/schema';
import { buildCompsCard, buildGapsView, buildMemoryCard, buildPriceView, type PriceView } from './cards';
import { currentStep, flowDef, nextStepIndex, type FlowStep, type Answers } from './flows';
import { hostSays, mainChips, moreChips, nameOf, newId, say, selectedProperty, todayOf, type Ctx } from './helpers';

export type Effect = 'backup' | 'pick-file' | 'import-confirm' | 'import-cancel' | 'undo-import' | 'start-sample' | 'exit-sample' | 'reset';

export interface EngineResult {
  memory: Memory;
  effect?: Effect;
}

const NO_PROPERTY = 'First tell me about your property.';

function stepChips(step: FlowStep, mem: Memory, answers: Answers): Chip[] {
  const chips: Chip[] = (step.chips?.(mem, answers) ?? []).map((c) => ({ label: c.label, action: { type: 'answer', value: c.value } }));
  chips.push({ label: 'Never mind', action: { type: 'cancel-flow' } });
  return chips;
}

function askCurrentStep(mem: Memory, ctx: Ctx): Memory {
  const step = currentStep(mem)!;
  const answers = mem.activeFlow!.answers;
  return say(mem, ctx, step.ask(mem, answers), { chips: stepChips(step, mem, answers) });
}

function startFlow(mem: Memory, ctx: Ctx, id: FlowId): Memory {
  const def = flowDef(id);
  if (def.needsProperty && !selectedProperty(mem)) return say(mem, ctx, NO_PROPERTY, { chips: mainChips(mem) });
  const step = nextStepIndex(def, mem, {}, 0);
  return askCurrentStep({ ...mem, activeFlow: { id, step, answers: {} } }, ctx);
}

function answerFlow(mem: Memory, raw: string, ctx: Ctx): Memory {
  const flow = mem.activeFlow!;
  const def = flowDef(flow.id);
  const step = def.steps[flow.step];
  const parsed = step.parse(raw, mem, ctx, flow.answers);
  if (!parsed.ok) return say(mem, ctx, parsed.error, { chips: stepChips(step, mem, flow.answers) });

  const answers = { ...flow.answers, [step.key]: parsed.value };
  const next = nextStepIndex(def, mem, answers, flow.step + 1);
  if (next >= def.steps.length) return def.complete({ ...mem, activeFlow: null }, answers, ctx);
  return askCurrentStep({ ...mem, activeFlow: { ...flow, step: next, answers } }, ctx);
}

function cancelFlow(mem: Memory, ctx: Ctx): Memory {
  const next = { ...mem, activeFlow: null };
  return say(next, ctx, 'No problem. Forget I asked.', { chips: mainChips(next) });
}

function recordRecommendation(mem: Memory, ctx: Ctx, view: PriceView, propertyId: string, currentUsd: number | null): Memory {
  const rec = view.recommendation;
  if (rec.state === 'not-enough-data') return mem;
  const latest = [...mem.recommendations].reverse().find((r) => r.propertyId === propertyId);
  if (latest && latest.targetDate === rec.targetDate && latest.priceUsd === rec.priceUsd) return mem;
  const [id, withId] = newId(mem, 'r');
  return {
    ...withId,
    recommendations: [
      ...withId.recommendations,
      {
        id,
        propertyId,
        createdAt: ctx.now.toISOString(),
        targetDate: rec.targetDate,
        priceUsd: rec.priceUsd,
        currentUsd,
        basis: rec.basis,
        confidence: rec.confidence,
        status: 'pending' as const,
      },
    ].slice(-RECOMMENDATION_CAP),
  };
}

const BACKUP_NUDGE_DAYS = 7;

function backupIsOverdue(mem: Memory, ctx: Ctx): boolean {
  if (ctx.isSample || mem.properties.length === 0) return false;
  const reference = mem.lastBackupAt ?? mem.properties[0].createdAt;
  return diffDays(todayOf(ctx), reference.slice(0, 10)) >= BACKUP_NUDGE_DAYS;
}

function showPrice(mem: Memory, ctx: Ctx, lead = '', tail = '', extraChips: Chip[] = []): Memory {
  const property = selectedProperty(mem);
  if (!property) return say(mem, ctx, NO_PROPERTY, { chips: mainChips(mem) });
  const view = buildPriceView(mem, property, todayOf(ctx));
  const rec = view.recommendation;
  const currentUsd = rec.state === 'not-enough-data' ? null : currentPriceFor(property, rec.dayType);
  const recorded = recordRecommendation(mem, ctx, view, property.id, currentUsd);
  const needsComps = rec.state === 'not-enough-data' && (rec.reason === 'no-comps' || rec.reason === 'too-few-comps');
  const chips: Chip[] = needsComps
    ? [{ label: 'Add a neighbor', action: { type: 'flow', flow: 'add-comp' } }, ...mainChips(recorded).slice(1)]
    : mainChips(recorded);
  return say(recorded, ctx, `${lead}${view.advice}${tail}`, { card: view.card, chips: [...extraChips, ...chips] });
}

function showComps(mem: Memory, ctx: Ctx): Memory {
  const property = selectedProperty(mem);
  if (!property) return say(mem, ctx, NO_PROPERTY, { chips: mainChips(mem) });
  const card = buildCompsCard(mem, property, todayOf(ctx));
  const hasComps = card.type === 'comps' && card.rows.length > 0;
  const chips: Chip[] = [{ label: 'Add a neighbor', action: { type: 'flow', flow: 'add-comp' } }];
  if (hasComps) chips.push({ label: 'A price changed', action: { type: 'flow', flow: 'update-comp' } });
  chips.push(mainChips(mem)[0]);
  return hasComps
    ? say(mem, ctx, "Here's who I'm keeping an eye on. Only as current as the last time you told me.", { card, chips })
    : say(mem, ctx, "No neighbors in the book yet. Who's nearby?", { chips });
}

function showGaps(mem: Memory, ctx: Ctx): Memory {
  const property = selectedProperty(mem);
  if (!property) return say(mem, ctx, NO_PROPERTY, { chips: mainChips(mem) });
  const view = buildGapsView(mem, property, todayOf(ctx));
  const menu = mainChips(mem);
  return say(mem, ctx, view.advice, {
    card: view.card,
    chips: [{ label: 'Mark dates', action: { type: 'flow', flow: 'dates' } }, menu[0], menu[1], menu[3]],
  });
}

function show(mem: Memory, ctx: Ctx, view: Extract<ChipAction, { type: 'show' }>['view']): Memory {
  switch (view) {
    case 'price':
      return showPrice(mem, ctx);
    case 'comps':
      return showComps(mem, ctx);
    case 'gaps':
      return showGaps(mem, ctx);
    case 'memory':
      return say(mem, ctx, "I don't forget. Here's what's in the book.", { card: buildMemoryCard(mem, selectedProperty(mem), ctx.storagePersisted), chips: mainChips(mem) });
    case 'more':
      return say(mem, ctx, 'What else can I do for you?', { chips: [...moreChips(mem, ctx), { label: 'Back', action: { type: 'show', view: 'menu' } }] });
    case 'properties':
      return say(mem, ctx, 'Which one are we talking about?', {
        chips: mem.properties.map((p) => ({ label: p.nickname, action: { type: 'select-property', id: p.id } })),
      });
    case 'menu':
      return say(mem, ctx, 'Nu, what do you need?', { chips: mainChips(mem) });
  }
}

function dayPart(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/New_York' }).format(now));
  if (hour < 12) return 'Good morning';
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** Runs when the app opens: an introduction the first time, then one greeting per day. */
export function openConversation(mem: Memory, ctx: Ctx): Memory {
  if (mem.activeFlow) return mem;
  if (mem.properties.length === 0) {
    if (mem.messages.length > 0) return mem;
    return say(
      mem,
      ctx,
      "Shalom! I'm Moisha. I look after your rental prices the way an uncle looks after the family money: closely, and with opinions. Three things up front. I only know what you tell me, I only check when this app is open, and I never touch your listing. Shall we?",
      { chips: mainChips(mem) },
    );
  }
  const today = todayOf(ctx);
  if (mem.lastGreetingOn === today) return mem;
  const overdue = backupIsOverdue(mem, ctx);
  return showPrice(
    { ...mem, lastGreetingOn: today },
    ctx,
    `${dayPart(ctx.now)}, ${nameOf(mem)}. `,
    overdue ? " One more thing: everything I know lives only on this device, and it's been a while since you backed up." : '',
    overdue ? [{ label: 'Back up or share', action: { type: 'backup' } }] : [],
  );
}

export function handleChip(mem: Memory, chip: Chip, ctx: Ctx): EngineResult {
  const said = hostSays(mem, ctx, chip.label);
  const action = chip.action;
  switch (action.type) {
    case 'answer':
      return { memory: said.activeFlow ? answerFlow(said, action.value, ctx) : said };
    case 'flow':
      return { memory: startFlow(said, ctx, action.flow) };
    case 'show':
      return { memory: show(said, ctx, action.view) };
    case 'select-property':
      return { memory: showPrice({ ...said, selectedPropertyId: action.id }, ctx) };
    case 'cancel-flow':
      return { memory: cancelFlow(said, ctx) };
    case 'backup':
      return { memory: said, effect: 'backup' };
    case 'restore':
      return { memory: said, effect: 'pick-file' };
    case 'import-confirm':
      return { memory: said, effect: 'import-confirm' };
    case 'undo-import':
      return { memory: said, effect: 'undo-import' };
    case 'import-cancel':
      return { memory: say(said, ctx, 'Left everything as it was.', { chips: mainChips(said) }), effect: 'import-cancel' };
    case 'start-sample':
      return { memory: said, effect: 'start-sample' };
    case 'exit-sample':
      return { memory: said, effect: 'exit-sample' };
    case 'reset-ask':
      return {
        memory: say(said, ctx, "Gevalt! That erases everything I've stored on this device: properties, neighbors, our whole history and the saved copy of the app. Backup files you've saved elsewhere stay where they are. If you want this later, back up first. Are you sure?", {
          chips: [
            { label: 'Keep everything', action: { type: 'show', view: 'menu' } },
            { label: 'Back up first', action: { type: 'backup' } },
            { label: 'Yes, erase it all', action: { type: 'reset-confirm' } },
          ],
        }),
      };
    case 'reset-confirm':
      return { memory: said, effect: 'reset' };
  }
}

export function handleText(mem: Memory, raw: string, ctx: Ctx): Memory {
  const text = raw.trim();
  if (!text) return mem;
  const said = hostSays(mem, ctx, text);
  if (said.activeFlow) {
    return /^(cancel|never ?mind|stop)$/i.test(text) ? cancelFlow(said, ctx) : answerFlow(said, text, ctx);
  }
  return say(said, ctx, `I hear you, ${nameOf(said)}, but understanding typed questions is the next stage of my education. For now, tap one of these and I'll do the numbers.`, {
    chips: mainChips(said),
  });
}

export function afterBackup(mem: Memory, ctx: Ctx, outcome: 'shared' | 'downloaded' | 'cancelled' | 'failed'): Memory {
  if (outcome === 'cancelled') return say(mem, ctx, 'No backup made. Your information stays as it is.', { chips: mainChips(mem) });
  if (outcome === 'failed') return say(mem, ctx, "Oy, that didn't work. Your phone wouldn't make the file. Nothing was lost.", { chips: mainChips(mem) });
  const next = { ...mem, lastBackupAt: ctx.now.toISOString() };
  return say(next, ctx, outcome === 'shared' ? 'Encrypted backup handed to your phone. Send it to whoever needs it, and send the passphrase separately.' : 'Encrypted backup file created. Check your downloads.', { chips: mainChips(next) });
}

function countsText(properties: number, comps: number): string {
  return `${properties} ${properties === 1 ? 'property' : 'properties'}, ${comps} ${comps === 1 ? 'neighbor' : 'neighbors'}`;
}

/** Nothing is replaced here. The host sees both sides and has to confirm. */
export function importPreview(mem: Memory, ctx: Ctx, summary: ImportSummary): Memory {
  const date = formatShortDate(summary.exportedAt.slice(0, 10));
  const hasData = mem.properties.length > 0 || mem.comps.length > 0;
  const device = hasData
    ? `This device has ${countsText(mem.properties.length, mem.comps.length)}, and anything added since that backup would be replaced. `
    : 'This device has nothing saved yet. ';
  return say(mem, ctx, `This backup is from ${date}: ${countsText(summary.properties, summary.comps)}, ${summary.messages} messages. ${device}It replaces everything on this device, and I'll keep a copy so you can undo it. Go ahead?`, {
    chips: [
      { label: 'Yes, replace it', action: { type: 'import-confirm' } },
      { label: 'Keep what I have', action: { type: 'import-cancel' } },
    ],
  });
}

export function importRejected(mem: Memory, ctx: Ctx, error: string): Memory {
  return say(mem, ctx, error, { chips: mainChips(mem) });
}

export function afterImport(imported: Memory, ctx: Ctx, summary: ImportSummary): Memory {
  const next = { ...imported, lastBackupAt: summary.exportedAt };
  return say(next, ctx, `Welcome back, ${nameOf(next)}. Everything's restored, so you won't have to repeat yourself.`, {
    chips: [{ label: 'Undo that restore', action: { type: 'undo-import' } }, ...mainChips(next)],
  });
}

export function afterUndoImport(previous: Memory, ctx: Ctx): Memory {
  return say(previous, ctx, 'Done. Everything is back the way it was before that restore.', { chips: mainChips(previous) });
}
