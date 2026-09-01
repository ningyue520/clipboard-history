# HANDOFF - ClipboardHistory

> Updated: 2026-09-01
> Repo: https://github.com/ningyue520/clipboard-history (private)
> Branch: main, Tags: v1.0, v1.1

## Current Status

- v1.2.0 is complete. Installer: `dist/v1.2/历史粘贴板 Setup 1.2.0.exe`; local installation verified and app launched.
- Runtime data remains compatible; no existing `entries.json` reset or migration rewrite is required.

## v1.2 Features

1. Silent auto-launch: `silentLaunch` setting, tray-only startup with `--silent-launch`, and normal visible manual launches.
2. Window lock: titlebar lock control, persisted `windowLocked`, position lock only.
3. Card actions: star/delete controls only; double-click copies any card; image single-click delays preview and double-click cancels preview before copying.
4. Favorites: `all/text/image` filters, compact note input up to 60 characters, and note retention through unfavorite/refavorite.
5. Text/settings: long-text expand/collapse, collapsible usage guide, v1.2 footer, rounded filters/scrollbar.
6. Shortcut: accepts single keys or modifier combinations; Backspace/Delete clears recording.

## v1.1 Features

1. Titlebar close button (`close-window` IPC); close behavior selectable in settings: exit (default) or minimize-to-tray (`closeToTray`, default false).
2. Light motion: card entrance stagger, button press feedback, panel pop, window show fade; frosted glass search/tabs/panel with readable solid cards.
3. Image preview: standalone window (~80% work area), image fully fit; wheel zoom 1-8x centered on cursor, drag pan, click anywhere to shrink-to-fit, click again to close; ESC closes.
4. Favorites replace pin: `isFavorite` (auto-migrated from `isPinned` on load), favorites never expire, hidden from "all" tab, favorite tab filter, star badge.
5. Removed "paste now" (paste-entry IPC chain deleted).

## v1.1 Fixes

- second-instance crash during quit: guarded with `app.isQuiting`; global `uncaughtException` logs instead of dialog.

## IPC Surface

- invoke: get-state, set-settings, toggle-favorite, set-entry-note, delete-entry, clear-expired, copy-entry, preview-image
- one-way: shortcut-capture-start, shortcut-capture-end, minimize-window, close-window
- renderer events: entries-updated, focus-search, window-shown

## Packaging

```
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
npx electron-builder --config.win.signAndEditExecutable=false
```

Copy the new exe into `dist/v1.2/`; keep older installers untouched.

## Runtime Data

%APPDATA%/历史粘贴板/{settings.json, entries.json, images/, window.json}
