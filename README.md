# MeuZapZap

![MeuZapZap Logo](assets/icon.png)

Uma aplicação WhatsApp para Linux com notificações nativas do sistema e integração com a bandeja do sistema, inspirada no ZapZap.

## 🚀 Funcionalidades

- ✅ **Interface WhatsApp Web** - Acesso completo ao WhatsApp através da interface web oficial
- 🔔 **Notificações Nativas** - Receba notificações do sistema Linux para novas mensagens
- 🎯 **Ícone da Bandeja** - Ícone na bandeja do sistema que muda com base no status:
  - 🟢 Verde: Conectado e sem mensagens não lidas
  - 🔴 Vermelho: Mensagens não lidas
  - ⚫ Cinza: Desconectado
- 📱 **Contador de Mensagens** - Exibe o número de mensagens não lidas na tooltip
- 🖥️ **Integração Linux** - Funciona perfeitamente com desktop Linux
- 🔄 **Minimizar para Bandeja** - A aplicação fica na bandeja quando fechada
- ⚡ **Abertura Rápida de Conversas** - Abra a última conversa notificada instantaneamente
  - **Atalho Global**: `Ctrl+Shift+L` - Funciona mesmo com a aplicação minimizada
  - **Menu da Bandeja**: Clique direito → "Abrir última conversa"

## 🎮 Como Usar as Notificações

### 🔔 **Quando Receber uma Notificação:**

**Método 1 - Atalho de Teclado (Recomendado)**
```
Pressione: Ctrl + Shift + L
→ Abre automaticamente a conversa da última notificação
```

**Método 2 - Menu da Bandeja**
```
1. Clique direito no ícone da bandeja
2. Clique em "Abrir última conversa (Nome da Pessoa)"
→ Abre automaticamente a conversa específica
```

**Método 3 - Clique na Notificação (Pode não funcionar)**
```
Clicar diretamente na notificação pode não funcionar em alguns ambientes Linux
Use os métodos 1 ou 2 como alternativa confiável
```

## 📋 Pré-requisitos

- **Node.js** 18+ 
- **npm** ou **yarn**
- **Linux** (testado no Ubuntu, deve funcionar em outras distribuições)

## 🛠️ Instalação e Desenvolvimento

### Instalação Rápida (Recomendada)

```bash
# 1. Clone ou baixe o projeto
git clone <repository-url>
cd MeuZapZap

# 2. Execute o instalador
./install.sh
```

Isso instalará o MeuZapZap no sistema e criará:
- ✅ Entrada no menu de aplicações
- ✅ Comando `meuzapzap` no terminal
- ✅ Comando `meuzapzap-autostart` para auto-inicialização
- ✅ Script de desinstalação

### Atualização da Aplicação

```bash
# 1. Baixe a versão mais recente do código
git pull origin main

# 2. Execute o atualizador (mantém configurações)
./update.sh
```

**Vantagens da atualização:**
- ✅ Mantém todas as configurações
- ✅ Não perde auto-start configurado
- ✅ Cria backup automático
- ✅ Atualiza dependências
- ✅ Reinicia aplicação automaticamente

### Desenvolvimento Manual

#### 1. Clone ou configure o projeto

```bash
# Se você clonou o repositório
git clone <repository-url>
cd MeuZapZap

# Instalar dependências
npm install
```

#### 2. Converter ícones

```bash
# Converter uma vez
npm run convert-icons
# ou
./convert-icons.sh

# Monitorar mudanças nos SVGs automaticamente (desenvolvimento)
npm run watch-icons
```

#### 3. Executar em modo desenvolvimento

```bash
npm run dev
```

#### 4. Executar aplicação

```bash
npm start
```

### Auto-inicialização

```bash
# Para instalar no sistema (recomendado)
./install.sh

# Depois configure auto-start
meuzapzap-autostart

# OU para desenvolvimento local
./setup-autostart.sh
```

## 🏗️ Build e Distribuição

### Build para Linux

```bash
# Construir para todas as distribuições Linux
npm run build:linux

# Ou construir apenas um formato específico
npm run build
```

Os seguintes formatos serão gerados na pasta `dist/`:

- **AppImage** - Executável portável
- **DEB** - Pacote Debian/Ubuntu
- **RPM** - Pacote Red Hat/Fedora
- **Snap** - Pacote Snap universal

