import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eraseSucceeded, eraseThisDevice } from '../deviceErase';

function stubBrowser(options: { unregister?: boolean; cacheFailure?: boolean } = {}) {
  const names = new Set(['workbox-precache', 'other']);
  const unregister = vi.fn().mockResolvedValue(options.unregister ?? true);
  const deleteDatabase = vi.fn((name: string) => {
    const request = { result: name } as unknown as IDBOpenDBRequest;
    queueMicrotask(() => request.onsuccess?.(new Event('success')));
    return request;
  });
  vi.stubGlobal('caches', {
    keys: async () => {
      if (options.cacheFailure) throw new Error('denied');
      return [...names];
    },
    delete: async (name: string) => names.delete(name),
  });
  vi.stubGlobal('indexedDB', { databases: async () => [{ name: 'db1' }], deleteDatabase });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistrations: async () => [{ unregister }] } });
  return { names, unregister, deleteDatabase };
}

beforeEach(() => {
  localStorage.setItem('moisha:vault', 'secret');
  localStorage.setItem('moisha:vault:before-import', 'secret');
  sessionStorage.setItem('anything', 'x');
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'serviceWorker');
  localStorage.clear();
  sessionStorage.clear();
});

describe('erase this device', () => {
  it('clears storage, caches, databases and service workers', async () => {
    const { names, unregister, deleteDatabase } = stubBrowser();
    const report = await eraseThisDevice();
    expect(report).toEqual({ storage: true, caches: true, serviceWorkers: true, databases: true });
    expect(eraseSucceeded(report)).toBe(true);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(names.size).toBe(0);
    expect(unregister).toHaveBeenCalled();
    expect(deleteDatabase).toHaveBeenCalledWith('db1');
  });

  it('still clears the data when another step fails, and reports the failure', async () => {
    stubBrowser({ cacheFailure: true });
    const report = await eraseThisDevice();
    expect(localStorage.length).toBe(0);
    expect(report.storage).toBe(true);
    expect(report.caches).toBe(false);
    expect(eraseSucceeded(report)).toBe(false);
  });

  it('does not claim a service worker was removed when the browser refused', async () => {
    stubBrowser({ unregister: false });
    expect((await eraseThisDevice()).serviceWorkers).toBe(false);
  });

  it('works where caches and service workers do not exist', async () => {
    const report = await eraseThisDevice();
    expect(eraseSucceeded(report)).toBe(true);
    expect(localStorage.length).toBe(0);
  });
});
