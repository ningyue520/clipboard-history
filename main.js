'use strict';

const {
  app, BrowserWindow, Tray, Menu, globalShortcut,
  clipboard, nativeImage, ipcMain, protocol, net, screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const Tesseract = require('tesseract.js');

const APP_ID = 'com.momo.clipboardhistory';
app.setAppUserModelId(APP_ID);

const silentLaunchRequested = process.argv.includes('--silent-launch');

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!app.isQuiting) showWindow();
  });
}

process.on('uncaughtException', (err) => {
  console.error('[uncaught]', err);
});

// ---------------------------------------------------------------------------
// 数据位置：系统用户数据目录（%APPDATA%/历史粘贴板）
// ---------------------------------------------------------------------------
const dataDir = app.getPath('userData');
const settingsPath = path.join(dataDir, 'settings.json');
const entriesPath = path.join(dataDir, 'entries.json');
const imagesDir = path.join(dataDir, 'images');

const DEFAULT_SETTINGS = {
  retentionDays: 3,          // 1 / 3 / 5
  autoLaunch: true,
  closeToTray: false,
  shortcut: 'Control+Alt+H',
};

let settings = { ...DEFAULT_SETTINGS };
let entries = [];
let win = null;
let tray = null;
let pollTimer = null;
let expireTimer = null;

// 记录上一次剪贴板内容，用于去重
let lastFormats = '';
let lastText = '';
let lastKey = '';
// 我们自己写入剪贴板后，短暂抑制自动记录，避免产生重复条目
let suppressUntil = 0;

// ---------------------------------------------------------------------------
// 设置
// ---------------------------------------------------------------------------
function loadSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settings = { ...DEFAULT_SETTINGS, ...data };
  } catch (e) { /* 使用默认值 */ }
  if (![1, 3, 5].includes(settings.retentionDays)) settings.retentionDays = DEFAULT_SETTINGS.retentionDays;
  if (settings.shortcut === 'Control+Shift+V') settings.shortcut = DEFAULT_SETTINGS.shortcut;
  saveSettings();
}

function saveSettings() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

// ---------------------------------------------------------------------------
// 数据存取
// ---------------------------------------------------------------------------
function loadEntries() {
  try {
    entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
    if (!Array.isArray(entries)) entries = [];
  } catch (e) { entries = []; }
  let migrated = false;
  for (const e of entries) {
    if (e.isPinned) {
      e.isFavorite = true;
      delete e.isPinned;
      migrated = true;
    }
  }
  if (migrated) saveEntries();
}

function saveEntries() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(entriesPath, JSON.stringify(entries, null, 2));
}

function ensureImageDir() {
  fs.mkdirSync(imagesDir, { recursive: true });
}

function getPayload() {
  return {
    entries,
    settings,
    expiredCount: entries.filter((e) => e.status === 'expired').length,
  };
}

function sendUpdate() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('entries-updated', getPayload());
  }
}

// ---------------------------------------------------------------------------
// 窗口
// ---------------------------------------------------------------------------
function createWindow(silent = false) {
  win = new BrowserWindow({
    width: 420,
    height: 360,
    minWidth: 320,
    minHeight: 280,
    maxWidth: 520,
    maxHeight: 520,
    show: false,
    frame: false,
    movable: true,
    resizable: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    restoreBounds();
    if (!silent) win.show();
  });

  // 关闭行为：默认直接退出，开启 closeToTray 后隐藏到托盘
  win.on('close', (e) => {
    if (app.isQuiting) return;
    if (settings.closeToTray) {
      e.preventDefault();
      win.hide();
    } else {
      app.isQuiting = true;
      app.quit();
    }
  });

  // 记住窗口位置和大小（支持自由移动）
  win.on('move', () => setTimeout(saveBounds, 300));
  win.on('resize', () => setTimeout(saveBounds, 300));

  win.setIcon(path.join(__dirname, 'assets', 'icon.png'));
}
function boundsPath() {
  return path.join(dataDir, 'window.json');
}

function saveBounds() {
  if (!win || win.isDestroyed() || win.isMinimized()) return;
  const b = win.getBounds();
  fs.writeFileSync(boundsPath(), JSON.stringify(b));
}

function restoreBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(boundsPath(), 'utf8'));
    if (b && b.width <= 520 && b.height <= 520) {
      // 防止窗口被拖到屏幕外
      win.setBounds(b);
    }
  } catch (e) { /* 使用默认大小 */ }
}

function showWindow() {
  if (!win || win.isDestroyed()) return;
  processExpirations();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  if (!win.isDestroyed()) {
    win.webContents.send('focus-search');
    win.webContents.send('window-shown');
  }
}

// ---------------------------------------------------------------------------
// 图片独立预览窗口
// ---------------------------------------------------------------------------
let previewWin = null;

