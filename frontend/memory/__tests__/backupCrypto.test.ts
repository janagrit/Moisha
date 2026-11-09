// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup, isEncryptedBackup, PBKDF2_ITERATIONS } from '../backupCrypto';

const SECRET = JSON.stringify({ address: '123 Example St', note: 'Bücher 💰 private' });
const PASS = 'correct horse battery';

describe('encrypted backups', () => {
  it('round-trips with the right passphrase', async () => {
    const file = await encryptBackup(SECRET, PASS);
    expect(await decryptBackup(file, PASS)).toEqual({ ok: true, plaintext: SECRET });
  });

  it('round-trips a backup larger than one encoding chunk', async () => {
    const big = 'x'.repeat(250_000);
    const file = await encryptBackup(big, PASS);
    expect(await decryptBackup(file, PASS)).toEqual({ ok: true, plaintext: big });
  });

  it('accepts a passphrase with non-English characters', async () => {
    const file = await encryptBackup(SECRET, 'пароль-שלום-long');
    expect((await decryptBackup(file, 'пароль-שלום-long')).ok).toBe(true);
  });

  it('never contains the data or the passphrase in readable form', async () => {
    const file = await encryptBackup(SECRET, PASS);
    expect(file).not.toContain('Example');
    expect(file).not.toContain(PASS);
    expect(atob(JSON.parse(file).ciphertext)).not.toContain('Example');
  });

  it('uses the recommended work factor', async () => {
    expect(JSON.parse(await encryptBackup(SECRET, PASS)).kdf.iterations).toBe(PBKDF2_ITERATIONS);
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });

  it('uses a fresh salt and IV every time', async () => {
    const a = JSON.parse(await encryptBackup(SECRET, PASS));
    const b = JSON.parse(await encryptBackup(SECRET, PASS));
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.iv).not.toBe(b.cipher.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('rejects the wrong passphrase', async () => {
    expect(await decryptBackup(await encryptBackup(SECRET, PASS), 'wrong passphrase!')).toEqual({ ok: false, error: 'wrong-passphrase' });
  });

  it('rejects an edited ciphertext', async () => {
    const file = JSON.parse(await encryptBackup(SECRET, PASS));
    const bytes = Uint8Array.from(atob(file.ciphertext), (c) => c.charCodeAt(0));
    bytes[0] ^= 1;
    file.ciphertext = btoa(String.fromCharCode(...bytes));
    expect((await decryptBackup(JSON.stringify(file), PASS)).ok).toBe(false);
  });

  it('rejects a file whose work factor was edited', async () => {
    const file = JSON.parse(await encryptBackup(SECRET, PASS));
    file.kdf.iterations = 700_000;
    expect((await decryptBackup(JSON.stringify(file), PASS)).ok).toBe(false);
  });

  it.each([1000, 99_999, 50_000_000, 1.5])('refuses an unsafe work factor of %s', async (iterations) => {
    const file = JSON.parse(await encryptBackup(SECRET, PASS));
    file.kdf.iterations = iterations;
    expect(await decryptBackup(JSON.stringify(file), PASS)).toEqual({ ok: false, error: 'invalid' });
  });

  it('recognizes only its own format', async () => {
    expect(isEncryptedBackup(await encryptBackup(SECRET, PASS))).toBe(true);
    expect(isEncryptedBackup('hello')).toBe(false);
    expect(isEncryptedBackup('{"format":"moisha-export"}')).toBe(false);
    expect(await decryptBackup('hello', PASS)).toEqual({ ok: false, error: 'invalid' });
  });

  it('reports bad encoding as invalid rather than crashing', async () => {
    const file = JSON.parse(await encryptBackup(SECRET, PASS));
    file.ciphertext = '%%%not base64%%%';
    expect(await decryptBackup(JSON.stringify(file), PASS)).toEqual({ ok: false, error: 'invalid' });
  });
});
