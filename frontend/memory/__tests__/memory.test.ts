import { beforeEach, describe, expect, it } from 'vitest';
import { makeComp, makeProperty } from '../../domain/__tests__/fixtures';
import { exportMemory, parseImport } from '../exportImport';
import { createEmptyMemory, type Memory } from '../schema';
import { loadMemory, MEMORY_KEY, writeStorageItem, type StorageLike } from '../storage';

const NOW = new Date('2026-11-09T15:00:00.000Z');

function filledMemory(): Memory {
  return {
    ...createEmptyMemory(NOW),
    preferences: { hostName: 'Sam', managerName: 'Alex', soundOn: false, horizonDays: 30 },
    selectedPropertyId: 'p1',
    properties: [makeProperty()],
    comps: [makeComp(250)],
    recommendations: [
      {
        id: 'r1',
        propertyId: 'p1',
        createdAt: NOW.toISOString(),
        targetDate: '2026-11-09',
        priceUsd: 250,
        currentUsd: 240,
        basis: 'comps',
        confidence: 'low',
        status: 'pending',
      },
    ],
    decisions: [
      {
        id: 'd1',
        recommendationId: 'r1',
        propertyId: 'p1',
        decidedAt: NOW.toISOString(),
        decision: 'accepted',
        outcome: 'Booked two nights',
        outcomeRecordedAt: NOW.toISOString(),
      },
    ],
    messages: [{ id: 'm1', createdAt: NOW.toISOString(), author: 'moisha', text: 'Shalom', chips: [{ label: 'Hi', action: { type: 'show', view: 'menu' } }] }],
  };
}

describe('reading plain-text data from before encryption', () => {
  beforeEach(() => localStorage.clear());

  it('reports empty when there is none', () => {
    expect(loadMemory(localStorage, MEMORY_KEY, NOW)).toEqual({ status: 'empty' });
  });

  it('reads every kind of memory', () => {
    const memory = filledMemory();
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    expect(loadMemory(localStorage, MEMORY_KEY, NOW)).toEqual({ status: 'ok', memory });
  });

  it('preserves unreadable data instead of overwriting it', () => {
    localStorage.setItem(MEMORY_KEY, '{ not json');
    const result = loadMemory(localStorage, MEMORY_KEY, NOW);
    expect(result).toMatchObject({ status: 'corrupt', reason: 'invalid' });
    if (result.status !== 'corrupt' || !result.preservedAt) throw new Error('expected a preserved copy');
    expect(localStorage.getItem(result.preservedAt)).toBe('{ not json');
    expect(localStorage.getItem(MEMORY_KEY)).toBe('{ not json');
  });

  it('rejects data with the wrong shape', () => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ schemaVersion: 1, properties: 'nope' }));
    expect(loadMemory(localStorage, MEMORY_KEY, NOW)).toMatchObject({ status: 'corrupt', reason: 'invalid' });
  });

  it('will not load data from a newer version', () => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ ...filledMemory(), schemaVersion: 2 }));
    expect(loadMemory(localStorage, MEMORY_KEY, NOW)).toMatchObject({ status: 'corrupt', reason: 'newer-version' });
  });

  it('reports a full device rather than failing silently', () => {
    const full: StorageLike = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(writeStorageItem(full, MEMORY_KEY, 'x')).toEqual({ ok: false, error: 'quota' });
  });

  it('reports blocked storage', () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw new Error('denied');
      },
      removeItem: () => undefined,
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadMemory(blocked, MEMORY_KEY, NOW)).toMatchObject({ status: 'corrupt', reason: 'unreadable' });
    expect(writeStorageItem(blocked, MEMORY_KEY, 'x')).toEqual({ ok: false, error: 'unavailable' });
  });
});

describe('export and import', () => {
  it('round-trips everything and reports what it found', () => {
    const memory = filledMemory();
    const result = parseImport(exportMemory(memory, NOW));
    expect(result).toMatchObject({
      ok: true,
      memory,
      summary: { properties: 1, comps: 1, messages: 1, exportedAt: NOW.toISOString() },
    });
  });

  it('drops a half-finished question from the other device', () => {
    const memory: Memory = { ...filledMemory(), activeFlow: { id: 'add-comp', step: 1, answers: {} } };
    const result = parseImport(exportMemory(memory, NOW));
    expect(result).toMatchObject({ ok: true, memory: { activeFlow: null } });
  });

  it.each([
    ['not json', 'hello'],
    ['another kind of file', JSON.stringify({ format: 'other', exportedAt: 'x', data: {} })],
    ['a damaged backup', JSON.stringify({ format: 'moisha-export', exportedAt: 'x', data: { schemaVersion: 1 } })],
  ])('rejects %s', (_name, text) => {
    expect(parseImport(text).ok).toBe(false);
  });

  it('rejects a backup from a newer version', () => {
    const text = JSON.stringify({ format: 'moisha-export', exportedAt: 'x', data: { ...filledMemory(), schemaVersion: 2 } });
    expect(parseImport(text)).toMatchObject({ ok: false, error: expect.stringContaining('newer') });
  });
});
