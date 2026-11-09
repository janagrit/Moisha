import { CURRENT_SCHEMA_VERSION, memorySchema, type Memory } from './schema';

/** Where data lived before device encryption. Only ever read, to migrate it into the vault. */
export const MEMORY_KEY = 'moisha:memory';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type EnumerableStorage = StorageLike & Pick<Storage, 'length' | 'key'>;

export type ValidationResult = { ok: true; memory: Memory } | { ok: false; error: 'newer-version' | 'invalid' };

/** Brings stored data up to the current version. Add a step here whenever the schema changes. */
export function validateMemory(raw: unknown): ValidationResult {
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) return { ok: false, error: 'newer-version' };
  const parsed = memorySchema.safeParse(raw);
  return parsed.success ? { ok: true, memory: parsed.data } : { ok: false, error: 'invalid' };
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; memory: Memory }
  | { status: 'corrupt'; preservedAt: string | null; reason: 'newer-version' | 'invalid' | 'unreadable' };

export function loadMemory(storage: StorageLike, key: string, now: Date): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { status: 'corrupt', preservedAt: null, reason: 'unreadable' };
  }
  if (raw === null) return { status: 'empty' };

  let reason: 'newer-version' | 'invalid' = 'invalid';
  try {
    const result = validateMemory(JSON.parse(raw));
    if (result.ok) return { status: 'ok', memory: result.memory };
    reason = result.error;
  } catch {
    // Falls through: the raw text is preserved below.
  }

  // Never overwrite what we could not read. Keep a copy the host can recover.
  const preservedAt = `${key}:corrupt-${now.getTime()}`;
  try {
    storage.setItem(preservedAt, raw);
    return { status: 'corrupt', preservedAt, reason };
  } catch {
    return { status: 'corrupt', preservedAt: null, reason };
  }
}

export type SaveResult = { ok: true } | { ok: false; error: 'quota' | 'unavailable' };

export function writeStorageItem(storage: StorageLike, key: string, value: string): SaveResult {
  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
    return { ok: false, error: quota ? 'quota' : 'unavailable' };
  }
}

/** Removes data saved before encryption, including old safety copies. */
export function removeLegacyPlaintext(storage: EnumerableStorage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key === MEMORY_KEY || key?.startsWith(`${MEMORY_KEY}:`)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}
