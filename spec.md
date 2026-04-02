# Writefy — Phase 6: Persistent Storage Engine + Day Theme + Project Fix

## Current State
Writefy is a Spotify-dark-themed screenwriting app with:
- 12-theme CSS variable system in SettingsPanel
- Projects listed in Sidebar with 3-dot menus
- localStorage autosave and File System Access API for primary folder storage
- Last Saved timestamp in TopBar
- Per-line formatting objects
- Mobile sticky toolbar with visualViewport detection

## Requested Changes (Diff)

### Add
1. **Day/White Theme** — New theme entry called 'Day' or 'Pure White': `--bg: #FFFFFF`, `--surface: #F4F4F4`, `--text: #111111`, `--accent: #1565C0` (solid blue focus, no neon glow). Add as a pill in the Settings theme gallery.
2. **Dual-Layer Storage Engine**:
   - Layer 1: IndexedDB (via a simple wrapper) saves every change instantly (keystroke, timer, checkbox). Falls back to localStorage.
   - Layer 2: File System Access API folder link — 'Link to Local Folder' button. Saves a `writefy-backup.json` (and per-project `.fountain` files) to the user-selected folder on every debounced save.
3. **Safe-Load Initialization**: On mount/window.onload, check data in order: Local File (if folder is already linked and readable) → IndexedDB → localStorage. Auto-populate editor before user interaction.
4. **Debounced Auto-Save (2s)**: After any change, wait 2 seconds of inactivity then push to: (a) IndexedDB/localStorage, (b) linked local folder if available.
5. **Data Integrity & Safety**:
   - Every save payload includes `lastModified: new Date().toISOString()`.
   - Before writing, verify data is not empty/null — if empty, abort and alert user.
   - `Export Backup` button in Settings: downloads full state as `writefy-backup-[timestamp].json`.
   - `Import Backup` button in Settings: file input that reads a `.json` backup and restores state.
6. **Sync Status Icon** (top-right corner near Last Saved):
   - Green glow dot: saved to local folder successfully.
   - Yellow glow dot: saved to browser memory only (no folder linked or folder write pending).
   - Red pulse dot: save failed or permission required.
7. **Fix Unclickable Project Cards**: Ensure the entire project card in the Sidebar has an `onClick` handler that loads the project. Remove any z-index or pointer-events issues from the 3-dot menu overlay that might be blocking card clicks. The 3-dot menu should only intercept its own button clicks — not the entire card area.

### Modify
- `SettingsPanel.tsx`: Add Day theme pill, Export Backup button, Import Backup button.
- `Sidebar.tsx`: Fix project card click handlers — cards must be fully clickable; the 3-dot menu must not block the card's click zone.
- `TopBar.tsx`: Add the Sync Status glowing dot icon next to Last Saved.
- `App.tsx`: Wire up the Dual-Layer storage engine — IndexedDB reads/writes, File System API folder handle persistence, Safe-Load on mount, debounced auto-save, data integrity checks.

### Remove
- Nothing removed.

## Implementation Plan
1. **Storage utility** (`src/frontend/src/utils/storage.ts`): IndexedDB wrapper (open DB, get/set project data), File System API helpers (requestFolder, readFile, writeFile), debounce helper.
2. **App.tsx**: On mount, run Safe-Load (folder → IndexedDB → localStorage). Wire all state-change side-effects through the debounced save. Track `syncStatus: 'saved' | 'memory' | 'error'`.
3. **TopBar.tsx**: Render a colored dot based on `syncStatus` prop. Green = saved, Yellow = memory, Red = error. Add pulse animation for red.
4. **Sidebar.tsx**: Audit and fix project card onClick. Ensure the 3-dot menu button uses `e.stopPropagation()` so it doesn't interfere, and the card's own click area is clean and covers the full rectangle.
5. **SettingsPanel.tsx**: Add Day/White theme pill. Add Export Backup (triggers JSON download) and Import Backup (file input) buttons in a Data section.
6. Validate and build.
