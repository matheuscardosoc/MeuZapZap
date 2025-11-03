const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o processo renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Enviar notificação para o processo principal
  sendNotification: (data) => {
    ipcRenderer.send('notification', data);
  },
  
  // Informar mudança no título
  titleChanged: (title) => {
    ipcRenderer.send('title-changed', title);
  },
  
  // Informar status de conexão
  connectionStatusChanged: (isConnected) => {
    ipcRenderer.send('connection-status', isConnected);
  }
});