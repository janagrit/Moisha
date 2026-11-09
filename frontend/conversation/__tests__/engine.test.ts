import { describe, expect, it } from 'vitest';
import { formatFigure } from '../../domain/provenance';
import { exportMemory, parseImport } from '../../memory/exportImport';
import { createEmptyMemory, memorySchema, type Chip, type ChipAction, type Memory } from '../../memory/schema';
import { afterBackup, afterImport, afterUndoImport, handleChip, handleText, importPreview, openConversation } from '../engine';
import { parseDate, parseMoney } from '../parse';
import { buildSampleMemory } from '../sampleData';

// A Monday afternoon in Washington.
const ctx = { now: new Date('2026-11-09T19:00:00.000Z') };
const nextDay = { now: new Date('2026-11-10T19:00:00.000Z') };

const last = (m: Memory) => m.messages[m.messages.length - 1];
const typeAll = (m: Memory, answers: string[]) => answers.reduce((mem, a) => handleText(mem, a, ctx), m);
const act = (m: Memory, action: ChipAction) => handleChip(m, { label: 'x', action }, ctx).memory;

function tap(m: Memory, label: string): Memory {
  const chip = last(m).chips?.find((c: Chip) => c.label === label);
  if (!chip) throw new Error(`no chip "${label}" in: ${last(m).chips?.map((c) => c.label).join(', ')}`);
  return handleChip(m, chip, ctx).memory;
}

const first = () => openConversation(createEmptyMemory(ctx.now), ctx);
const setUp = () => typeAll(tap(first(), "Let's set up"), ['Sam', 'The Rowhouse', '20002', '3', '$240', '275', '180']);

function addNeighbor(m: Memory, label: string, price: string): Memory {
  let mem = act(m, { type: 'flow', flow: 'add-comp' });
  mem = handleText(mem, label, ctx);
  mem = tap(mem, 'Same as mine (3)');
  mem = handleText(mem, price, ctx);
  mem = tap(mem, 'All nights');
  return tap(mem, 'Open');
}

const priceCard = (m: Memory) => {
  const card = last(m).card;
  if (card?.type !== 'price') throw new Error('expected a price card');
  return card;
};

describe('first conversation', () => {
  it('introduces Moisha and makes no promise of background monitoring', () => {
    const m = first();
    expect(last(m).text).toContain('only check when this app is open');
    expect(last(m).chips?.map((c) => c.label)).toContain("Let's set up");
  });

  it('collects a property through conversation', () => {
    const m = setUp();
    expect(m.preferences.hostName).toBe('Sam');
    expect(m.properties[0]).toMatchObject({
      nickname: 'The Rowhouse',
      address: '20002',
      bedrooms: 3,
      currentPrice: { weekday: 240, weekend: 275 },
      rules: { minPriceUsd: 180 },
    });
    expect(m.activeFlow).toBeNull();
  });

  it('re-asks instead of accepting a bad number', () => {
    const m = typeAll(tap(first(), "Let's set up"), ['Sam', 'The Rowhouse', '20002', '3', 'a lot']);
    expect(last(m).text).toContain('I need a number');
    expect(m.activeFlow?.answers.weekday).toBeUndefined();
    expect(handleText(m, '240', ctx).activeFlow?.answers.weekday).toBe(240);
  });

  it('does not ask for the name again on a second property', () => {
    const second = act(setUp(), { type: 'flow', flow: 'setup' });
    expect(last(second).text).toContain('What do you call this place?');
  });

  it('lets the host back out', () => {
    const m = handleText(tap(first(), "Let's set up"), 'never mind', ctx);
    expect(m.activeFlow).toBeNull();
    expect(m.properties).toEqual([]);
  });

  it('resumes a half-finished question after a reload', () => {
    const m = typeAll(tap(first(), "Let's set up"), ['Sam', 'The Rowhouse']);
    const reloaded = memorySchema.parse(JSON.parse(JSON.stringify(m)));
    expect(openConversation(reloaded, ctx)).toEqual(reloaded);
    expect(handleText(reloaded, '20002', ctx).activeFlow?.answers.address).toBe('20002');
  });
});

