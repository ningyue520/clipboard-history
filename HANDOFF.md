# HANDOFF - ClipboardHistory

> Updated: 2026-08-30
> Repo: https://github.com/ningyue520/clipboard-history (private)
> Branch: main, Tag: v1.0, Latest: b10cf01

## Current Status

- v1.0 is complete, tagged, and pushed. Working tree is clean.
- Verified end-to-end: text/image capture, card rendering, search, pin, delete, copy, paste, retention switching, settings panel, tray, global shortcut recording + invocation, offline OCR, minimize, tab navigation.
- NSIS installer rebuilt at dist/历史粘贴板 Setup 1.0.0.exe with all fixes and unpacked traineddata.

## Fixed in v1.0

- Renderer crash "Identifier api has already been declared": contextBridge exposes a non-configurable window.api; app.js now wraps its body in an IIFE.
- Letter-key shortcut recording produced invalid accelerators ("Control+Alt+KeyJ"); normalized to Electron format ("Control+Alt+J").
- showWindow() crashed the main process after window destruction; guarded with isDestroyed().
- Packaged-build OCR crashed with "Only absolute URLs are supported" (tesseract.js mis-detects Electron env as non-node); language data now loads via cachePath pointing to asarUnpacked files.

## Known Issues / Debt

1. Shortcut registration failure is silent (console only); no UI feedback.
2. restoreBounds() does not validate monitor bounds; multi-monitor unplug can restore off-screen.
3. Image dedupe compares only the last clipboard key; alternating content can duplicate entries.
4. window.close() (hide-to-tray) detaches the CDP target permanently; automated UI verification needs an app restart afterwards.

## Suggested Next Steps for v1.1

1. Surface shortcut registration failures in the settings UI (add shortcutOk to getPayload).
2. Strengthen dedupe with per-entry key sets.
3. Validate restoreBounds against the visible display area.
4. Optional: GitHub Release workflow that uploads the NSIS installer for v1.x tags.

## Packaging

Use the mirror and the no-sign flag that already worked on this machine:

ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
npx electron-builder --config.win.signAndEditExecutable=false

## Runtime Data

%APPDATA%/历史粘贴板/{settings.json, entries.json, images/, window.json}
