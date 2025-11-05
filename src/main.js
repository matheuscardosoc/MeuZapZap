const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const notifier = require('node-notifier');

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
    this.lastNotificationData = null; // Para armazenar dados da última notificação
    this.lastNotificationChatName = null; // Nome da última conversa notificada
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
          
          // Tentar capturar informações da conversa ativa para abertura direta
          try {
            // Buscar pelo elemento da conversa ativa ou mais recente
            const chatListItems = document.querySelectorAll('[data-testid="cell-frame-container"]');
            if (chatListItems.length > 0) {
              // Pegar a primeira conversa (geralmente a mais recente/ativa)
              const firstChat = chatListItems[0];
              const chatInfo = firstChat.querySelector('[data-testid="cell-frame-title"]');
              const chatName = chatInfo ? chatInfo.textContent.trim() : null;
              
              if (chatName) {
                notificationData.chatName = chatName;
                notificationData.chatElement = true;
              }
            }
            
            // Alternativa: buscar por conversa aberta/ativa
            const activeChat = document.querySelector('[data-testid="conversation-header"]');
            if (activeChat) {
              const activeChatName = activeChat.querySelector('[data-testid="conversation-info-header-chat-title"]');
              if (activeChatName) {
                notificationData.activeChatName = activeChatName.textContent.trim();
              }
            }
          } catch (error) {
            // Se não conseguir capturar, continua normalmente
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
        label: this.lastNotificationChatName ? `Abrir última conversa (${this.lastNotificationChatName})` : 'Abrir última conversa',
        enabled: !!this.lastNotificationChatName,
        click: () => {
          if (this.lastNotificationChatName) {
            this.openSpecificChat(this.lastNotificationChatName);
          }
        }
      },
      { type: 'separator' },
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

  updateTrayMenu() {
    if (!this.tray) return;
    
    // Recriar menu com a última conversa atualizada
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir WhatsApp',
        click: () => {
          this.showWindow();
        }
      },
      {
        label: this.lastNotificationChatName ? `Abrir última conversa (${this.lastNotificationChatName})` : 'Abrir última conversa',
        enabled: !!this.lastNotificationChatName,
        click: () => {
          if (this.lastNotificationChatName) {
            this.openSpecificChat(this.lastNotificationChatName);
          }
        }
      },
      { type: 'separator' },
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

  async openSpecificChat(chatName) {
    // Primeiro mostrar a janela
    this.showWindow();
    
    // Aguardar um pouco para garantir que a janela esteja carregada
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Executar JavaScript para buscar e abrir a conversa específica
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (function() {
          const chatName = "${chatName || ''}";
          if (!chatName) return false;
          
          console.log('Procurando conversa:', chatName);
          
          // Múltiplos seletores para buscar as conversas
          const selectors = [
            '[data-testid="cell-frame-container"]',
            '[data-testid="conversation-panel-body"] div[role="listitem"]',
            'div[data-testid="chat"] div[role="gridcell"]',
            'div[id="pane-side"] div[role="listitem"]'
          ];
          
          for (const selector of selectors) {
            const chatListItems = document.querySelectorAll(selector);
            console.log('Tentando seletor:', selector, 'encontrados:', chatListItems.length);
            
            if (chatListItems.length > 0) {
              for (const chatItem of chatListItems) {
                // Múltiplos seletores para o título
                const titleSelectors = [
                  '[data-testid="cell-frame-title"]',
                  'span[title]',
                  'span[dir="auto"]',
                  '.copyable-text',
                  '[data-testid="conversation-info-header-chat-title"]'
                ];
                
                let titleElement = null;
                let titleText = '';
                
                for (const titleSelector of titleSelectors) {
                  titleElement = chatItem.querySelector(titleSelector);
                  if (titleElement) {
                    titleText = titleElement.textContent.trim() || titleElement.getAttribute('title') || '';
                    if (titleText) break;
                  }
                }
                
                if (titleText) {
                  console.log('Verificando conversa:', titleText);
                  
                  // Comparação exata
                  if (titleText === chatName) {
                    console.log('Encontrou conversa exata, clicando...');
                    chatItem.click();
                    return true;
                  }
                  
                  // Comparação parcial (case insensitive)
                  const textLower = titleText.toLowerCase();
                  const searchLower = chatName.toLowerCase();
                  
                  if (textLower.includes(searchLower) || searchLower.includes(textLower)) {
                    console.log('Encontrou conversa com busca flexível, clicando...');
                    chatItem.click();
                    return true;
                  }
                }
              }
            }
          }
          
          console.log('Conversa não encontrada');
          return false;
        })();
      `);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Resultado da busca da conversa:', result);
      }
    } catch (error) {
      // Se não conseguir abrir a conversa específica, apenas mostrar a janela
      if (process.env.NODE_ENV === 'development') {
        console.log('Erro ao abrir conversa específica:', error);
      }
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
    
    // Ícone padrão da aplicação para notificações
    const notificationIcon = path.join(__dirname, '../assets/icon.png');
    
    // Limpar título da notificação (remover prefixos do WhatsApp)
    let cleanTitle = data.title || 'WhatsApp';
    if (cleanTitle.includes(' - ')) {
      cleanTitle = cleanTitle.split(' - ')[0];
    }
    
    // Limpar corpo da mensagem
    let cleanBody = data.body || 'Nova mensagem';
    
    // Armazenar dados para quando a notificação for clicada
    const chatName = data.chatName || data.activeChatName || cleanTitle;
    
    // Armazenar dados da última notificação para acesso via menu/atalho
    this.lastNotificationChatName = chatName;
    this.lastNotificationData = {
      title: cleanTitle,
      body: cleanBody,
      chatName: chatName,
      timestamp: new Date()
    };
    
    // Atualizar menu da bandeja com a nova conversa
    this.updateTrayMenu();
    
    // Enviar notificação simples
    notifier.notify({
      title: cleanTitle,
      message: `${cleanBody}\n\n💡 Use Ctrl+Shift+L ou menu da bandeja para abrir a conversa`,
      icon: notificationIcon,
      timeout: 5000,
      sound: true,
      subtitle: 'WhatsApp'
    });
    
    // Log para debug apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Notificação enviada:', {
        title: cleanTitle,
        body: cleanBody,
        chatName: chatName,
        timestamp: new Date().toLocaleTimeString()
      });
      console.log('💡 Use Ctrl+Shift+L ou menu da bandeja para abrir a conversa');
    }
  }

  init() {
    // Configurar IPC
    this.setupIPC();
    
    // Aguardar app estar pronto
    app.whenReady().then(() => {
      this.createWindow();
      this.createTray();
      
      // Configurar atalho global para abrir última conversa notificada
      try {
        globalShortcut.register('Ctrl+Shift+L', () => {
          if (this.lastNotificationChatName) {
            this.openSpecificChat(this.lastNotificationChatName);
          } else {
            this.showWindow();
          }
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Atalho global Ctrl+Shift+L registrado para abrir WhatsApp.');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Erro ao registrar atalho global:', error);
        }
      }
      
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
    
    // Limpar atalhos globais antes de sair
    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
    
    // Definir identificador da aplicação para notificações
    app.setAppUserModelId('com.meuzapzap.app');
  }
}

// Inicializar aplicação
const meuZapZap = new MeuZapZap();
meuZapZap.init();