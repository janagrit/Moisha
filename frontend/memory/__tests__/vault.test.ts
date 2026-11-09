// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { makeComp, makeProperty } from '../../domain/__tests__/fixtures';
import { createEmptyMemory, type Memory } from '../schema';
import { MEMORY_KEY, removeLegacyPlaintext, type EnumerableStorage } from '../storage';
import { createVault, inspectVault, passcodeProblem, unlockVault, VAULT_KEY } from '../vault';

const NOW = new Date('2026-11-09T15:00:00.000Z');
const PASSCODE = 'correct-horse-9';
const PENDING = 'moisha:vault:pending';
const BEFORE_IMPORT = 'moisha:vault:before-import';

class FakeStorage implements EnumerableStorage {
  private map = new Map<string, string>();
  failWritesTo: string | null = null;
  corruptWritesTo: string | null = null;
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWritesTo === k) throw new DOMException('full', 'QuotaExceededError');
    this.map.set(k, this.corruptWritesTo === k ? `${v.slice(0, -10)}AAAAAAAA"}` : v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  dump() {
    return [...this.map.values()].join('\n');
  }
}

function memoryWith(nickname = 'Private Rowhouse'): Memory {
  return {
    ...createEmptyMemory(NOW),
    preferences: { hostName: 'Sam', managerName: 'Alex', soundOn: false, horizonDays: 30 },
    properties: [makeProperty({ nickname, address: '123 Example Street' })],
    comps: [makeComp(275, { label: 'Blue door' })],
  };
}

async function created(storage = new FakeStorage(), memory = memoryWith()) {
  const result = await createVault(storage, PASSCODE, memory);
  if (!result.ok) throw new Error(result.error);
  return { storage, session: result.session, memory };
}

describe('passcode rules', () => {
  it.each([
    ['short1', 'at least 8'],
    ['12345678901', 'letters'],
  ])('rejects %s', (code, reason) => {
    expect(passcodeProblem(code)).toContain(reason);
  });

  it('accepts a passcode with letters and enough length', () => {
    expect(passcodeProblem('blue door 9')).toBeNull();
  });
});

describe('encryption at rest', () => {
  it('stores no readable property, financial or manager data, and never the passcode', async () => {
    const { storage } = await created();
    const all = storage.dump();
    for (const secret of ['Private Rowhouse', '123 Example Street', 'Blue door', 'Alex', 'minPriceUsd', PASSCODE]) {
      expect(all).not.toContain(secret);
    }
    expect(atob(JSON.parse(storage.getItem(VAULT_KEY)!).ciphertext)).not.toContain('Private');
  });

  it('opens with the right passcode and returns the same data', async () => {
    const { storage, memory } = await created();
    const opened = await unlockVault(storage, PASSCODE);
    expect(opened).toMatchObject({ ok: true, memory });
  });

  it('accepts non-English passcodes', async () => {
    const storage = new FakeStorage();
    await createVault(storage, 'שלום-пароль-1', memoryWith());
    expect((await unlockVault(storage, 'שלום-пароль-1')).ok).toBe(true);
  });

  it.each(['wrong-passcode', '', 'correct-horse-', 'CORRECT-HORSE-9'])('refuses the wrong passcode %j and changes nothing', async (wrong) => {
    const { storage } = await created();
    const before = storage.getItem(VAULT_KEY);
    expect(await unlockVault(storage, wrong)).toEqual({ ok: false, error: 'wrong-passcode' });
    expect(storage.getItem(VAULT_KEY)).toBe(before);
  });

  it('uses a new IV on every save and a new salt per vault', async () => {
    const { storage, session, memory } = await created();
    const first = JSON.parse(storage.getItem(VAULT_KEY)!);
    await session.save(memory);
    const second = JSON.parse(storage.getItem(VAULT_KEY)!);
    expect(first.cipher.iv).not.toBe(second.cipher.iv);
    expect(first.kdf.salt).toBe(second.kdf.salt);
    const other = await created();
    expect(JSON.parse(other.storage.getItem(VAULT_KEY)!).kdf.salt).not.toBe(first.kdf.salt);
  });

  it('uses the recommended work factor', async () => {
    const { storage } = await created();
    expect(JSON.parse(storage.getItem(VAULT_KEY)!).kdf.iterations).toBeGreaterThanOrEqual(600_000);
  });

  it('detects tampering', async () => {
    const { storage } = await created();
    const file = JSON.parse(storage.getItem(VAULT_KEY)!);
    const bytes = Uint8Array.from(atob(file.ciphertext), (c) => c.charCodeAt(0));
    bytes[3] ^= 1;
    file.ciphertext = btoa(String.fromCharCode(...bytes));
    storage.setItem(VAULT_KEY, JSON.stringify(file));
    expect((await unlockVault(storage, PASSCODE)).ok).toBe(false);
  });

  it.each(['garbage', '{}', '{"format":"moisha-vault","version":1}'])('reports %s as corrupt rather than crashing', async (text) => {
    const storage = new FakeStorage();
    storage.setItem(VAULT_KEY, text);
    expect(inspectVault(storage)).toBe('corrupt');
    expect(await unlockVault(storage, PASSCODE)).toEqual({ ok: false, error: 'corrupt' });
    expect(storage.getItem(VAULT_KEY)).toBe(text);
  });

  it('refuses a weakened work factor', async () => {
    const { storage } = await created();
    const file = JSON.parse(storage.getItem(VAULT_KEY)!);
    file.kdf.iterations = 1000;
    storage.setItem(VAULT_KEY, JSON.stringify(file));
    expect(inspectVault(storage)).toBe('corrupt');
  });
});

