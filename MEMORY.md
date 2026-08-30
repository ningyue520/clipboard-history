# MEMORY.md

## Last updated
2026-08-30

## Decisions
- Electron desktop clipboard manager; local-only persistence under userData.
- Retention: 1/3/5 days, default 3; expired entries move to an "expired" tab instead of auto-delete.
- Pinned entries never expire and sort above unpinned entries.
- OCR languages: chi_sim + eng.
- UI: macOS-inspired acrylic/glass look with CSS fallback.

## Pitfalls
- No package-lock.json or node_modules existed initially.
- Tesseract downloads language data on first OCR use.
- Windows installer requires a valid app icon; current icon is generated under assets.

## Build Notes
- 
pm run dist can fail on non-admin Windows because winCodeSign extraction needs symlink privileges.
- Workaround used: 
px electron-builder --config.win.signAndEditExecutable=false with ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ to build NSIS without code signing/resource editing.