### Instalação do pacote gerado

```bash
# Para DEB (Ubuntu/Debian)
sudo dpkg -i dist/meuzapzap_1.0.0_amd64.deb

# Para RPM (Fedora/Red Hat)
sudo rpm -i dist/meuzapzap-1.0.0.x86_64.rpm

# Para AppImage
chmod +x dist/MeuZapZap-1.0.0.AppImage
./dist/MeuZapZap-1.0.0.AppImage
```

## 🗑️ Desinstalação

### Desinstalar aplicação instalada via script

```bash
# Execute o script de desinstalação
sudo /opt/MeuZapZap/uninstall.sh
```

### Desinstalar pacotes gerados

```bash
# Para DEB (Ubuntu/Debian)
sudo dpkg -r meuzapzap

# Para RPM (Fedora/Red Hat)
sudo rpm -e meuzapzap

# Para AppImage
# Simplesmente delete o arquivo .AppImage e remova do autostart se configurado
rm ~/Aplicações/MeuZapZap-1.0.0.AppImage  # ou onde você salvou
```

### Limpeza manual completa

```bash
# Remover todos os arquivos relacionados
sudo rm -rf /opt/MeuZapZap
sudo rm -f /usr/share/applications/meuzapzap.desktop
sudo rm -f /usr/local/bin/meuzapzap
sudo rm -f /usr/local/bin/meuzapzap-autostart
rm -f ~/.config/autostart/meuzapzap-autostart.desktop

# Atualizar cache do desktop
sudo update-desktop-database
```

## 🎮 Como Usar

### Após Instalação no Sistema
1. **Encontrar no menu** - Procure por "MeuZapZap" no menu de aplicações
2. **Ou pelo terminal** - Execute `meuzapzap`
3. **Conectar ao WhatsApp** - Use seu celular para escanear o QR code
4. **Auto-start** - Execute `meuzapzap-autostart` para iniciar automaticamente no login

### Durante Desenvolvimento
1. **Iniciar a aplicação** - Execute `npm start` ou abra através do menu de aplicações
2. **Conectar ao WhatsApp** - Use seu celular para escanear o QR code
3. **Minimizar** - Feche a janela para manter a aplicação na bandeja
4. **Notificações** - Receba notificações nativas para novas mensagens
5. **Restaurar janela** - Clique duplo no ícone da bandeja ou clique direito → "Abrir WhatsApp"

### Editar Ícones
1. **Edite os arquivos SVG** em `assets/icon.svg`, `assets/tray-icon*.svg`
2. **Converta automaticamente**: 
   ```bash
   npm run convert-icons
   # ou durante desenvolvimento
   npm run watch-icons  # monitora mudanças nos SVGs
   ```
3. **Se instalado no sistema**: `sudo /opt/MeuZapZap/convert-icons.sh`
4. **Forçar atualização de ícones no sistema**: `./refresh-icons.sh`

**💡 Dica**: Se os ícones não atualizarem no menu do sistema, faça logout/login ou execute `./refresh-icons.sh`

## 🔧 Desenvolvimento no VS Code

### Tarefas Disponíveis

- **Ctrl+Shift+P** → "Tasks: Run Task"
  - `Executar MeuZapZap` - Inicia a aplicação
  - `Executar em Modo Desenvolvimento` - Inicia com DevTools
  - `Construir Aplicação` - Gera builds para distribuição
  - `Construir para Linux` - Build específico para Linux
  - `Instalar Dependências` - Reinstala node_modules

### Debug

1. Vá para a aba "Run and Debug" (Ctrl+Shift+D)
2. Selecione "Debug MeuZapZap" ou "Debug Main Process"
3. Pressione F5 para iniciar o debug

## 📁 Estrutura do Projeto