describe('saving', () => {
  it('saves changes that a later unlock can read', async () => {
    const { storage, session, memory } = await created();
    await session.save({ ...memory, comps: [] });
    expect(await unlockVault(storage, PASSCODE)).toMatchObject({ ok: true, memory: { comps: [] } });
  });

  it('applies rapid saves in order, so the newest always wins', async () => {
    const { storage, session, memory } = await created();
    const saves = Array.from({ length: 25 }, (_, i) => session.save({ ...memory, nextId: i }));
    await Promise.all(saves);
    expect(await unlockVault(storage, PASSCODE)).toMatchObject({ ok: true, memory: { nextId: 24 } });
  });

  it('reports a full device', async () => {
    const { storage, session, memory } = await created();
    storage.failWritesTo = VAULT_KEY;
    expect(await session.save(memory)).toEqual({ ok: false, error: 'quota' });
  });

  it('refuses to save or read once locked, leaving the saved data alone', async () => {
    const { storage, session, memory } = await created();
    await session.saveBeforeImport(memory);
    const before = storage.getItem(VAULT_KEY);
    session.lock();
    expect(await session.save({ ...memory, comps: [] })).toEqual({ ok: false, error: 'locked' });
    expect(await session.loadBeforeImport()).toBeNull();
    expect(storage.getItem(VAULT_KEY)).toBe(before);
  });

  it('finishes queued saves before whenIdle resolves', async () => {
    const { storage, session, memory } = await created();
    void session.save({ ...memory, nextId: 77 });
    await session.whenIdle();
    session.lock();
    expect(await unlockVault(storage, PASSCODE)).toMatchObject({ ok: true, memory: { nextId: 77 } });
  });
});

describe('safety copy before a restore', () => {
  it('is encrypted and reads back', async () => {
    const { storage, session, memory } = await created();
    await session.saveBeforeImport(memory);
    expect(storage.getItem(BEFORE_IMPORT)).not.toContain('Private');
    expect(await session.loadBeforeImport()).toEqual(memory);
  });

  it('cannot be swapped in as the main data', async () => {
    const { storage, session, memory } = await created();
    await session.saveBeforeImport(memory);
    storage.setItem(VAULT_KEY, storage.getItem(BEFORE_IMPORT)!);
    expect((await unlockVault(storage, PASSCODE)).ok).toBe(false);
  });

  it('reports nothing when absent or cleared', async () => {
    const { session, memory } = await created();
    expect(await session.loadBeforeImport()).toBeNull();
    await session.saveBeforeImport(memory);
    session.clearBeforeImport();
    expect(await session.loadBeforeImport()).toBeNull();
  });
});

describe('interrupted encryption', () => {
  function withPlaintext() {
    const storage = new FakeStorage();
    const memory = memoryWith('Legacy Plain House');
    storage.setItem(MEMORY_KEY, JSON.stringify(memory));
    storage.setItem(`${MEMORY_KEY}:before-import`, JSON.stringify(memory));
    return { storage, memory };
  }

  it('keeps the original data if the temporary write fails', async () => {
    const { storage, memory } = withPlaintext();
    storage.failWritesTo = PENDING;
    expect(await createVault(storage, PASSCODE, memory)).toEqual({ ok: false, error: 'quota' });
    expect(inspectVault(storage)).toBe('none');
    expect(storage.getItem(MEMORY_KEY)).toContain('Legacy Plain House');
  });

  it('keeps the original data if the read-back does not match', async () => {
    const { storage, memory } = withPlaintext();
    storage.corruptWritesTo = PENDING;
    expect(await createVault(storage, PASSCODE, memory)).toEqual({ ok: false, error: 'verify-failed' });
    expect(inspectVault(storage)).toBe('none');
    expect(storage.getItem(PENDING)).toBeNull();
    expect(storage.getItem(MEMORY_KEY)).toContain('Legacy Plain House');
  });

  it('keeps the original data if the final write fails', async () => {
    const { storage, memory } = withPlaintext();
    storage.failWritesTo = VAULT_KEY;
    expect(await createVault(storage, PASSCODE, memory)).toEqual({ ok: false, error: 'quota' });
    expect(inspectVault(storage)).toBe('none');
    expect(storage.getItem(PENDING)).toBeNull();
    expect(storage.getItem(MEMORY_KEY)).toContain('Legacy Plain House');
  });

  it('recovers when the app stopped after the temporary write', async () => {
    const { storage, memory } = withPlaintext();
    storage.setItem(PENDING, 'partial');
    expect(inspectVault(storage)).toBe('none');
    expect((await createVault(storage, PASSCODE, memory)).ok).toBe(true);
    expect(storage.getItem(PENDING)).toBeNull();
  });

  it('removes plain text only after the vault has proven it opens', async () => {
    const { storage, memory } = withPlaintext();
    await createVault(storage, PASSCODE, memory);
    expect(storage.getItem(MEMORY_KEY)).not.toBeNull();
    await unlockVault(storage, 'wrong passcode');
    expect(storage.getItem(MEMORY_KEY)).not.toBeNull();
    expect((await unlockVault(storage, PASSCODE)).ok).toBe(true);
    expect(storage.getItem(MEMORY_KEY)).toBeNull();
    expect(storage.getItem(`${MEMORY_KEY}:before-import`)).toBeNull();
    expect(storage.dump()).not.toContain('Legacy Plain House');
  });

  it('leaves unrelated data alone when removing plain text', () => {
    const storage = new FakeStorage();
    storage.setItem(MEMORY_KEY, 'x');
    storage.setItem(VAULT_KEY, 'y');
    storage.setItem('moisha:memoryish', 'z');
    removeLegacyPlaintext(storage);
    expect(storage.getItem(VAULT_KEY)).toBe('y');
    expect(storage.getItem('moisha:memoryish')).toBe('z');
  });
});
