// Preload for the hidden recorder window. CommonJS because Electron
// preloads with contextIsolation require it.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miniflow', {
  onStart: (fn) => ipcRenderer.on('recorder:start', fn),
  onStop: (fn) => ipcRenderer.on('recorder:stop', fn),
  sendWav: (arrayBuffer, errorMessage) =>
    ipcRenderer.send('recorder:wav', arrayBuffer, errorMessage ?? null),
});
