/**
 * Passphrase-encrypted backups using only the browser's built-in Web Crypto.
 * PBKDF2-HMAC-SHA256 derives an AES-256-GCM key. The passphrase is never stored.
 */

const FORMAT = 'moisha-encrypted-backup';
const VERSION = 1;

export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSPHRASE_LENGTH = 10;

// Refuses files that would weaken the key or hang the phone.
const MIN_ACCEPTED_ITERATIONS = 100_000;
const MAX_ACCEPTED_ITERATIONS = 5_000_000;

interface EncryptedBackup {
  format: typeof FORMAT;
  version: typeof VERSION;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  ciphertext: string;
}

export type DecryptResult = { ok: true; plaintext: string } | { ok: false; error: 'wrong-passphrase' | 'invalid' };

export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && crypto.subtle !== undefined;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Binds the format and work factor to the ciphertext, so editing them breaks decryption. */
function additionalData(iterations: number): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${FORMAT}:${VERSION}:${iterations}`) as Uint8Array<ArrayBuffer>;
}

/** Derives a key that cannot be exported from the browser's crypto engine. */
export async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number, usages: KeyUsage[]): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

export async function encryptBackup(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData(PBKDF2_ITERATIONS) },
    key,
    new TextEncoder().encode(plaintext),
  );
  const backup: EncryptedBackup = {
    format: FORMAT,
    version: VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(backup);
}

function parseEnvelope(text: string): EncryptedBackup | null {
  try {
    const value = JSON.parse(text) as Partial<EncryptedBackup> | null;
    return value?.format === FORMAT ? (value as EncryptedBackup) : null;
  } catch {
    return null;
  }
}

export function isEncryptedBackup(text: string): boolean {
  return parseEnvelope(text) !== null;
}

export async function decryptBackup(text: string, passphrase: string): Promise<DecryptResult> {
  const backup = parseEnvelope(text);
  if (!backup || backup.version !== VERSION) return { ok: false, error: 'invalid' };

  const iterations = backup.kdf?.iterations;
  if (
    backup.kdf?.name !== 'PBKDF2' ||
    backup.kdf.hash !== 'SHA-256' ||
    backup.cipher?.name !== 'AES-GCM' ||
    !Number.isInteger(iterations) ||
    iterations < MIN_ACCEPTED_ITERATIONS ||
    iterations > MAX_ACCEPTED_ITERATIONS
  ) {
    return { ok: false, error: 'invalid' };
  }

  let salt: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  let ciphertext: Uint8Array<ArrayBuffer>;
  try {
    salt = fromBase64(backup.kdf.salt);
    iv = fromBase64(backup.cipher.iv);
    ciphertext = fromBase64(backup.ciphertext);
  } catch {
    return { ok: false, error: 'invalid' };
  }

  try {
    const key = await deriveKey(passphrase, salt, iterations, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: additionalData(iterations) }, key, ciphertext);
    return { ok: true, plaintext: new TextDecoder().decode(plain) };
  } catch {
    // AES-GCM cannot tell a wrong passphrase from a damaged file.
    return { ok: false, error: 'wrong-passphrase' };
  }
}