describe('price conversation', () => {
  it('refuses to name a price with no neighbors, without inventing numbers', () => {
    const m = act(setUp(), { type: 'show', view: 'price' });
    expect(last(m).text).toContain("won't guess");
    expect(formatFigure(priceCard(m).recommended)).toBe('Not available');
    expect(priceCard(m).rows.find((r) => r.label === 'Neighborhood average')?.figure?.provenance).toBe('unavailable');
    expect(m.recommendations).toEqual([]);
  });

  it('recommends the median and keeps the old formula as an option', () => {
    let m = setUp();
    m = addNeighbor(m, 'Blue door', '220');
    m = addNeighbor(m, 'Corner house', '260');
    m = addNeighbor(m, 'Green gate', '300');
    m = act(m, { type: 'show', view: 'price' });
    expect(formatFigure(priceCard(m).recommended)).toBe('$260');
    expect(priceCard(m).recommended.provenance).toBe('estimate');
    expect(formatFigure(priceCard(m).matchCheapest!)).toBe('$220');
    expect(last(m).text).toContain('$260');
  });

  it('remembers each distinct recommendation once', () => {
    let m = addNeighbor(addNeighbor(setUp(), 'A', '220'), 'B', '260');
    m = act(act(m, { type: 'show', view: 'price' }), { type: 'show', view: 'price' });
    expect(m.recommendations).toHaveLength(1);
    expect(m.recommendations[0]).toMatchObject({ priceUsd: 240, status: 'pending', confidence: 'low' });
  });

  it('keeps above the minimum, whatever the neighbors do', () => {
    let m = addNeighbor(addNeighbor(setUp(), 'A', '100'), 'B', '110');
    m = act(m, { type: 'show', view: 'price' });
    // The market is $105, a 20% step from $240 stops at $192, and the old formula holds at the $180 minimum.
    expect(formatFigure(priceCard(m).recommended)).toBe('$192');
    expect(formatFigure(priceCard(m).matchCheapest!)).toBe('$180');
  });
});

describe('neighbor records', () => {
  it('keeps price history and speaks up about a drop', () => {
    let m = addNeighbor(setUp(), 'Blue door', '275');
    m = act(m, { type: 'flow', flow: 'update-comp' });
    m = tap(m, 'Blue door');
    m = handleText(m, '225', ctx);
    expect(m.comps[0]).toMatchObject({ priceUsd: 225, priceHistory: [{ priceUsd: 275 }] });
    expect(last(m).text).toContain('dropped $50');
  });
});

describe('calendar', () => {
  it('admits it cannot see empty nights without a calendar', () => {
    expect(last(act(setUp(), { type: 'show', view: 'gaps' })).text).toContain("can't count");
  });

  it('counts empty nights from booked dates', () => {
    let m = tap(act(setUp(), { type: 'flow', flow: 'dates' }), 'Booked nights');
    m = typeAll(m, ['2026-11-12', '12/9']);
    expect(m.properties[0].booked).toEqual([{ start: '2026-11-12', end: '2026-12-09' }]);
    m = act(m, { type: 'show', view: 'gaps' });
    expect(last(m).text).toContain('3 empty nights starting tonight');
    const card = last(m).card;
    if (card?.type !== 'gaps') throw new Error('expected a gaps card');
    expect(formatFigure(card.atMost!)).toBe('$720');
  });

  it('quotes the first gap in words and the whole window on the card', () => {
    let m = tap(act(setUp(), { type: 'flow', flow: 'dates' }), 'Booked nights');
    m = typeAll(m, ['11/12', '11/15']);
    m = act(m, { type: 'show', view: 'gaps' });
    expect(last(m).text).toContain("3 empty nights starting tonight. At most, that's $720");
    const card = last(m).card;
    if (card?.type !== 'gaps') throw new Error('expected a gaps card');
    // 21 weekday nights at $240 plus 6 weekend nights at $275.
    expect(formatFigure(card.atMost!)).toBe('$6,690');
  });

  it('rejects a checkout before the first night', () => {
    const m = typeAll(tap(act(setUp(), { type: 'flow', flow: 'dates' }), 'Booked nights'), ['11/20', '11/18']);
    expect(last(m).text).toContain('after the first night');
  });
});

describe('expenses', () => {
  it('remembers what is entered and keeps what is skipped', () => {
    let m = handleText(act(setUp(), { type: 'flow', flow: 'expenses' }), '120', ctx);
    m = tap(m, 'Keep 3');
    m = typeAll(m, ['300', '150', '2000', '3']);
    expect(m.properties[0].costs).toEqual({
      cleaningPerStayUsd: 120,
      avgStayNights: 3,
      utilitiesMonthlyUsd: 300,
      maintenanceMonthlyUsd: 150,
      mortgageOrFixedMonthlyUsd: 2000,
      platformFeePct: 3,
    });
  });
});

