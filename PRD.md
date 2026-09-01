# ClipboardHistory v1.2 PRD

## Product

- Name: ClipboardHistory (历史粘贴板)
- Release: 1.2.0
- Platform: Windows desktop
- Stack: Electron + native HTML/CSS/JS

## Goals

1. Preserve local clipboard data and existing behavior while adding the v1.2 workflow improvements.
2. Make startup and window placement controllable without blocking normal interaction.
3. Make cards faster to copy and easier to organize with favorites, notes, and type filters.
4. Keep the renderer dependency-free and the IPC surface small.

## Requirements

### Startup

- `silentLaunch` defaults to `false`.
- Auto-launch registration includes `--silent-launch`.
- When launched with `--silent-launch`, the main window remains hidden and the app stays in the tray.
- Manual launches always show the main window.

### Window lock

- `windowLocked` defaults to `false`.
- The title bar provides a lock/unlock control.
- Locking prevents window movement only; searching, copying, favorites, deletion, settings, resizing, close, and tray behavior remain available.
- Top-most behavior is unchanged.

### Cards

- Active cards have only star and close controls in the top-right corner; separate copy/delete text buttons are removed.
- Double-clicking any card copies its content.
- A single click on an image card opens preview after a short delay; double-click cancels that preview and copies the image.
- Existing standalone image preview, zoom, pan, and ESC behavior remain available.

### Favorites and notes

- The favorites page can filter by `all`, `text`, and `image`.
- Each entry may store a note up to 60 characters.
- Notes are editable on favorite cards.
- Unfavoriting keeps the note but hides it; re-favoriting restores it.
- Saving notes uses the `set-entry-note` IPC channel.

### Text display and settings

- Long text cards expose expand/collapse without changing double-click-to-copy behavior.
- Settings contain a collapsible usage guide covering double-click copy, star/close actions, favorites filters, notes, window lock, shortcut, and local storage.
- Settings text and footer display v1.2.

## Non-goals

- Do not reset or migrate away existing `entries.json`.
- Do not add confirmation dialogs for delete.
- Do not classify favorites by OCR output.
- Do not address unrelated v1.1 debt unless directly required.

## Acceptance criteria

1. All JavaScript passes syntax checks.
2. Visible launch, silent launch, tray recall, and settings persistence are verified.
3. Window lock state survives restart, and locked windows still permit functional actions.
4. Star, close, double-click copy, image preview, favorites filters, notes, and note persistence are verified.
5. Long text expand/collapse, usage-guide toggle, and v1.2 labels are verified.
6. The final installer builds into `dist/v1.2/`.
