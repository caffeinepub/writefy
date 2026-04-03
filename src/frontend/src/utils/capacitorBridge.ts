// ============================================================
// Capacitor Bridge — Web-Compatible Shim
// When running in a native Capacitor shell, this module can be
// swapped for the real @capacitor/* packages. For now (web build)
// every API is implemented with its closest Web Platform equivalent.
// ============================================================

/** Always false in the pure-web build. Set to true once native shell wraps the app. */
export const isCapacitorAvailable = false;

// ── Notification ─────────────────────────────────────────────

export function checkNotificationPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

/**
 * Send a notification.
 * • If the app is in the foreground and permission is granted, uses the
 *   Web Notifications API directly.
 * • Posts to the Service Worker via `showNotification` for background
 *   delivery (Android WebView / Chrome).
 */
export async function sendNotification(
  title: string,
  body: string,
): Promise<void> {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    // Prefer service worker notification (works when app is backgrounded)
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      // @ts-ignore — showNotification is on ServiceWorkerRegistration
      await registration.showNotification(title, {
        body,
        icon: "/assets/generated/icon-192.dim_192x192.png",
        badge: "/assets/generated/icon-192.dim_192x192.png",
      });
      return;
    }
  } catch {
    // Fall through to direct notification
  }

  // Fallback: direct Web Notification (foreground)
  try {
    new Notification(title, { body });
  } catch (e) {
    console.warn("[Notification] Failed to show notification:", e);
  }
}

/**
 * Post a message to the service worker asking it to show a notification.
 * Useful for timer/background-save scenarios.
 */
export async function postNotificationToSW(
  title: string,
  body: string,
): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: "SHOW_NOTIFICATION",
      title,
      body,
    });
  } catch {
    // Silent
  }
}

// ── File / Blob Save ─────────────────────────────────────────

/**
 * Android-compatible file download.
 * Creates a Blob and triggers a browser download — no special permission
 * handshake required on Android Chrome / WebView.
 */
export function saveFileBlob(
  filename: string,
  content: string,
  mimeType = "application/octet-stream",
): void {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 200);
  } catch (e) {
    console.warn("[saveFileBlob] Failed:", e);
  }
}

// ── Preferences (Capacitor-compatible localStorage wrapper) ──

/**
 * Read a preference value.
 * Maps to `localStorage.getItem` in the web build;
 * replace with `Preferences.get` from @capacitor/preferences in native.
 */
export function getPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a preference value.
 */
export function setPreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    console.warn("[Preferences] setPreference failed for key:", key);
  }
}

/**
 * Remove a preference value.
 */
export function removePreference(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    console.warn("[Preferences] removePreference failed for key:", key);
  }
}
