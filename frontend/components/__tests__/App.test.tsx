import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { exportMemory } from '../../memory/exportImport';
import { createEmptyMemory, type Memory } from '../../memory/schema';
import { MEMORY_KEY } from '../../memory/storage';
import { unlockVault, VAULT_KEY } from '../../memory/vault';
import { AUTO_LOCK_MS } from '../ChatApp';

const shared = vi.hoisted(() => ({ contents: null as string | null }));
vi.mock('../../services/shareFile', () => ({
  shareOrDownload: async (_name: string, contents: string) => {
    shared.contents = contents;
    return 'downloaded';
  },
}));

beforeAll(() => vi.stubGlobal('crypto', webcrypto));

const PASSCODE = 'correct-horse-9';
const SLOW = { timeout: 8000 };

function send(text: string) {
  fireEvent.change(screen.getByLabelText('Message Moisha'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const setField = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

function setUpProperty() {
  tap("Let's set up");
  ['Sam', 'The Rowhouse', '20002', '3', '240', '275', '180'].forEach(send);
}

async function createPasscode() {
  setField('New passcode', PASSCODE);
  setField('Repeat passcode', PASSCODE);
  tap('Create passcode');
  await screen.findByRole('log', undefined, SLOW);
}

async function unlock(passcode = PASSCODE) {
  setField('Passcode', passcode);
  tap('Unlock');
  await screen.findByRole('log', undefined, SLOW);
}

async function openFresh() {
  const view = render(<App />);
  await createPasscode();
  return view;
}

/** Reads what is really saved, the same way a later unlock would. */
async function stored(): Promise<Memory> {
  const opened = await unlockVault(localStorage, PASSCODE);
  if (!opened.ok) throw new Error(opened.error);
  return opened.memory;
}

/** jsdom has no File.text(), which every supported browser does. */
function jsonFile(contents: string, name: string): File {
  const file = new File([contents], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(contents) });
  return file;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('passcode and encryption', () => {
  it('asks for a passcode before anything else, and explains there is no recovery', () => {
    render(<App />);
    expect(screen.queryByRole('log')).toBeNull();
    expect(screen.getByText(/Nobody can reset this passcode/)).toBeTruthy();
    expect(localStorage.length).toBe(0);
  });

  it('refuses weak or mismatched passcodes', () => {
    render(<App />);
    setField('New passcode', 'short');
    setField('Repeat passcode', 'short');
    tap('Create passcode');
    expect(screen.getByRole('alert').textContent).toContain('at least 8');
    setField('New passcode', '1234567890');
    setField('Repeat passcode', '1234567890');
    tap('Create passcode');
    expect(screen.getByRole('alert').textContent).toContain('letters');
    setField('New passcode', PASSCODE);
    setField('Repeat passcode', 'something else');
    tap('Create passcode');
    expect(screen.getByRole('alert').textContent).toContain("don't match");
    expect(localStorage.length).toBe(0);
  });

  it('keeps nothing readable in browser storage', async () => {
    await openFresh();
    setUpProperty();
    await waitFor(async () => expect((await stored()).properties).toHaveLength(1), SLOW);
    const everything = JSON.stringify({ ...localStorage });
    // Only strings long enough that random ciphertext can't contain them by chance.
    for (const secret of ['Rowhouse', 'hostName', PASSCODE, 'minPriceUsd']) expect(everything).not.toContain(secret);
    expect(localStorage.getItem(MEMORY_KEY)).toBeNull();
  }, 20000);

  it('requires the passcode after the app is closed, and remembers everything', async () => {
    const first = await openFresh();
    setUpProperty();
    await waitFor(async () => expect((await stored()).properties).toHaveLength(1), SLOW);
    first.unmount();

    render(<App />);
    expect(screen.queryByRole('log')).toBeNull();
    expect(document.body.textContent).not.toContain('Rowhouse');
    await unlock();
    expect(screen.getByRole('log').textContent).toContain('The Rowhouse is in the book');
  }, 20000);

  it('rejects a wrong passcode and stays locked', async () => {
    const first = await openFresh();
    first.unmount();
    render(<App />);
    setField('Passcode', 'not the passcode');
    tap('Unlock');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain("didn't open"), SLOW);
    expect(screen.queryByRole('log')).toBeNull();
    await unlock();
  }, 20000);

  it('encrypts data saved before encryption, then removes the plain copy', async () => {
    const legacy: Memory = {
      ...createEmptyMemory(new Date()),
      preferences: { hostName: 'Rivka', managerName: null, soundOn: false, horizonDays: 30 },
    };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(legacy));
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Protect what I already know' })).toBeTruthy();
    expect(localStorage.getItem(MEMORY_KEY)).toContain('Rivka');
    await createPasscode();
    expect(localStorage.getItem(MEMORY_KEY)).toBeNull();
    expect(localStorage.getItem(VAULT_KEY)).not.toContain('Rivka');
    expect((await stored()).preferences.hostName).toBe('Rivka');
  }, 20000);

  it('keeps plain data and reports it if encryption cannot be saved', async () => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(createEmptyMemory(new Date())));
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    render(<App />);
    setField('New passcode', PASSCODE);
    setField('Repeat passcode', PASSCODE);
    tap('Create passcode');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('out of storage'), SLOW);
    write.mockRestore();
    expect(localStorage.getItem(MEMORY_KEY)).not.toBeNull();
    expect(screen.queryByRole('log')).toBeNull();
  }, 20000);

  it('explains and never overwrites damaged saved data', () => {
    localStorage.setItem(VAULT_KEY, 'garbage');
    render(<App />);
    expect(screen.getByRole('alert').textContent).toContain('damaged');
    expect(localStorage.getItem(VAULT_KEY)).toBe('garbage');
    expect(screen.queryByRole('log')).toBeNull();
  });
});

