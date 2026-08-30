# MEMORY.md

## Last updated
2026-08-30

## Decisions
- Electron desktop clipboard manager; local-only persistence under userData.
- Retention: 1/3/5 days, default 3; expired entries move to an "expired" tab instead of auto-delete.
- v1.1: favorites replace pin (`isFavorite`, auto-migrated from `isPinned`); favorites never expire, sort first, and are hidden from the "all" tab (favorite tab only).
- v1.1: closing the window exits the app by default; `closeToTray` setting switches to hide-to-tray.
- v1.1: image preview opens a standalone window (~80% work area) with wheel zoom 1-8x centered on cursor, drag pan, click to shrink-to-fit, click again to close.
- v1.1: "paste now" removed; card actions are copy / favorite / delete.
- On startup the current clipboard content is recorded as a baseline and not saved as history; only copies made after launch become entries, so fresh installs open blank.
- v1.1 motion is CSS-only (card stagger, press feedback, panel pop, window fade) plus frosted glass on search/tabs/panel; cards stay solid for readability.
- OCR languages: chi_sim + eng.
- UI: macOS-inspired acrylic/glass look with CSS fallback.

## Pitfalls
- No package-lock.json or node_modules existed initially.
- Tesseract downloads language data on first OCR use.
- Windows installer requires a valid app icon; current icon is generated under assets.
- contextBridge.exposeInMainWorld creates a non-configurable window property; a top-level const with the same name in the renderer throws "Identifier has already been declared". Renderer app.js wraps its body in an IIFE to avoid the global declaration conflict.
- Global shortcut accelerators must use Electron format (single letters like "J"), not KeyboardEvent.code format ("KeyJ"); recording UI must normalize to the Electron format or registration fails.
- Global hotkey, tray, and second-instance callbacks must guard win with isDestroyed() before touching the window, or they crash the main process after the window is destroyed.
- Offline OCR loads local traineddata via langPath with gzip:false (local files lack the .gz suffix); packaging must include them via build.files and asarUnpack.
- tesseract.js mis-detects Electron as "electron" (not "node") inside worker threads, so langPath with a Windows path triggers node-fetch "Only absolute URLs" errors; load language data through cachePath pointing at real unpacked files instead.
- Quitting while a second instance starts can fire `second-instance` on the dying instance and crash `showWindow` with "Object has been destroyed"; guard with `app.isQuiting` and keep a global `uncaughtException` logger to avoid modal crash dialogs.
- `apply_patch` heredoc is unreliable from PowerShell on this machine; run it via bash (`shell: bash, login: false`).

## Build Notes
- 
pm run dist can fail on non-admin Windows because winCodeSign extraction needs symlink privileges.
- Workaround used: 
px electron-builder --config.win.signAndEditExecutable=false with ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ to build NSIS without code signing/resource editing.
