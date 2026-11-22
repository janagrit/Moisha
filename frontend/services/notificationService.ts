export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermissionState(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function sendBrowserAlertNotification(
  title: string,
  body: string,
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  let permission: BrowserNotificationPermission = Notification.permission;
  if (permission === 'default') {
    permission = await requestBrowserNotificationPermission();
  }
  if (permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: './moisha-logo.png',
          badge: './moisha-logo.png',
          tag: 'moisha-pricing-alert',
        });
        return true;
      }
    }
    new Notification(title, { body, icon: './moisha-logo.png' });
    return true;
  } catch {
    return false;
  }
}