function showImagePreview(imageFile) {
  if (typeof imageFile !== 'string' || !imageFile) return;
  if (imageFile.includes('/') || imageFile.includes('\\') || imageFile.includes('..')) return;
  const file = path.join(imagesDir, imageFile);
  if (!fs.existsSync(file)) return;
  if (previewWin && !previewWin.isDestroyed()) {
    previewWin.focus();
    return;
  }
  const { workArea } = screen.getPrimaryDisplay();
  previewWin = new BrowserWindow({
    width: Math.min(workArea.width - 80, 1280),
    height: Math.min(workArea.height - 80, 960),
    minWidth: 400,
    minHeight: 300,
    title: '图片预览',
    backgroundColor: '#101012',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  previewWin.loadFile(path.join(__dirname, 'renderer', 'preview.html'), {
    query: { file: imageFile },
  });
  previewWin.on('closed', () => { previewWin = null; });
}

// ---------------------------------------------------------------------------
// 托盘
// ---------------------------------------------------------------------------
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('历史粘贴板');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开历史粘贴板', click: () => showWindow() },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuiting = true; app.quit(); } },
  ]));
  tray.on('click', () => showWindow());
}

// ---------------------------------------------------------------------------
// 全局快捷键
// ---------------------------------------------------------------------------
function registerShortcut() {
  try { globalShortcut.unregisterAll(); } catch (e) { /* 忽略 */ }
  try {
    const ok = globalShortcut.register(settings.shortcut, () => showWindow());
    console.log(`[快捷键] ${settings.shortcut} 注册${ok ? '成功' : '失败'}`);
  } catch (e) {
    console.error('[快捷键] 注册失败', e);
  }
}

// ---------------------------------------------------------------------------
// 剪贴板监控
// ---------------------------------------------------------------------------
function pollClipboard() {
  let formats;
  let text;
  try {
    formats = clipboard.availableFormats().join(',');
    text = clipboard.readText();
  } catch (e) {
    return;
  }

  const formatsChanged = formats !== lastFormats;
  const textChanged = text !== lastText;

  if (!formatsChanged && !textChanged) return;

  lastFormats = formats;
  lastText = text;

  if (Date.now() < suppressUntil) return; // 我们刚自己写过剪贴板

  if (text.trim()) {
    addTextEntry(text.trim());
  } else if (formats.includes('image')) {
    let img;
    try { img = clipboard.readImage(); } catch (e) { return; }
    if (img.isEmpty()) return;
    const png = img.toPNG();
    const key = 'img:' + crypto.createHash('sha256').update(png).digest('hex');
    if (key === lastKey) return;
    lastKey = key;
    addImageEntry(img, png);
  } else {
    lastKey = '';
  }
}

function addTextEntry(text) {
  // 去重：内容与现有活动条目相同则不重复记录
  if (entries.some((e) => e.type === 'text' && e.status === 'active' && e.text === text)) {
    return;
  }
  const entry = {
    id: crypto.randomUUID(),
    type: 'text',
    text,
    ocrText: '',
    imageFile: null,
    createdAt: Date.now(),
    isFavorite: false,
    status: 'active',
  };
  entries.unshift(entry);
  capEntries();
  saveEntries();
  sendUpdate();
}

function addImageEntry(img, png) {
  const id = crypto.randomUUID();
  const file = id + '.png';
  fs.writeFileSync(path.join(imagesDir, file), png);
  const entry = {
    id,
    type: 'image',
    text: '',
    ocrText: '',
    imageFile: file,
    createdAt: Date.now(),
    isFavorite: false,
    status: 'active',
  };
  entries.unshift(entry);
  capEntries();
  saveEntries();
  sendUpdate();
  runOcr(entry);
}

// 限制条目总数，避免软件越来越慢（收藏条目优先保留）
function capEntries() {
  const MAX = 1000;
  if (entries.length <= MAX) return;
  const removable = entries
    .filter((e) => !e.isFavorite)
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const e of removable) {
    if (entries.length <= MAX) break;
    const idx = entries.indexOf(e);
    if (idx >= 0) {
      entries.splice(idx, 1);
      removeImageFile(e);
    }
  }
}

function removeImageFile(e) {
  if (e.imageFile) {
    try { fs.unlinkSync(path.join(imagesDir, e.imageFile)); } catch (err) { /* 忽略 */ }
  }
}

// ---------------------------------------------------------------------------
// OCR：图片文字识别（供搜索）
// ---------------------------------------------------------------------------
let ocrWorker = null;
let ocrQueue = Promise.resolve();

async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;
  // tesseract.js probes cachePath before langPath; local traineddata sits next
  // to the app (asarUnpack keeps it as real files), so reading it as cache
  // avoids the worker mis-detecting Electron as a browser env and fetching
  // Windows paths over http.
  const langDir = __dirname.replace('app.asar', 'app.asar.unpacked');
  ocrWorker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
    cachePath: langDir,
    gzip: false,
    logger: (m) => { /* 静默 */ },
  });
  return ocrWorker;
}

function runOcr(entry) {
  ocrQueue = ocrQueue.then(async () => {
    try {
      const worker = await getOcrWorker();
      const file = path.join(imagesDir, entry.imageFile);
      if (!fs.existsSync(file)) return;
      const { data } = await worker.recognize(fs.readFileSync(file));
      if (data && data.text && data.text.trim()) {
        entry.ocrText = data.text.trim().slice(0, 2000);
        saveEntries();
        sendUpdate();
      }
    } catch (e) {
      console.error('[OCR] 失败', e.message);
    }
  });
}

