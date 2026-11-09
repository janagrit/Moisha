import { Workbox } from 'workbox-window';

export interface PwaHandle {
  applyUpdate: () => void;
  checkForUpdate: () => void;
}

/** Registers the offline worker. Returns null where it cannot run, and the app works without it. */
export function registerPwa(onUpdateReady: () => void): PwaHandle | null {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return null;

  const workbox = new Workbox('./sw.js', { scope: './' });
  workbox.addEventListener('waiting', onUpdateReady);
  workbox.register().catch(() => {
    // The app still runs online. It just will not open offline.
  });

  return {
    applyUpdate: () => {
      workbox.addEventListener('controlling', () => window.location.reload());
      workbox.messageSkipWaiting();
    },
    checkForUpdate: () => {
      // A failed check, for example while offline, leaves the cached version in place.
      workbox.update().catch(() => undefined);
    },
  };
}