```
MeuZapZap/
├── src/
│   ├── main.js          # Processo principal do Electron
│   └── preload.js       # Script de preload para comunicação segura
├── assets/
│   ├── icon.svg/.png    # Ícone principal da aplicação
│   ├── tray-icon*.svg/.png    # Ícones da bandeja do sistema
│   └── meuzapzap.desktop      # Arquivo desktop Linux
├── .vscode/
│   ├── tasks.json       # Tarefas do VS Code
│   └── launch.json      # Configurações de debug
├── scripts/
│   ├── install.sh       # Instalador para o sistema
│   ├── update.sh        # Atualizador da aplicação
│   ├── setup-autostart.sh     # Configurar auto-start (desenvolvimento)
│   ├── convert-icons.sh       # Converter SVG para PNG
│   └── check-dependencies.sh  # Verificar dependências do sistema
├── package.json         # Dependências e scripts
├── electron-builder.config.js  # Configuração de build
└── README.md           # Este arquivo
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm start                # Executar aplicação
npm run dev             # Modo desenvolvimento com DevTools
npm run convert-icons   # Converter ícones SVG para PNG
npm run watch-icons     # Monitorar mudanças nos SVGs

# Build e distribuição
npm run build           # Build geral
npm run build:linux     # Build específico para Linux

# Sistema (após instalação)
meuzapzap              # Executar aplicação instalada
meuzapzap-autostart    # Configurar auto-inicialização
sudo /opt/MeuZapZap/uninstall.sh  # Desinstalar aplicação

# Desenvolvimento local
./install.sh           # Instalar no sistema
./update.sh            # Atualizar aplicação instalada
./setup-autostart.sh   # Auto-start para desenvolvimento
./check-dependencies.sh # Verificar dependências
./refresh-icons.sh     # Forçar atualização de ícones do sistema
```

## 🛡️ Segurança e Privacidade

- **Sem dados coletados** - A aplicação não coleta nem armazena dados pessoais
- **WhatsApp Web oficial** - Usa a interface oficial do WhatsApp
- **Código aberto** - Todo o código está disponível para auditoria
- **Isolamento de contexto** - Implementa as melhores práticas de segurança do Electron

## 🐛 Resolução de Problemas

### Erro "Chrome 60 ou posterior deve ser instalado"

```bash
# 1. Execute o script de verificação de dependências
./check-dependencies.sh

# 2. Atualize as dependências do projeto
npm update

# 3. Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install

# 4. Tente executar novamente
npm start
```

### A aplicação não inicia

```bash
# Verificar dependências
npm install

# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Notificações não funcionam

1. Verifique se as notificações estão habilitadas no sistema
2. Execute: `notify-send "Teste" "Notificação funcionando"`
3. Reinstale as dependências se necessário

### Ícones da bandeja não aparecem

```bash
# Reinstalar libappindicator
sudo apt install libappindicator3-1

# Para outros sistemas, verifique a documentação específica
```

### Ícones não atualizam no sistema

```bash
# 1. Reconverter ícones com transparência
./convert-icons.sh

# 2. Forçar atualização do cache do sistema
./refresh-icons.sh

# 3. Se ainda não funcionar
sudo update-desktop-database
sudo gtk-update-icon-cache -f /usr/share/icons/hicolor/

# 4. Em último caso, fazer logout/login
```

### Erro de build

```bash
# Limpar e reconstruir
npm run clean  # Se disponível
rm -rf dist/
npm run build:linux
```

### Problemas com dependências do sistema

```bash
# Execute o script de verificação
./check-dependencies.sh

# Ou instale manualmente as dependências principais
sudo apt install libnotify4 libappindicator3-1 libsecret-1-0 libnss3
```

### Problemas após atualização

```bash
# Se a aplicação não funcionar após atualização
# 1. Verificar se está rodando
ps aux | grep meuzapzap

# 2. Reiniciar aplicação
pkill -f meuzapzap
meuzapzap

# 3. Em último caso, reinstalar
sudo /opt/MeuZapZap/uninstall.sh
./install.sh
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Créditos

- Inspirado no [ZapZap](https://github.com/rafaelmardojai/zap-zap)
- Construído com [Electron](https://electronjs.org/)
- Ícones baseados no design oficial do WhatsApp

## 📞 Suporte

- Abra uma [issue](../../issues) para reportar bugs
- Consulte a [documentação do Electron](https://electronjs.org/docs) para questões técnicas
- Verifique as [releases](../../releases) para atualizações

---

**Nota**: Esta aplicação não é oficialmente afiliada ao WhatsApp Inc. É um cliente não oficial que utiliza a interface WhatsApp Web.