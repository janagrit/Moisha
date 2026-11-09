/**
 * Encrypts everything Moisha saves on this device.
 *
 * A passcode derives an AES-256-GCM key with PBKDF2. The passcode is never stored. The key exists
 * only in this page's memory, cannot be exported, and is dropped when the app locks.
 */
import { deriveKey, fromBase64, PBKDF2_ITERATIONS, toBase64 } from './backupCrypto';
import type { Memory } from './schema';
import { removeLegacyPlaintext, validateMemory, writeStorageItem, type EnumerableStorage, type SaveResult } from './storage';

const FORMAT = 'moisha-vault';
const VERSION = 1;

export const VAULT_KEY = 'moisha:vault';
const PENDING_KEY = 'moisha:vault:pending';
const BEFORE_IMPORT_KEY = 'moisha:vault:before-import';

export const MIN_PASSCODE_LENGTH = 8;

const MIN_ACCEPTED_ITERATIONS = 100_000;
const MAX_ACCEPTED_ITERATIONS = 5_000_000;

type Purpose = 'main' | 'before-import';

interface VaultFile {
  format: typeof FORMAT;
  version: typeof VERSION;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  ciphertext: string;
}

/** Explains why a passcode is too weak to protect data on a stolen phone, or null if it is fine. */
export function passcodeProblem(passcode: string): string | null {
  if (passcode.length < MIN_PASSCODE_LENGTH) return `Use at least ${MIN_PASSCODE_LENGTH} characters.`;
  if (/^\d+$/.test(passcode)) return 'Add some letters. A number-only code can be guessed quickly from a stolen phone.';
  return null;
}

