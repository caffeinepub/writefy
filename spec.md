# Writefy Phase 5 — Precision Fixes

## Current State
Writefy is a professional screenwriting/novel app with per-line typed editor, 12-theme gallery, horizontally scrollable element toolbar, File System Access API integration, PDF export, writing metrics, OutlinerDrawer with scene list and stats, and a 3-dot project menu with double-confirm delete.

Key files:
- `src/frontend/src/components/Editor.tsx` — per-line editor, handles keyboard events, slugline auto-detect, sticky keyboard toolbar
- `src/frontend/src/components/OutlinerDrawer.tsx` — right-side drawer with scene list and stats dashboard
- `src/frontend/src/components/SettingsPanel.tsx` — settings with theme grid and mobile keyboard toggle
- `src/frontend/src/components/TopBar.tsx` — top navigation with logo, folder link, settings
- `src/frontend/src/components/Sidebar.tsx` — left sidebar with project list (full-width row click already implemented)
- `src/frontend/src/hooks/useDocuments.ts` — localStorage persistence via useLocalStorage hook
- `src/frontend/src/hooks/useTheme.ts` — 12 theme definitions + THEMES array

## Requested Changes (Diff)

### Add
- **Smart Slugline Auto-Prefix**: When user types 'INT' or 'EXT' at start of a slugline line, auto-append '. ' (period + space) so it reads 'INT. ' or 'EXT. '. This fires in the `handleInput` handler inside `ScriptLineEditor` or in `handleLineKeyDown` when Spacebar is pressed after 'INT' or 'EXT'.
- **Smart Slugline Auto-Separator**: When cursor is in a Slugline line, if user presses Spacebar after typing a location (detected as: text already contains 'INT. ' or 'EXT. ', no hyphen yet, and user is about to continue), automatically insert ' - ' before the next word when the next chars typed are DAY/NIGHT. Simpler implementation: after pressing Space in a slugline that has a location but no hyphen yet, automatically insert ' - ' if the current text pattern suggests it (user typed a location word after INT./EXT.).
- **ACT > CHAPTER > SCENE Hierarchy** in OutlinerDrawer: Replace the flat scene list with a collapsible tree — ACT > CHAPTER > SCENES. Store acts/chapters/scenes in app state (localStorage). Provide UI to add Acts, add Chapters under Acts, and scenes auto-assign to the selected act/chapter. Scenes from sluglines populate under the selected chapter.
- **Glow Settings in SettingsPanel**: Three sliders:
  - Glow Intensity (0–100, default 60) — controls the `drop-shadow` blur radius and opacity
  - Glow Color (radio/select: Neon Accent / White / Gold / Cyan) — controls the glow color
  - Glow Transparency (0–100, default 60) — controls alpha of the glow
- **High Contrast Day Theme**: Add a new theme 'High Contrast Day' to THEMES array: pure white background, solid blue active line indicator (no glow, just a colored border/background). In index.css, when this theme is active, override the active line glow to `none` and use a solid blue left-border.
- **Last Saved timestamp**: In TopBar (top right area, near settings button), show small text 'Last Saved: HH:MM AM/PM · MMM D' that updates whenever a save happens. Pass `lastSaved: Date | null` prop to TopBar.
- **Auto-Save interval**: In App.tsx or useDocuments, add a `useEffect` that triggers a 'hard save' (forces a localStorage write) every 60 seconds. Also ensure every keystroke (content/lines change) immediately updates localStorage (the current debounce of 300ms is fine for UI, but the localStorage write must be immediate on each change).
- **visualViewport toolbar positioning**: In Editor.tsx, when `stickyKeyboard=true`, instead of relying solely on `env(keyboard-inset-height, 0px)`, add a `useEffect` that listens to `window.visualViewport.resize` and sets the toolbar's `bottom` to `window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop` so it sits exactly above the software keyboard on mobile browsers.

### Modify
- **OutlinerDrawer width**: Ensure it always opens at EXACTLY `100vw` on mobile and `300px` on desktop with no spring animation glitch causing partial display. Use `width: isMobile ? '100vw' : '300px'` and ensure the motion animation starts from `x: '100%'` and ends at `x: 0`. On mobile, also ensure `position: fixed` (not absolute) to cover the full screen.
- **Theme buttons in SettingsPanel**: Change from the current 2-column grid of square box cards to a 1-column (or 2-column at most) list of horizontal pill-shaped buttons. Each pill shows: color dot + theme name + active indicator on the right. Compact, minimal height per item.
- **Slugline auto-detect enhancement**: After Enter on a Slugline line, `ELEMENT_AUTO_NEXT['slugline']` already maps to `'action'` — verify this is working and add explicit test in `handleLineKeyDown`.
- **Editor glow**: Wire the glow intensity/color/transparency settings from SettingsPanel into the active line's `filter` style in `getLineStyle`. Use CSS variables or pass props from App.tsx.
- **High Contrast Day theme**: When the active theme is 'high-contrast-day', disable glow on the active line and instead show a solid blue `borderLeft: '4px solid #1a6fe8'` with a very light blue background tint.

### Remove
- Remove the 'Tab cycles' hint label from the element toolbar (replaced by the active element indicator above). Keep the indicator badge.

## Implementation Plan

1. **useDocuments / App.tsx — Auto-save & Last Saved**:
   - Add `lastSaved: Date | null` state to App.tsx, updated whenever `handleContentChange` or `handleLinesChange` fires.
   - Add a `useEffect` interval (60s) that forces a re-write of documents to localStorage as a 'hard save' (call `setDocuments` with current value).
   - Pass `lastSaved` to `TopBar` and render it as small text in the top-right area.

2. **TopBar.tsx — Last Saved display**:
   - Add `lastSaved?: Date | null` prop
   - Render small elegant text near the settings button: 'Last Saved: HH:MM · MMM D'

3. **useTheme.ts + SettingsPanel.tsx — Glow settings & High Contrast Day theme**:
   - Add 'high-contrast-day' to THEMES with white bg, blue accent, no glow flag
   - Add `glowIntensity`, `glowColor`, `glowTransparency` settings stored in localStorage
   - Export a `useGlowSettings` hook or inline the state in App.tsx
   - Pass glow settings to Editor via props
   - In SettingsPanel, replace theme grid with pill list, add glow sliders section

4. **Editor.tsx — Smart Slugline logic + glow props + visualViewport**:
   - In `handleLineKeyDown`, when `e.key === ' '` (Space) on a slugline:
     - If text is exactly 'INT' or 'EXT' → insert '. ' instead of space
     - If text has 'INT. [LOCATION]' and no ' - ' → insert ' - ' instead of space (preparing for DAY/NIGHT)
   - In `getLineStyle`, accept glow settings and override filter styles accordingly
   - For high-contrast-day theme, disable glow, add solid border
   - For `stickyKeyboard` toolbar, add visualViewport listener for `bottom` positioning

5. **OutlinerDrawer.tsx — Full-width fix + ACT>CHAPTER>SCENE hierarchy**:
   - Change from `position: absolute` to `position: fixed` on mobile to ensure true 100vw coverage
   - Replace flat slugline list with Act > Chapter > Scene tree
   - Add `acts` state (array of `{ id, name, chapters: [{ id, name, scenes: string[] }] }`)
   - Persist in localStorage
   - UI: collapsible rows, add-act button, add-chapter button per act, scenes from document sluglines assign to active chapter

6. **SettingsPanel.tsx — Pill themes + Glow sliders**:
   - Redesign theme section: single-column pill list (full-width horizontal buttons)
   - Add Glow Settings section with three labeled sliders