describe('returning to the app', () => {
  it('greets once a day with a card', () => {
    const opened = openConversation(setUp(), ctx);
    expect(last(opened).text).toContain('Good afternoon, Sam');
    expect(last(opened).card?.type).toBe('price');
    expect(openConversation(opened, ctx)).toEqual(opened);
    expect(openConversation(opened, nextDay).messages.length).toBe(opened.messages.length + 1);
  });

  it('reminds the host to back up once a week has passed', () => {
    const later = { now: new Date('2026-11-16T19:00:00.000Z') };
    const fresh = openConversation(setUp(), ctx);
    expect(last(fresh).text).not.toContain('backed up');
    const overdue = openConversation(fresh, later);
    expect(last(overdue).text).toContain('backed up');
    expect(last(overdue).chips?.[0].label).toBe('Back up or share');
    expect(last(openConversation(afterBackup(fresh, later, 'shared'), { now: new Date('2026-11-17T19:00:00.000Z') })).text).not.toContain('backed up');
  });

  it('never nags about backups in sample mode', () => {
    const m = { ...buildSampleMemory(new Date('2026-10-01T12:00:00.000Z')) };
    expect(last(openConversation(m, { now: ctx.now, isSample: true })).text).not.toContain('backed up');
  });

  it('never claims to understand free text it does not', () => {
    expect(last(handleText(setUp(), 'what about parking?', ctx)).text).toContain('next stage of my education');
  });
});

describe('moving memory between phones', () => {
  it('previews before replacing, then restores everything', () => {
    const m = addNeighbor(setUp(), 'Blue door', '275');
    const result = parseImport(exportMemory(m, ctx.now));
    if (!result.ok) throw new Error(result.error);
    const preview = importPreview(first(), ctx, result.summary);
    expect(last(preview).text).toContain('1 property, 1 neighbor,');
    expect(last(preview).text).toContain('replaces everything');
    expect(preview.properties).toEqual([]);
    const restored = afterImport(result.memory, ctx, result.summary);
    expect(restored.properties).toEqual(m.properties);
    expect(restored.comps).toEqual(m.comps);
    expect(restored.lastBackupAt).toBe(ctx.now.toISOString());
    expect(last(restored).chips?.map((c) => c.label)).toContain('Undo that restore');
  });

  it('spells out what would be replaced when the device already has data', () => {
    const m = setUp();
    const backup = parseImport(exportMemory(addNeighbor(setUp(), 'Blue door', '275'), ctx.now));
    if (!backup.ok) throw new Error(backup.error);
    const preview = importPreview(m, ctx, backup.summary);
    expect(last(preview).text).toContain('This device has 1 property, 0 neighbors');
    expect(last(preview).text).toContain('anything added since');
    expect(preview.properties).toEqual(m.properties);
    expect(last(preview).chips?.map((c) => c.label)).toEqual(['Yes, replace it', 'Keep what I have']);
  });

  it('confirms an undo', () => {
    expect(last(afterUndoImport(setUp(), ctx)).text).toContain('back the way it was');
  });

  it('only records a backup that really happened', () => {
    const m = setUp();
    expect(afterBackup(m, ctx, 'cancelled').lastBackupAt).toBeNull();
    expect(afterBackup(m, ctx, 'failed').lastBackupAt).toBeNull();
    expect(afterBackup(m, ctx, 'shared').lastBackupAt).toBe(ctx.now.toISOString());
  });
});

describe('data freshness wording', () => {
  it('says plainly on the price card that there is no live feed', () => {
    const m = act(addNeighbor(addNeighbor(setUp(), 'A', '220'), 'B', '260'), { type: 'show', view: 'price' });
    expect(priceCard(m).notes.join(' ')).toContain('No live market feed');
  });

  it('never describes market data as live or current anywhere in the conversation code', () => {
    const sources = import.meta.glob('../*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(sources).length).toBeGreaterThan(3);
    for (const [path, source] of Object.entries(sources)) {
      const text = source.replace(/No live market feed/g, '');
      expect(text, path).not.toMatch(/\b(live|real[- ]time|up[- ]to[- ]date|latest market|current market)\b/i);
    }
  });
});

describe('sample data', () => {
  it('is valid and clearly fictional', () => {
    const m = buildSampleMemory(ctx.now);
    expect(() => memorySchema.parse(m)).not.toThrow();
    expect(m.properties[0].nickname).toContain('Sample');
    expect(m.comps.every((c) => c.label.startsWith('Sample'))).toBe(true);
  });
});

describe('parsing', () => {
  it.each([
    ['215', 215],
    ['$1,250', 1250],
    ['215 a night', 215],
    ['99.50', 99.5],
    ['nothing', null],
    ['0', null],
    ['9999999', null],
  ])('reads money from %s', (raw, expected) => {
    expect(parseMoney(raw)).toBe(expected);
  });

  it.each([
    ['2026-11-12', '2026-11-12'],
    ['11/12', '2026-11-12'],
    ['Nov 12', '2026-11-12'],
    ['November 12', '2026-11-12'],
    ['1/5', '2027-01-05'],
    ['13/45', null],
    ['soon', null],
  ])('reads a date from %s', (raw, expected) => {
    expect(parseDate(raw, '2026-11-09')).toBe(expected);
  });
});
