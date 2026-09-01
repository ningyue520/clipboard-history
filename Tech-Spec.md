# ClipboardHistory v1.2 Tech Spec

## Architecture

- Main process: CommonJS (`main.js`).
- Renderer: plain HTML/CSS/JS under `renderer/`.
- IPC: existing narrow context-isolated bridge plus one new invoke channel.
- Persistence: local JSON under Electron `userData`; image files remain in `userData/images`.

## Data contracts

### settings.json

Existing fields are preserved. New optional fields are merged with defaults:

```json
{
  "silentLaunch": false,
  "windowLocked": false
}
```

### entries.json

Existing entries are compatible. Entries may include:

```json
{
  "note": "string up to 60 characters"
}
```

Notes remain on entries when `isFavorite` becomes false. The renderer only displays note editing on favorite cards.

## IPC

Existing channels remain unchanged. New invoke channel:

| Channel | Direction | Arguments | Result |
| --- | --- | --- | --- |
| `set-entry-note` | renderer -> main | `(id, note)` | latest state |

Preload exposes:

| API | IPC |
| --- | --- |
| `setEntryNote(id, note)` | `set-entry-note` |

The final invoke surface has 8 channels.

## Main-process behavior

### Startup

- Parse `process.argv` for `--silent-launch`.
- Auto-launch packaged executables with `--silent-launch`; development auto-launch also includes the parameter.
- `createWindow()` receives the launch mode. Hidden mode skips the `ready-to-show` window presentation and still initializes the tray, shortcut, capture, persistence, and polling.
- `showWindow()` behavior remains manual launch, tray recall, hotkey recall, and second-instance recall.

### Window lock

- Renderer sends the requested `windowLocked` value through existing `set-settings`.
- Titlebar drag is controlled by a `.locked` CSS state; resizing and functional controls are unaffected.

## Renderer behavior

### Cards

- Double-click delegates to `copyEntry(id)`.
- Single image click starts a preview timer; double click clears that timer and copies. Timers are stored per entry ID.
- Star toggles favorite; X deletes. Text copy/delete buttons are removed.

### Notes

- Favorite cards render a bounded single-line note input.
- Input is clamped to 200 characters and saved on commit.

### Text display

- Long text cards get an expand/collapse toggle.
- Complete text remains available to clipboard copy.

## Validation

For each stage:

```bash
node --check main.js && node --check preload.js && node --check renderer/app.js && node --check renderer/preview.js
```

Stage-specific behavior is verified with Electron CDP or focused manual/browser checks. Restart persistence is checked for silent launch, lock, and notes. Final release builds with `--config.win.signAndEditExecutable=false` into `dist/v1.2/`.
