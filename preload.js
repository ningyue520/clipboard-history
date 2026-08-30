'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  setSettings: (partial) => ipcRenderer.invoke('set-settings', partial),
  toggleFavorite: (id) => ipcRenderer.invoke('toggle-favorite', id),
  deleteEntry: (id) => ipcRenderer.invoke('delete-entry', id),
  clearExpired: () => ipcRenderer.invoke('clear-expired'),
  copyEntry: (id) => ipcRenderer.invoke('copy-entry', id),
  previewImage: (file) => ipcRenderer.invoke('preview-image', file),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  pauseShortcutCapture: () => ipcRenderer.send('shortcut-capture-start'),
  resumeShortcutCapture: () => ipcRenderer.send('shortcut-capture-end'),

  onUpdate: (cb) => ipcRenderer.on('entries-updated', (_e, state) => cb(state)),
  onFocusSearch: (cb) => ipcRenderer.on('focus-search', () => cb()),
  onWindowShown: (cb) => ipcRenderer.on('window-shown', () => cb()),
});
