const PROBE_TIMEOUT_MS = 4000;

/**
 * navigator.onLine only knows whether the device has a network, not whether Moisha's site can be
 * reached. This asks the site itself. A redirect, such as to a login page, counts as unreachable.
 */
export async function canReachSite(): Promise<boolean> {
  if (!navigator.onLine) return false;
  if (import.meta.env.DEV) return true;
  try {
    const response = await fetch(`./manifest.webmanifest?reachable=${Date.now()}`, {
      cache: 'no-store',
      redirect: 'error',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
