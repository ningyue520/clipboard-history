# AGENTS.md

## Project
- Name: ClipboardHistory
- Product name: 历史粘贴板
- Target: Windows 10/11 desktop, keyboard/mouse
- Repository root: ClipboardHistory

## Stack
- Electron 33, Node.js 24, npm
- Main process: CommonJS, strict mode
- Renderer: plain HTML/CSS/JS, no framework
- OCR: tesseract.js, Simplified Chinese + English

## Commands
- npm install
- npm start
- npm run dist

## Architecture
- Main process captures clipboard by polling, persists settings/entries/images under userData.
- Preload exposes a narrow IPC bridge with contextIsolation enabled and nodeIntegration disabled.
- Renderer displays cards and sends user actions through IPC.

## Coding Rules
- Keep CommonJS and existing style; do not introduce TypeScript or frameworks.
- Never store secrets; data is local-only.
- Keep the IPC surface limited to the existing channels (7 invoke + 3 one-way events).
