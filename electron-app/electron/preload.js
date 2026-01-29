const { contextBridge, ipcRenderer } = require('electron');

// Expose config API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config')
});
