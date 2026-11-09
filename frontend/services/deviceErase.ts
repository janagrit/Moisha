export interface EraseReport {
  storage: boolean;
  caches: boolean;
  serviceWorkers: boolean;
  databases: boolean;
}

export const eraseSucceeded = (report: EraseReport): boolean =>
  report.storage && report.caches && report.serviceWorkers && report.databases;

async function eraseStorage(): Promise<boolean> {
  window.localStorage.clear();
  window.sessionStorage.clear();
  return window.localStorage.length === 0 && window.sessionStorage.length === 0;
}

async function eraseCaches(): Promise<boolean> {
  if (!('caches' in window)) return true;
  await Promise.all((await caches.keys()).map((name) => caches.delete(name)));
  return (await caches.keys()).length === 0;
}

async function eraseServiceWorkers(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return true;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const results = await Promise.all(registrations.map((registration) => registration.unregister()));
  return results.every(Boolean);
}

async function eraseDatabases(): Promise<boolean> {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return true;
  const databases = await indexedDB.databases();
  await Promise.all(
    databases.flatMap(({ name }) =>
      name
        ? [
            new Promise<void>((resolve, reject) => {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
              request.onblocked = () => resolve();
            }),
          ]
        : [],
    ),
  );
  return true;
}

async function attempt(step: () => Promise<boolean>): Promise<boolean> {
  try {
    return await step();
  } catch {
    return false;
  }
}

/**
 * Clears everything this site has stored in this browser. Each step runs even if another fails,
 * and browser storage goes first because it holds the data. Reports what could be confirmed.
 */
export async function eraseThisDevice(): Promise<EraseReport> {
  const storage = await attempt(eraseStorage);
  const [cachesCleared, databases, serviceWorkers] = await Promise.all([
    attempt(eraseCaches),
    attempt(eraseDatabases),
    attempt(eraseServiceWorkers),
  ]);
  return { storage, caches: cachesCleared, serviceWorkers, databases };
}
