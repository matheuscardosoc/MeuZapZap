const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain } = require('electron');
const path = require('path');
const notifier = require('node-notifier');
const fs = require('fs');
const crypto = require('crypto');

// Suprimir logs de erro em produção
if (process.env.NODE_ENV !== 'development') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    // Suprimir erros específicos do Chromium que não afetam funcionalidade
    if (message.includes('platform_shared_memory_region_posix') ||
        message.includes('Unable to access') ||
        message.includes('Creating shared memory') ||
        message.includes('failed: No such process')) {
      return; // Silenciar esses erros
    }
    originalConsoleError.apply(console, args);
  };
}

// Configurar flags do Chromium para compatibilidade e reduzir logs
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-logging');
app.commandLine.appendSwitch('--log-level=3');
app.commandLine.appendSwitch('--silent');
app.commandLine.appendSwitch('--disable-logging-redirect');

class MeuZapZap {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.isQuitting = false;
    this.unreadCount = 0;
    this.isConnected = false;
    this.contactPhotos = new Map(); // Cache de fotos de contatos
  }

  async saveContactPhoto(photoData, contactName) {
    try {
      if (!photoData || (!photoData.startsWith('data:image') && !photoData.startsWith('blob:'))) {
        return null;
      }

      // Criar diretório temporário se não existir
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Gerar hash do nome do contato para nome do arquivo
      const hash = crypto.createHash('md5').update(contactName || 'unknown').digest('hex');
      const fileName = `contact-${hash}.png`;
      const filePath = path.join(tempDir, fileName);

      // Se for data:image, converter para buffer e salvar
      if (photoData.startsWith('data:image')) {
        const base64Data = photoData.replace(/^data:image\/[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        // Cachear o caminho da foto
        this.contactPhotos.set(contactName, filePath);
        return filePath;
      }

      return null;
    } catch (error) {
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('Erro ao salvar foto do contato:', error);
      }
      return null;
    }
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

    // Definir ícones em múltiplas resoluções para melhor qualidade
    const iconSizes = [16, 32, 48, 64, 128, 256];
    const icons = iconSizes.map(size => {
      const iconPath = path.join(__dirname, `../assets/icon-${size}.png`);
      try {
        const icon = nativeImage.createFromPath(iconPath);
        return icon.isEmpty() ? null : icon;
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (icons.length > 0) {
      this.mainWindow.setIcon(icons[icons.length - 1]); // Usar a maior resolução disponível
    }

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
          // Tentar capturar dados adicionais da notificação
          const notificationData = {
            title: title,
            body: options.body || '',
            icon: options.icon || '',
            tag: options.tag || '',
            image: options.image || '',
            badge: options.badge || '',
            timestamp: Date.now()
          };
          
          // Tentar encontrar a foto do contato no DOM
          try {
            // Buscar por elementos de foto de perfil que podem estar relacionados
            const avatars = document.querySelectorAll('img[src*="blob:"], img[src*="data:image"], [style*="background-image"]');
            const recentAvatar = Array.from(avatars).find(img => {
              const rect = img.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && (
                img.src?.includes('blob:') || 
                img.src?.includes('data:image') ||
                img.style?.backgroundImage?.includes('blob:')
              );
            });
            
            if (recentAvatar) {
              if (recentAvatar.src && (recentAvatar.src.includes('blob:') || recentAvatar.src.includes('data:image'))) {
                notificationData.contactPhoto = recentAvatar.src;
              } else if (recentAvatar.style?.backgroundImage) {
                const bgImage = recentAvatar.style.backgroundImage;
                const urlMatch = bgImage.match(/url\\(["']?(.*?)["']?\\)/);
                if (urlMatch && urlMatch[1]) {
                  notificationData.contactPhoto = urlMatch[1];
                }
              }
            }
          } catch (error) {
            // Log apenas em desenvolvimento
            if (process.env.NODE_ENV === 'development') {
              console.log('Erro ao capturar foto do contato:', error);
            }
          }
          
          // Enviar dados da notificação para o processo principal
          window.electronAPI.sendNotification(notificationData);
          
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
        
        // Detectar status de conexão (reduzido para 10 segundos para melhor performance)
        setInterval(() => {
          const isConnected = !document.querySelector('[data-testid="alert-phone-offline"]');
          window.electronAPI.connectionStatusChanged(isConnected);
        }, 10000);
      `);
    });
  }

  createTray() {
    // Detectar DPI/escala do sistema para escolher melhor resolução
    const scaleFactor = require('electron').screen.getPrimaryDisplay().scaleFactor;
    let traySize;
    
    if (scaleFactor >= 2) {
      traySize = 32; // Alta resolução para displays HiDPI
    } else if (scaleFactor >= 1.5) {
      traySize = 24; // Resolução média
    } else {
      traySize = 16; // Resolução padrão
    }
    
    // Criar ícone da bandeja com resolução apropriada
    const iconPath = path.join(__dirname, `../assets/tray-icon-${traySize}.png`);
    let trayIcon;
    
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      // Se o arquivo específico não existir, usar o padrão
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
      }
    } catch (error) {
      // Fallback para ícone padrão
      trayIcon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
    }
    
    this.tray = new Tray(trayIcon);
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
    
    // Clique simples para mostrar/ocultar janela
    this.tray.on('click', () => {
      this.toggleWindow();
    });
    
    // Clique duplo para mostrar/ocultar janela (mantido para compatibilidade)
    this.tray.on('double-click', () => {
      this.toggleWindow();
    });
    
    this.updateTrayIcon();
  }

  updateTrayIcon() {
    if (!this.tray) return;
    
    // Detectar melhor resolução para o ícone
    const scaleFactor = require('electron').screen.getPrimaryDisplay().scaleFactor;
    let traySize;
    
    if (scaleFactor >= 2) {
      traySize = 32;
    } else if (scaleFactor >= 1.5) {
      traySize = 24;
    } else {
      traySize = 16;
    }
    
    let iconName = `tray-icon-${traySize}.png`;
    let toolTip = 'MeuZapZap - WhatsApp';
    
    if (!this.isConnected) {
      iconName = `tray-icon-offline-${traySize}.png`;
      toolTip = 'MeuZapZap - WhatsApp (Desconectado)';
    } else if (this.unreadCount > 0) {
      iconName = `tray-icon-unread-${traySize}.png`;
      toolTip = `MeuZapZap - WhatsApp (${this.unreadCount} não lidas)`;
    }
    
    const iconPath = path.join(__dirname, '../assets', iconName);
    let trayIcon;
    
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      // Fallback se o arquivo específico não existir
      if (trayIcon.isEmpty()) {
        const fallbackName = iconName.replace(`-${traySize}`, '');
        trayIcon = nativeImage.createFromPath(path.join(__dirname, '../assets', fallbackName));
      }
    } catch (error) {
      // Usar ícone padrão como último recurso
      trayIcon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
    }
    
    this.tray.setImage(trayIcon);
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

  async showNotification(data) {
    // Não mostrar notificação se a janela estiver focada
    if (this.mainWindow && this.mainWindow.isFocused()) {
      return;
    }
    
    // Preparar ícone da notificação
    let notificationIcon = path.join(__dirname, '../assets/icon.png');
    
    // Se temos foto do contato, tentar usá-la
    if (data.contactPhoto) {
      try {
        const contactName = data.title || 'unknown';
        const savedPhotoPath = await this.saveContactPhoto(data.contactPhoto, contactName);
        if (savedPhotoPath && fs.existsSync(savedPhotoPath)) {
          notificationIcon = savedPhotoPath;
          // Log apenas em desenvolvimento
          if (process.env.NODE_ENV === 'development') {
            console.log('Usando foto do contato para notificação:', contactName);
          }
        }
      } catch (error) {
        // Log apenas em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          console.log('Erro ao processar foto do contato:', error);
        }
      }
    }
    
    // Limpar título da notificação (remover prefixos do WhatsApp)
    let cleanTitle = data.title || 'WhatsApp';
    if (cleanTitle.includes(' - ')) {
      cleanTitle = cleanTitle.split(' - ')[0];
    }
    
    // Limpar corpo da mensagem
    let cleanBody = data.body || 'Nova mensagem';
    
    notifier.notify({
      title: cleanTitle,
      message: cleanBody,
      icon: notificationIcon,
      timeout: 5000,
      sound: true,
      wait: false,
      subtitle: data.contactPhoto ? 'WhatsApp (com foto)' : 'WhatsApp'
    }, (err, response) => {
      // Ao clicar na notificação, mostrar a janela
      if (response === 'activate') {
        this.showWindow();
      }
    });
    
    // Log para debug apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Notificação enviada:', {
        title: cleanTitle,
        body: cleanBody,
        hasContactPhoto: !!data.contactPhoto,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }

  cleanupContactPhotos() {
    try {
      const tempDir = path.join(__dirname, '../temp');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          if (file.startsWith('contact-') && file.endsWith('.png')) {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            // Remover arquivos com mais de 1 hora
            if (Date.now() - stats.mtime.getTime() > 3600000) {
              fs.unlinkSync(filePath);
              // Log apenas em desenvolvimento
              if (process.env.NODE_ENV === 'development') {
                console.log('Foto de contato expirada removida:', file);
              }
            }
          }
        });
      }
    } catch (error) {
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('Erro na limpeza de fotos de contatos:', error);
      }
    }
  }

  init() {
    // Limpeza inicial de fotos de contatos expiradas
    this.cleanupContactPhotos();
    
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