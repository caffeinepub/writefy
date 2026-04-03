# Writefy — Phase 7: Mechanical Fixes + Master Folder Storage

## Current State

Writefy is a screenwriting app with:
- Sidebar project list with clickable rows (absolute-positioned transparent button overlay)
- Element type toolbar (Slugline, Action, etc.) in Editor for screenplay mode
- Mode toggle (Screenplay/Novel) in BottomBar visible whenever activeDocument exists
- Dual-layer storage: IndexedDB + File System API via `requestFolder()` in `storage.ts`
- `useFileSystem` hook for per-file saves; `folderHandle` state in App.tsx for batch JSON saves
- TopBar shows small sync dot (idle/saved/memory/error) and last saved timestamp
- SettingsPanel has Export/Import backup + Link Folder button
- No folder handle persistence across page reloads (loses link on refresh)
- File saved as `writefy-backup.json`; master data file named `naksha_master_data.json` not yet used
- No Test Connection button in Settings
- No detailed 3-state Storage Status badge in TopBar
- No IndexedDB shadow copy fallback alert

## Requested Changes (Diff)

### Add
- **Storage Status badge** in TopBar top-right: 3 states — "No Folder Linked" (red), "Linked: [FolderName]" (green glowing), "Syncing..." (rotating sync icon, shows 1 second after autosave)
- **Test Connection button** in SettingsPanel > Data & Backup section: writes a tiny test file, deletes it, shows toast: "Storage Verified: All systems synced to [FolderName]"
- **Shadow copy / fail-safe**: when folder becomes unreachable on save, alert user "Warning: Master Folder moved. Using Internal Backup." and ask to re-link
- **Folder handle persistence**: store folder handle ID in IndexedDB so app can re-link on reload without asking user again (using `id` property of File System Access API handle)
- **`onTestConnection` prop** thread from App.tsx → SettingsPanel
- **`syncStatus` prop extended** with `"syncing"` state (rotating icon, clears after 1s back to `"saved"`) - add `"syncing"` to SyncStatus type

### Modify
- **Project card click in Sidebar**: the current absolute button overlay (z-index 0) is being blocked by inner content (z-index 1). Fix by raising the transparent button to z-index 3 and making inner content elements `pointer-events: none` (except the 3-dot menu which stays z-index 4 with `pointer-events: auto`)
- **Element toolbar click (keyboard stays up)**: when a toolbar button is clicked on mobile (`touchstart`/`mousedown`), use `e.preventDefault()` to prevent keyboard dismissal. The textarea/contenteditable should keep focus.
- **Mode toggle visibility**: in BottomBar, the Screenplay/Novel mode toggle buttons should only appear when `activeView === "write"` — pass `activeView` from Editor up through a callback, or use a simpler heuristic: hide the mode toggle when outliner drawer is open OR when user is in "Outline" tab. Since BottomBar doesn't know the view, add an `isWriting` boolean prop to BottomBar (true = show toggle, false = hide it). In App.tsx, track `editorView` state ("write"|"outline") and pass `isWriting={editorView === "write"}` to BottomBar. Editor should call an `onViewChange` callback when switching between Write and Outline tabs.
- **Master file name**: change `BACKUP_FILENAME` from `"writefy-backup.json"` to `"naksha_master_data.json"` in App.tsx
- **Select Folder button glow**: in SettingsPanel, when folder is linked, add animated glow/pulse CSS effect to the Link Folder button
- **Folder path display**: show full folder path or name in high-contrast bold white/bright color so it's clearly visible
- **SyncStatus type** in `storage.ts`: add `"syncing"` to the union type

### Remove
- Nothing removed; only fixes and additions

## Implementation Plan

1. **storage.ts**: Add `"syncing"` to `SyncStatus` type. Add `persistFolderHandle(handle)` and `restoreFolderHandle()` functions using IndexedDB to store/retrieve the FileSystemDirectoryHandle.

2. **App.tsx**:
   - Change `BACKUP_FILENAME` to `"naksha_master_data.json"`
   - Add `editorView` state (`"write" | "outline"`) + `handleViewChange` callback
   - Pass `onViewChange={handleViewChange}` to Editor
   - On mount, call `restoreFolderHandle()` and re-link silently if available
   - When autosave completes, set `syncStatus = "syncing"` briefly then `"saved"`
   - If `saveToFolder` fails (folder unreachable), show alert toast with re-link option
   - Add `handleTestConnection` function: writes test file, deletes it, shows toast
   - Pass `onTestConnection`, `isWriting={editorView === "write"}` to relevant components

3. **Editor.tsx**:
   - Add `onViewChange?: (view: "write" | "outline") => void` prop
   - Call `onViewChange` when `setActiveView` is called
   - Toolbar buttons: add `onMouseDown={e => e.preventDefault()}` to prevent keyboard dismiss on mobile

4. **Sidebar.tsx**:
   - Fix z-index layering: raise transparent click button to `zIndex: 3`, keep inner content at `zIndex: 1` with `pointerEvents: "none"`, keep 3-dot menu at `zIndex: 4` with `pointerEvents: "auto"`

5. **TopBar.tsx**:
   - Replace small sync dot with a proper Storage Status badge:
     - `"idle"` / no folder: red badge "No Folder Linked"
     - `"memory"`: yellow badge "Browser Only"
     - `"syncing"`: rotating sync icon badge
     - `"saved"`: green glowing badge "Linked: [FolderName]"
     - `"error"`: red pulsing badge "Save Failed"
   - Accept `folderName` prop for display in badge

6. **SettingsPanel.tsx**:
   - Add `onTestConnection?: () => void` prop
   - Add Test Connection button after Link Folder button
   - Make linked folder button glow with CSS animation when active
   - Show folder name in high-contrast bold text

7. **BottomBar.tsx**:
   - Add `isWriting?: boolean` prop
   - Wrap mode toggle section with `{isWriting && ...}` conditional
