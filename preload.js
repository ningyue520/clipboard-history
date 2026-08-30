'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  setSettings: (partial) => ipcRenderer.invoke('set-settings', partial),
  togglePin: (id) => ipcRenderer.invoke('toggle-pin', id),
  deleteEntry: (id) => ipcRenderer.invoke('delete-entry', id),
  clearExpired: () => ipcRenderer.invoke('clear-expired'),
  copyEntry: (id) => ipcRenderer.invoke('copy-entry', id),
  pasteEntry: (id) => ipcRenderer.invoke('paste-entry', id),

  onUpdate: (cb) => ipcRenderer.on('entries-updated', (_e, state) => cb(state)),
  onFocusSearch: (cb) => ipcRenderer.on('focus-search', () => cb()),
});