describe('automatic lock', () => {
  it('locks after inactivity and removes the data from the screen', async () => {
    await openFresh();
    setUpProperty();
    const start = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(start + AUTO_LOCK_MS + 1000);
    fireEvent(document, new Event('visibilitychange'));
    await screen.findByLabelText('Passcode', undefined, SLOW);
    expect(document.body.textContent).not.toContain('Rowhouse');
  }, 20000);

  it('stays open while the host is active', async () => {
    await openFresh();
    const start = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start + AUTO_LOCK_MS - 1000);
    fireEvent.pointerDown(window);
    clock.mockReturnValue(start + AUTO_LOCK_MS + 1000);
    fireEvent(document, new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('log')).toBeTruthy();
  }, 20000);

  it('locks immediately from the header, saving first', async () => {
    await openFresh();
    setUpProperty();
    tap('Lock Moisha');
    await screen.findByLabelText('Passcode', undefined, SLOW);
    expect((await stored()).properties).toHaveLength(1);
  }, 20000);
});

describe('erase this device', () => {
  it('asks before erasing from the chat, then clears everything', async () => {
    await openFresh();
    setUpProperty();
    await waitFor(async () => expect((await stored()).properties).toHaveLength(1), SLOW);
    tap('Empty nights');
    tap('More');
    tap('Erase this device');
    expect(localStorage.getItem(VAULT_KEY)).not.toBeNull();
    tap('Yes, erase it all');
    await screen.findByText('This device has been erased', undefined, SLOW);
    expect(localStorage.length).toBe(0);
    tap('Set up again');
    expect(screen.getByLabelText('New passcode')).toBeTruthy();
  }, 20000);

  it('can be used when the passcode is forgotten, only after typing ERASE', async () => {
    await openFresh();
    tap('Lock Moisha');
    await screen.findByLabelText('Passcode', undefined, SLOW);
    tap('Forgot your passcode?');
    expect(screen.getByText(/Nobody can recover this passcode/)).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Erase this device' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    setField('Type ERASE to confirm', 'erase');
    expect(button.disabled).toBe(true);
    expect(localStorage.getItem(VAULT_KEY)).not.toBeNull();
    setField('Type ERASE to confirm', 'ERASE');
    tap('Erase this device');
    await screen.findByText('This device has been erased', undefined, SLOW);
    expect(localStorage.length).toBe(0);
  }, 20000);
});

