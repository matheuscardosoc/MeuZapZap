const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const notifier = require('node-notifier');

// Configurar flags do Chromium para compatibilidade
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-features', 'TranslateUI');

class MeuZapZap {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.isQuitting = false;
    this.unreadCount = 0;
    this.isConnected = false;
  }

  createWindow() {
    // Criar a janela principal
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, '../assets/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        sandbox: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false,
      titleBarStyle: 'default',
      autoHideMenuBar: true
    });

    // Carregar WhatsApp Web
    this.mainWindow.loadURL('https://web.whatsapp.com');

    // Configurar User Agent para evitar problemas de compatibilidade
    this.mainWindow.webContents.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Mostrar janela quando estiver pronta
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      if (process.argv.includes('--dev')) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Configurar eventos da janela
    this.setupWindowEvents();
    
    // Configurar interceptação de notificações
    this.setupNotificationInterception();
  }

  setupWindowEvents() {
    // Minimizar para a bandeja ao invés de fechar
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
        
        // Mostrar notificação informativa na primeira vez
        if (!this.hasShownMinimizeNotification) {
          notifier.notify({
            title: 'MeuZapZap',
            message: 'Aplicativo minimizado para a bandeja do sistema',
            icon: path.join(__dirname, '../assets/icon.png'),
            timeout: 3000
          });
          this.hasShownMinimizeNotification = true;
        }
      }
    });

    // Detectar mudanças no título para contar mensagens não lidas
    this.mainWindow.on('page-title-updated', (event, title) => {
      this.updateUnreadCount(title);
    });

    // Interceptar links externos
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  setupNotificationInterception() {
    // Interceptar notificações do WhatsApp Web
    this.mainWindow.webContents.on('dom-ready', () => {
      this.mainWindow.webContents.executeJavaScript(`
        // Interceptar notificações nativas do navegador
        const originalNotification = window.Notification;
        
        window.Notification = function(title, options = {}) {
          // Enviar dados da notificação para o processo principal
          window.electronAPI.sendNotification({
            title: title,
            body: options.body || '',
            icon: options.icon || '',
            tag: options.tag || ''
          });
          
          // Não criar a notificação nativa do navegador
          return {
            close: () => {},
            addEventListener: () => {},
            removeEventListener: () => {}
          };
        };
        
        window.Notification.permission = 'granted';
        window.Notification.requestPermission = () => Promise.resolve('granted');
        
        // Monitorar mudanças no título para detectar mensagens não lidas
        const observer = new MutationObserver(() => {
          window.electronAPI.titleChanged(document.title);
        });
        
        observer.observe(document.querySelector('title') || document.head, {
          childList: true,
          subtree: true
        });
        
        // Detectar status de conexão
        setInterval(() => {
          const isConnected = !document.querySelector('[data-testid="alert-phone-offline"]');
          window.electronAPI.connectionStatusChanged(isConnected);
        }, 5000);
      `);
    });
  }

  createTray() {
    // Criar ícone da bandeja
    const iconPath = path.join(__dirname, '../assets/tray-icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    
    this.tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    this.tray.setToolTip('MeuZapZap - WhatsApp');
    
    // Menu de contexto da bandeja
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir WhatsApp',
        click: () => {
          this.showWindow();
        }
      },
      {
        label: 'Recarregar',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.reload();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Sobre',
        click: () => {
          this.showAbout();
        }
      },
      {
        label: 'Sair',
        click: () => {
          this.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    
    // Clique duplo para mostrar/ocultar janela
    this.tray.on('double-click', () => {
      this.toggleWindow();
    });
    
    this.updateTrayIcon();
  }

  updateTrayIcon() {
    if (!this.tray) return;
    
    let iconName = 'tray-icon.png';
    let toolTip = 'MeuZapZap - WhatsApp';
    
    if (!this.isConnected) {
      iconName = 'tray-icon-offline.png';
      toolTip = 'MeuZapZap - WhatsApp (Desconectado)';
    } else if (this.unreadCount > 0) {
      iconName = 'tray-icon-unread.png';
      toolTip = `MeuZapZap - WhatsApp (${this.unreadCount} não lidas)`;
    }
    
    const iconPath = path.join(__dirname, '../assets', iconName);
    const trayIcon = nativeImage.createFromPath(iconPath);
    this.tray.setImage(trayIcon.resize({ width: 16, height: 16 }));
    this.tray.setToolTip(toolTip);
  }

  updateUnreadCount(title) {
    // Extrair número de mensagens não lidas do título
    const match = title.match(/\((\d+)\)/);
    const newCount = match ? parseInt(match[1]) : 0;
    
    if (newCount !== this.unreadCount) {
      this.unreadCount = newCount;
      this.updateTrayIcon();
    }
  }

  showWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  hideWindow() {
    if (this.mainWindow) {
      this.mainWindow.hide();
    }
  }

  toggleWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.hideWindow();
      } else {
        this.showWindow();
      }
    }
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Sobre MeuZapZap',
      message: 'MeuZapZap v1.0.0',
      detail: 'WhatsApp para Linux com notificações nativas e integração com a bandeja do sistema.',
      buttons: ['OK']
    });
  }

  quit() {
    this.isQuitting = true;
    app.quit();
  }

  setupIPC() {
    // Receber notificações do renderer
    ipcMain.on('notification', (event, data) => {
      this.showNotification(data);
    });
    
    // Receber mudanças no título
    ipcMain.on('title-changed', (event, title) => {
      this.updateUnreadCount(title);
    });
    
    // Receber status de conexão
    ipcMain.on('connection-status', (event, isConnected) => {
      this.isConnected = isConnected;
      this.updateTrayIcon();
    });
  }

  showNotification(data) {
    // Não mostrar notificação se a janela estiver focada
    if (this.mainWindow && this.mainWindow.isFocused()) {
      return;
    }
    
    notifier.notify({
      title: data.title || 'WhatsApp',
      message: data.body || 'Nova mensagem',
      icon: path.join(__dirname, '../assets/icon.png'),
      timeout: 5000,
      sound: true,
      wait: false
    }, (err, response) => {
      // Ao clicar na notificação, mostrar a janela
      if (response === 'activate') {
        this.showWindow();
      }
    });
  }

  init() {
    // Configurar IPC
    this.setupIPC();
    
    // Aguardar app estar pronto
    app.whenReady().then(() => {
      this.createWindow();
      this.createTray();
      
      // Configurações específicas do Linux
      if (process.platform === 'linux') {
        app.setDesktopName('MeuZapZap');
      }
    });
    
    // Tratamento de erros
    process.on('uncaughtException', (error) => {
      console.error('Erro não capturado:', error);
    });
    
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (navigationEvent, navigationURL) => {
        navigationEvent.preventDefault();
        shell.openExternal(navigationURL);
      });
    });
    
    // Sair quando todas as janelas forem fechadas (exceto no macOS)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });
    
    // Recriar janela quando o ícone do dock for clicado (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
    
    // Definir identificador da aplicação para notificações
    app.setAppUserModelId('com.meuzapzap.app');
  }
}

// Inicializar aplicação
const meuZapZap = new MeuZapZap();
meuZapZap.init();