/** Ties each record to its role, so a safety copy can't be swapped in as the main data. */
function additionalData(purpose: Purpose, iterations: number): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${FORMAT}:${VERSION}:${purpose}:${iterations}`) as Uint8Array<ArrayBuffer>;
}

async function seal(key: CryptoKey, salt: string, iterations: number, purpose: Purpose, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(purpose, iterations) },
    key,
    new TextEncoder().encode(plaintext),
  );
  const file: VaultFile = {
    format: FORMAT,
    version: VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(file);
}

function parseFile(text: string | null): VaultFile | null {
  if (text === null) return null;
  try {
    const file = JSON.parse(text) as Partial<VaultFile> | null;
    const iterations = file?.kdf?.iterations;
    const valid =
      file?.format === FORMAT &&
      file.version === VERSION &&
      file.kdf?.name === 'PBKDF2' &&
      file.kdf.hash === 'SHA-256' &&
      typeof file.kdf.salt === 'string' &&
      file.cipher?.name === 'AES-GCM' &&
      typeof file.cipher.iv === 'string' &&
      typeof file.ciphertext === 'string' &&
      Number.isInteger(iterations) &&
      (iterations as number) >= MIN_ACCEPTED_ITERATIONS &&
      (iterations as number) <= MAX_ACCEPTED_ITERATIONS;
    return valid ? (file as VaultFile) : null;
  } catch {
    return null;
  }
}

async function unseal(key: CryptoKey, file: VaultFile, purpose: Purpose): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(file.cipher.iv), additionalData: additionalData(purpose, file.kdf.iterations) },
    key,
    fromBase64(file.ciphertext),
  );
  return new TextDecoder().decode(plain);
}

export type VaultStatus = 'none' | 'locked' | 'corrupt';

export function inspectVault(storage: EnumerableStorage): VaultStatus {
  const raw = storage.getItem(VAULT_KEY);
  if (raw === null) return 'none';
  return parseFile(raw) ? 'locked' : 'corrupt';
}

export type VaultSaveResult = SaveResult | { ok: false; error: 'locked' };

/** An unlocked vault. Holds the key in memory until lock() is called. */
export class VaultSession {
  private key: CryptoKey | null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly storage: EnumerableStorage;
  private readonly salt: string;
  private readonly iterations: number;

  constructor(storage: EnumerableStorage, key: CryptoKey, salt: string, iterations: number) {
    this.storage = storage;
    this.key = key;
    this.salt = salt;
    this.iterations = iterations;
  }

  /** Writes happen strictly in order, so an older state can never replace a newer one. */
  save(memory: Memory): Promise<VaultSaveResult> {
    const text = JSON.stringify(memory);
    const run = this.queue.then(() => this.write(VAULT_KEY, 'main', text));
    this.queue = run.catch(() => undefined);
    return run;
  }

  saveBeforeImport(memory: Memory): Promise<VaultSaveResult> {
    const text = JSON.stringify(memory);
    const run = this.queue.then(() => this.write(BEFORE_IMPORT_KEY, 'before-import', text));
    this.queue = run.catch(() => undefined);
    return run;
  }

  async loadBeforeImport(): Promise<Memory | null> {
    const file = parseFile(this.storage.getItem(BEFORE_IMPORT_KEY));
    if (!file || !this.key) return null;
    try {
      const result = validateMemory(JSON.parse(await unseal(this.key, file, 'before-import')));
      return result.ok ? result.memory : null;
    } catch {
      return null;
    }
  }

  clearBeforeImport(): void {
    this.storage.removeItem(BEFORE_IMPORT_KEY);
  }

  whenIdle(): Promise<unknown> {
    return this.queue;
  }

  /** Forgets the key. Saved data stays encrypted, and nothing further can be read or written. */
  lock(): void {
    this.key = null;
  }

  private async write(storageKey: string, purpose: Purpose, plaintext: string): Promise<VaultSaveResult> {
    if (!this.key) return { ok: false, error: 'locked' };
    return writeStorageItem(this.storage, storageKey, await seal(this.key, this.salt, this.iterations, purpose, plaintext));
  }
}

export type CreateResult = { ok: true; session: VaultSession } | { ok: false; error: 'quota' | 'unavailable' | 'verify-failed' };

/**
 * Creates the vault in stages. The data is written to a temporary slot and read back first, so an
 * interruption at any point leaves either the old data or a complete vault, never neither.
 * Callers remove plain-text data only after this succeeds.
 */
export async function createVault(storage: EnumerableStorage, passcode: string, memory: Memory): Promise<CreateResult> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toBase64(saltBytes);
  const key = await deriveKey(passcode, saltBytes, PBKDF2_ITERATIONS, ['encrypt', 'decrypt']);
  const plaintext = JSON.stringify(memory);
  const sealed = await seal(key, salt, PBKDF2_ITERATIONS, 'main', plaintext);

  const pending = writeStorageItem(storage, PENDING_KEY, sealed);
  if (!pending.ok) return pending;

  const file = parseFile(storage.getItem(PENDING_KEY));
  let verified = false;
  try {
    verified = file !== null && (await unseal(key, file, 'main')) === plaintext;
  } catch {
    verified = false;
  }
  if (!verified) {
    storage.removeItem(PENDING_KEY);
    return { ok: false, error: 'verify-failed' };
  }

  const written = writeStorageItem(storage, VAULT_KEY, sealed);
  storage.removeItem(PENDING_KEY);
  if (!written.ok) return written;
  if (storage.getItem(VAULT_KEY) !== sealed) return { ok: false, error: 'verify-failed' };

  return { ok: true, session: new VaultSession(storage, key, salt, PBKDF2_ITERATIONS) };
}

export type UnlockResult =
  | { ok: true; session: VaultSession; memory: Memory }
  | { ok: false; error: 'wrong-passcode' | 'corrupt' | 'unreadable' };

export async function unlockVault(storage: EnumerableStorage, passcode: string): Promise<UnlockResult> {
  const file = parseFile(storage.getItem(VAULT_KEY));
  if (!file) return { ok: false, error: 'corrupt' };

  let saltBytes: Uint8Array<ArrayBuffer>;
  try {
    saltBytes = fromBase64(file.kdf.salt);
  } catch {
    return { ok: false, error: 'corrupt' };
  }

  const key = await deriveKey(passcode, saltBytes, file.kdf.iterations, ['encrypt', 'decrypt']);
  let plaintext: string;
  try {
    plaintext = await unseal(key, file, 'main');
  } catch {
    // AES-GCM cannot tell a wrong passcode from a damaged record.
    return { ok: false, error: 'wrong-passcode' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return { ok: false, error: 'unreadable' };
  }
  const result = validateMemory(parsed);
  if (!result.ok) return { ok: false, error: 'unreadable' };

  // The vault has now proven it opens, so anything left over from an interrupted migration can go.
  try {
    removeLegacyPlaintext(storage);
    storage.removeItem(PENDING_KEY);
  } catch {
    // Harmless. It will be retried at the next unlock.
  }

  return { ok: true, session: new VaultSession(storage, key, file.kdf.salt, file.kdf.iterations), memory: result.memory };
}