describe('a second open tab', () => {
  it('stops immediately when another tab erases the device, and cannot write the data back', async () => {
    await openFresh();
    setUpProperty();
    await waitFor(async () => expect((await stored()).properties).toHaveLength(1), SLOW);

    localStorage.clear();
    fireEvent(window, new StorageEvent('storage', { key: VAULT_KEY, newValue: null }));
    await screen.findByLabelText('New passcode', undefined, SLOW);
    expect(document.body.textContent).not.toContain('Rowhouse');

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(localStorage.length).toBe(0);
  }, 20000);

  it('ignores storage changes that do not remove the data', async () => {
    await openFresh();
    fireEvent(window, new StorageEvent('storage', { key: 'something-else', newValue: null }));
    fireEvent(window, new StorageEvent('storage', { key: VAULT_KEY, newValue: 'updated' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('log')).toBeTruthy();
  }, 20000);
});

describe('the conversation screen', () => {
  it('opens with Moisha, a greeting and no invented numbers', async () => {
    await openFresh();
    expect(screen.getByRole('heading', { name: 'Moisha' })).toBeTruthy();
    const log = screen.getByRole('log');
    expect(log.textContent).toContain("I'm Moisha");
    expect(log.textContent).not.toMatch(/\$\d/);
    expect(screen.getByText('Only checks when this app is open')).toBeTruthy();
  }, 20000);

  it('shows Not yet rather than a made-up price', async () => {
    await openFresh();
    setUpProperty();
    tap('What should I charge?');
    const card = screen.getByRole('region', { name: 'Price for The Rowhouse' });
    expect(within(card).getByText('Not yet', { selector: '.text-3xl' })).toBeTruthy();
    expect(within(card).getByText('$240')).toBeTruthy();
  }, 20000);

  it('keeps sample data out of storage and off the real conversation', async () => {
    await openFresh();
    tap('Show me with sample data');
    expect(screen.getByRole('status').textContent).toContain('SAMPLE DATA');
    expect(screen.getAllByText('Sample data').length).toBeGreaterThan(0);
    expect((await stored()).properties).toEqual([]);
    tap('Leave');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('log').textContent).not.toContain('Sample Rowhouse');
  }, 20000);

  it('does not offer backup, restore or erase in sample mode', async () => {
    await openFresh();
    tap('Show me with sample data');
    tap('More');
    expect(screen.queryByRole('button', { name: 'Back up or share' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Erase this device' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Leave sample data' })).toBeTruthy();
  }, 20000);

  it('labels the header when offline', async () => {
    const spy = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await openFresh();
    expect(screen.getByText('Offline. Using saved data')).toBeTruthy();
    spy.mockRestore();
  }, 20000);
});

describe('backup and restore on an encrypted device', () => {
  const BACKUP_PASS = 'a long family secret';

  async function makeBackup() {
    tap('More');
    tap('Back up or share');
    setField('Passphrase', BACKUP_PASS);
    setField('Repeat passphrase', BACKUP_PASS);
    tap('Encrypt backup');
    await screen.findByRole('button', { name: 'Save or share' }, SLOW);
    tap('Save or share');
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('Encrypted backup file created'));
    return shared.contents!;
  }

  async function loadBackup(file: string, passphrase = BACKUP_PASS) {
    fireEvent.change(screen.getByTestId('restore-file'), { target: { files: [jsonFile(file, 'backup.json')] } });
    await screen.findByRole('dialog', undefined, SLOW);
    setField('Passphrase', passphrase);
    tap('Open backup');
  }

  it('refuses a short or mismatched backup passphrase', async () => {
    await openFresh();
    setUpProperty();
    tap('More');
    tap('Back up or share');
    setField('Passphrase', 'short');
    setField('Repeat passphrase', 'short');
    tap('Encrypt backup');
    expect(screen.getByRole('alert').textContent).toContain('at least 10');
    expect(screen.queryByRole('button', { name: 'Save or share' })).toBeNull();
  }, 20000);

  it('never puts the passphrase or plain data in the file or storage', async () => {
    await openFresh();
    setUpProperty();
    const file = await makeBackup();
    expect(file).not.toContain('Rowhouse');
    expect(file).not.toContain(BACKUP_PASS);
    expect(JSON.stringify({ ...localStorage })).not.toContain(BACKUP_PASS);
  }, 20000);

  it('restores onto a freshly erased device under a new passcode', async () => {
    await openFresh();
    setUpProperty();
    const file = await makeBackup();
    tap('More');
    tap('Erase this device');
    tap('Yes, erase it all');
    await screen.findByText('This device has been erased', undefined, SLOW);
    tap('Set up again');
    setField('New passcode', 'a brand new code');
    setField('Repeat passcode', 'a brand new code');
    tap('Create passcode');
    await screen.findByRole('log', undefined, SLOW);

    await loadBackup(file);
    await screen.findByRole('button', { name: 'Yes, replace it' }, SLOW);
    tap('Yes, replace it');
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('Welcome back, Sam'), SLOW);
    await waitFor(async () => {
      const opened = await unlockVault(localStorage, 'a brand new code');
      expect(opened.ok && opened.memory.properties[0]?.nickname).toBe('The Rowhouse');
    }, SLOW);
  }, 30000);

  it('restores only after the right passphrase and confirmation, encrypts its safety copy, and can undo', async () => {
    await openFresh();
    setUpProperty();
    const file = await makeBackup();
    tap('Empty nights');
    tap('Mark dates');
    tap('Nothing booked');
    await waitFor(async () => expect((await stored()).properties[0].calendarUpdatedOn).toBeTruthy(), SLOW);

    await loadBackup(file, 'not the right one');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain("didn't open"), SLOW);
    expect((await stored()).properties[0].calendarUpdatedOn).toBeTruthy();

    setField('Passphrase', BACKUP_PASS);
    tap('Open backup');
    await screen.findByRole('button', { name: 'Yes, replace it' }, SLOW);
    expect(screen.getByRole('log').textContent).toContain('anything added since');
    expect((await stored()).properties[0].calendarUpdatedOn).toBeTruthy();

    tap('Yes, replace it');
    await screen.findByRole('button', { name: 'Undo that restore' }, SLOW);
    await waitFor(async () => expect((await stored()).properties[0].calendarUpdatedOn).toBeUndefined(), SLOW);
    expect(localStorage.getItem('moisha:vault:before-import')).not.toContain('Rowhouse');

    tap('Undo that restore');
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('back the way it was'), SLOW);
    await waitFor(async () => expect((await stored()).properties[0].calendarUpdatedOn).toBeTruthy(), SLOW);
  }, 40000);

  it('leaves everything alone when the restore is declined', async () => {
    await openFresh();
    setUpProperty();
    const file = await makeBackup();
    await waitFor(async () => expect((await stored()).lastBackupAt).toBeTruthy(), SLOW);
    const before = (await stored()).properties;
    await loadBackup(file);
    await screen.findByRole('button', { name: 'Keep what I have' }, SLOW);
    tap('Keep what I have');
    expect((await stored()).properties).toEqual(before);
    expect(localStorage.getItem('moisha:vault:before-import')).toBeNull();
  }, 30000);

  it('still restores an older unencrypted backup, after confirmation', async () => {
    const now = new Date();
    const backup = { ...createEmptyMemory(now), preferences: { hostName: 'Alex', managerName: null, soundOn: false, horizonDays: 30 } };
    await openFresh();
    fireEvent.change(screen.getByTestId('restore-file'), { target: { files: [jsonFile(exportMemory(backup, now), 'backup.json')] } });
    await screen.findByRole('button', { name: 'Yes, replace it' }, SLOW);
    expect((await stored()).preferences.hostName).toBeNull();
    tap('Yes, replace it');
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('Welcome back, Alex'), SLOW);
  }, 30000);

  it('rejects a file that is not a backup and changes nothing', async () => {
    await openFresh();
    fireEvent.change(screen.getByTestId('restore-file'), { target: { files: [jsonFile('hello', 'notes.json')] } });
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain("isn't"), SLOW);
    expect((await stored()).properties).toEqual([]);
  }, 20000);
});
