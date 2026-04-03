# Writefy – Capacitor Native Build + PWA Upgrades

## Current State

- React/TypeScript/Vite frontend with Spotify-inspired dark UI
- Persistence via browser localStorage, IndexedDB, and the File System Access API (desktop browsers only)
- `useFileSystem.ts` uses `window.showDirectoryPicker` for folder selection
- Standard `window.Notification` / browser notification APIs in use
- No service worker, no manifest.json, no offline caching
- `useLocalStorage.ts` wraps `window.localStorage` directly
- Settings panel, TopBar, and App.tsx manage storage/sync status
- No permission request flow exists

## Requested Changes (Diff)

### Add
- `src/frontend/public/manifest.json` — PWA manifest with icons, name, display, start_url, theme_color
- `src/frontend/public/service-worker.js` — Workbox-style service worker using Cache API to cache HTML/CSS/JS/fonts/images for offline use; uses `self.registration.showNotification` for background timer notifications
- `src/frontend/src/utils/capacitorBridge.ts` — Thin adapter that detects Capacitor environment and bridges:
  - Notifications → `@capacitor/local-notifications` (if Capacitor) or Web Notifications API (if PWA)
  - File save → Blob download trigger (Android-compatible approach, replaces `showSaveFilePicker`)
  - Preferences → wraps `@capacitor/preferences` (if Capacitor) or falls back to `localStorage`
- `src/frontend/src/components/PermissionManager.tsx` — Startup permission screen that checks/requests Notifications and Storage permissions; shown only once on first launch (persisted via Preferences); dismissible
- Update `src/frontend/index.html` — add `<link rel="manifest">`, meta theme-color, apple-mobile-web-app tags
- Update `src/frontend/src/hooks/useLocalStorage.ts` — use `capacitorBridge.getPreference/setPreference` to back storage with Capacitor Preferences when available
- Update `src/frontend/src/App.tsx` — mount `<PermissionManager>`, replace `window.showSaveFilePicker`-based logic with blob download approach via `capacitorBridge.saveFile`
- Update `src/frontend/src/utils/storage.ts` — replace `persistFolderHandle`/`restoreFolderHandle` with Preferences-backed path storage (Capacitor can't persist FS handles natively)
- Update `src/frontend/vite.config.js` — output service worker to public, configure build for PWA
- Update `src/frontend/package.json` — add `workbox-window`, `workbox-core`, `workbox-routing`, `workbox-strategies`, `workbox-precaching` as devDependencies (CDN-based SW uses importScripts or inline Workbox strategies)

### Modify
- `useFileSystem.ts` — add Capacitor Filesystem fallback alongside existing File System Access API
- `SettingsPanel.tsx` — surface new "Permissions" section showing notification/storage grant status
- `main.tsx` — register service worker on mount

### Remove
- Direct `window.showSaveFilePicker` calls (replaced by blob download)
- Direct `window.Notification` or `new Notification()` calls (replaced by capacitorBridge)

## Implementation Plan

1. Create `capacitorBridge.ts` — detects `window.Capacitor`, wraps LocalNotifications, Filesystem, Preferences with web fallbacks
2. Create `manifest.json` and `service-worker.js` in `public/` — manifest with PWA metadata; service worker with Cache API for offline-first, plus `showNotification` support
3. Update `index.html` — add manifest link, theme-color meta, viewport meta fixes for mobile
4. Update `main.tsx` — register service worker
5. Create `PermissionManager.tsx` — one-time startup screen for requesting Notifications + Storage; uses Preferences to persist "already asked" flag
6. Update `useLocalStorage.ts` — async Preferences bridge with localStorage fallback
7. Update `App.tsx` — wire PermissionManager, replace file save calls with blob download helper
8. Update `storage.ts` — persist master folder path string via Preferences (not FS handle)
9. Update `SettingsPanel.tsx` — add Permissions status row
10. Update `vite.config.js` — no major changes needed (service worker is a static file in public/)
11. Update `package.json` — add workbox deps