// ---------------------------------------------------------------------------
// 过期处理
// ---------------------------------------------------------------------------
function processExpirations() {
  const cutoff = Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const e of entries) {
    if (e.status === 'active' && !e.isFavorite && e.createdAt < cutoff) {
      e.status = 'expired';
      changed = true;
    }
  }
  if (changed) {
    saveEntries();
    sendUpdate();
  }
}

function clearExpired() {
  const before = entries.length;
  entries = entries.filter((e) => {
    if (e.status === 'expired') {
      removeImageFile(e);
      return false;
    }
    return true;
  });
  if (entries.length !== before) {
    saveEntries();
    sendUpdate();
  }
}

// ---------------------------------------------------------------------------
// 复制 / 一键粘贴
// ---------------------------------------------------------------------------
function writeEntryToClipboard(e) {
  suppressUntil = Date.now() + 1500;
  if (e.type === 'text') {
    clipboard.writeText(e.text);
  } else {
    const file = path.join(imagesDir, e.imageFile);
    if (!fs.existsSync(file)) return false;
    clipboard.writeImage(nativeImage.createFromBuffer(fs.readFileSync(file)));
  }
  return true;
}

// ---------------------------------------------------------------------------
// 开机自启
// ---------------------------------------------------------------------------
function applyAutoLaunch() {
  if (!settings.autoLaunch) {
    app.setLoginItemSettings({ openAtLogin: false });
    return;
  }
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, args: ['--silent-launch'] });
  } else {
    // 开发模式下启动 electron.exe 并带上项目路径
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: [app.getAppPath(), '--silent-launch'],
    });
  }
}

function applySettings(partial) {
  settings = { ...settings, ...partial };
  saveSettings();
  if ('retentionDays' in partial) processExpirations();
  if ('shortcut' in partial) registerShortcut();
  if ('autoLaunch' in partial) applyAutoLaunch();
  sendUpdate();
}

// ---------------------------------------------------------------------------
// 图片本地协议：让界面能显示图片卡片的缩略图
// ---------------------------------------------------------------------------
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'img',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function registerImageProtocol() {
  protocol.handle('img', (req) => {
    try {
      const u = new URL(req.url);
      const file = path.join(imagesDir, u.hostname);
      if (!file.startsWith(imagesDir) || !fs.existsSync(file)) {
        return new Response('', { status: 404 });
      }
      return net.fetch(pathToFileURL(file).toString());
    } catch (e) {
      return new Response('', { status: 500 });
    }
  });
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
ipcMain.handle('get-state', () => getPayload());
ipcMain.handle('set-settings', (_evt, partial) => applySettings(partial));
ipcMain.handle('toggle-favorite', (_evt, id) => {
  const e = entries.find((x) => x.id === id);
  if (e) {
    e.isFavorite = !e.isFavorite;
    saveEntries();
    sendUpdate();
  }
  return getPayload();
});
ipcMain.handle('delete-entry', (_evt, id) => {
  const idx = entries.findIndex((x) => x.id === id);
  if (idx >= 0) {
    removeImageFile(entries[idx]);
    entries.splice(idx, 1);
    saveEntries();
    sendUpdate();
  }
  return getPayload();
});
ipcMain.handle('clear-expired', () => {
  clearExpired();
  return getPayload();
});
ipcMain.handle('copy-entry', (_evt, id) => {
  const e = entries.find((x) => x.id === id);
  return e ? writeEntryToClipboard(e) : false;
});
ipcMain.on('shortcut-capture-start', () => {
  try { globalShortcut.unregister(settings.shortcut); } catch (e) { /* ignore */ }
});
ipcMain.on('shortcut-capture-end', () => registerShortcut());
ipcMain.handle('preview-image', (_evt, file) => {
  showImagePreview(file);
  return true;
});
ipcMain.on('minimize-window', () => {
  if (win && !win.isDestroyed()) win.minimize();
});
ipcMain.on('close-window', () => {
  if (win && !win.isDestroyed()) win.close();
});

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  ensureImageDir();
  loadSettings();
  loadEntries();
  registerImageProtocol();
  createWindow(silentLaunchRequested);
  createTray();
  registerShortcut();
  applyAutoLaunch();
  processExpirations();
  // 记录启动时的剪贴板基线，已有内容不计入历史，只记录启动后的新复制
  try {
    lastFormats = clipboard.availableFormats().join(',');
    lastText = clipboard.readText();
  } catch (e) { /* 使用默认空基线 */ }
  pollTimer = setInterval(pollClipboard, 800);
  expireTimer = setInterval(processExpirations, 30 * 60 * 1000);

  app.on('activate', () => showWindow());
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (pollTimer) clearInterval(pollTimer);
  if (expireTimer) clearInterval(expireTimer);
  saveBounds();
});

app.on('window-all-closed', () => {
  // 常驻托盘，不退出
});
