# HANDOFF - ClipboardHistory

> Updated: 2026-08-30
> Repo: D:/Codexapp/ClipboardHistory
> Branch: main
> Last commit: 376a56e init: clipboard history app

## Current Status

- Electron clipboard history app for Windows.
- Baseline features are implemented: text/image capture, search, pin, delete, retention, tray, global shortcut, OCR, and local persistence.
- Current working tree contains unfinished UI refactoring and shortcut capture changes.
- Main UI is currently blocked by a renderer-side script error.

## Blocker

- Symptom: history cards do not render, and settings UI cannot be used reliably.
- Console error observed: SyntaxError: Identifier 'api' has already been declared at renderer/app.js.
- renderer/app.js currently contains only one top-level const api = window.api;.
- Next engineer should confirm whether the script is being evaluated twice or whether a preload/global binding conflicts with the renderer script's api declaration.
- The main process still appears to work: %APPDATA%/历史粘贴板/entries.json contains captured entries, so this is primarily a renderer/UI issue.

## Uncommitted Work

- main.js: smaller frameless window, max size 520x520, single-instance lock, retention validation, custom shortcut IPC, and clipboard/image dedupe improvements.
- preload.js: exposes shortcut capture pause/resume controls.
- renderer/index.html: compact floating-window layout, settings panel, and custom shortcut input.
- renderer/app.js: simplified list rendering, settings sync, and shortcut capture handler.
- renderer/styles.css: light solid/glass-inspired styling, drag/no-drag regions, and compact cards.

## Immediate Next Steps

1. Fix the renderer api declaration/runtime issue.
2. Verify history cards render after copying text and images.
3. Verify search, pin, delete, copy, paste, retention switching, and settings panel.
4. Verify custom shortcut recording and global shortcut invocation.
5. Clean temporary debug files: debug-*.js and debug-render.png.
6. Decide whether to keep chi_sim.traineddata / eng.traineddata; if keeping them for offline OCR, wire them through langPath.
7. Run checks and create a stage commit.

## Runtime Data

- %APPDATA%/历史粘贴板/settings.json
- %APPDATA%/历史粘贴板/entries.json
- %APPDATA%/历史粘贴板/images/
- %APPDATA%/历史粘贴板/window.json

## Packaging Note

The last successful NSIS build used ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ and:

npx electron-builder --config.win.signAndEditExecutable=false

This avoids the non-admin Windows symlink issue with winCodeSign, but the executable is unsigned and editable metadata is disabled.
