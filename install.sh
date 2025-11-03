#!/bin/bash

# Instalador do MeuZapZap
# Este script instala o MeuZapZap no sistema Linux

set -e  # Parar em caso de erro

INSTALL_DIR="/opt/MeuZapZap"
DESKTOP_FILE="/usr/share/applications/meuzapzap.desktop"
BIN_LINK="/usr/local/bin/meuzapzap"
CURRENT_DIR="$(pwd)"

echo "🚀 Instalador do MeuZapZap v1.0.0"
echo "=================================="
echo ""

# Verificar se está sendo executado como root
if [[ $EUID -eq 0 ]]; then
    echo "❌ Este script não deve ser executado como root!"
    echo "💡 Execute: ./install.sh"
    exit 1
fi

# Verificar dependências
echo "🔍 Verificando dependências..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado!"
    echo "💡 Instale com: sudo apt install nodejs npm"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm não está instalado!"
    echo "💡 Instale com: sudo apt install npm"
    exit 1
fi

echo "✅ Node.js e npm encontrados"

# Instalar dependências do sistema
echo ""
echo "📦 Instalando dependências do sistema..."
sudo apt update
sudo apt install -y libnotify4 libappindicator3-1 libsecret-1-0 libnss3 \
                    libatk-bridge2.0-0t64 libdrm2 libxkbcommon0 libxss1 \
                    libasound2t64 imagemagick

# Criar diretório de instalação
echo ""
echo "📁 Criando diretório de instalação..."
sudo rm -rf "$INSTALL_DIR"
sudo mkdir -p "$INSTALL_DIR"

# Copiar arquivos
echo "📋 Copiando arquivos..."
sudo rm -rf "$INSTALL_DIR"
sudo mkdir -p "$INSTALL_DIR"

# Copiar apenas os arquivos necessários para produção
sudo cp -r "$CURRENT_DIR/src" "$INSTALL_DIR/"
sudo cp -r "$CURRENT_DIR/assets" "$INSTALL_DIR/"
sudo cp "$CURRENT_DIR/package.json" "$INSTALL_DIR/"
sudo cp "$CURRENT_DIR/convert-icons.sh" "$INSTALL_DIR/"
sudo cp "$CURRENT_DIR/LICENSE" "$INSTALL_DIR/"

# Criar package.json simplificado para produção
sudo tee "$INSTALL_DIR/package.json" > /dev/null << 'EOF'
{
  "name": "meuzapzap",
  "version": "1.0.0",
  "description": "WhatsApp Linux notification app with system tray integration",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "convert-icons": "./convert-icons.sh"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "node-notifier": "^10.0.1"
  },
  "author": "Matheus",
  "license": "MIT"
}
EOF

sudo chown -R root:root "$INSTALL_DIR"
sudo chmod -R 755 "$INSTALL_DIR"
sudo chmod +x "$INSTALL_DIR/convert-icons.sh"

# Instalar dependências Node.js
echo ""
echo "📦 Instalando dependências Node.js..."
cd "$INSTALL_DIR"
sudo npm install --omit=dev

# Converter ícones
echo ""
echo "🎨 Convertendo ícones..."
sudo bash "$INSTALL_DIR/convert-icons.sh"

# Criar arquivo .desktop
echo ""
echo "🖥️ Criando entrada no menu de aplicações..."
sudo tee "$DESKTOP_FILE" > /dev/null << EOF
[Desktop Entry]
Name=MeuZapZap
Comment=WhatsApp para Linux com notificações nativas
Exec=$INSTALL_DIR/meuzapzap
Icon=$INSTALL_DIR/assets/icon.png
Type=Application
Categories=Network;InstantMessaging;
StartupWMClass=MeuZapZap
MimeType=x-scheme-handler/whatsapp;
StartupNotify=true
Terminal=false
EOF

# Criar script executável
sudo tee "$INSTALL_DIR/meuzapzap" > /dev/null << 'EOF'
#!/bin/bash
export DISPLAY=${DISPLAY:-:0}
cd /opt/MeuZapZap
exec /usr/bin/npm start 2>/dev/null
EOF

sudo chmod +x "$INSTALL_DIR/meuzapzap"

# Criar link simbólico
echo "🔗 Criando link simbólico..."
sudo ln -sf "$INSTALL_DIR/meuzapzap" "$BIN_LINK"

# Atualizar cache do desktop
echo "🔄 Atualizando cache do desktop..."
sudo update-desktop-database

echo ""
echo "🎉 Instalação concluída com sucesso!"
echo ""
echo "📋 O que foi instalado:"
echo "   • Aplicação: $INSTALL_DIR"
echo "   • Menu: $DESKTOP_FILE"
echo "   • Comando: $BIN_LINK"
echo ""
echo "🚀 Como usar:"
echo "   • Pelo menu: Procure por 'MeuZapZap'"
echo "   • Pelo terminal: meuzapzap"
echo "   • Auto-start: Execute 'meuzapzap-autostart'"
echo ""
echo "🗑️ Para desinstalar:"
echo "   • Execute: sudo $INSTALL_DIR/uninstall.sh"

# Criar script de desinstalação
sudo tee "$INSTALL_DIR/uninstall.sh" > /dev/null << EOF
#!/bin/bash
echo "🗑️ Desinstalando MeuZapZap..."
sudo rm -rf "$INSTALL_DIR"
sudo rm -f "$DESKTOP_FILE"
sudo rm -f "$BIN_LINK"
sudo rm -f "\$HOME/.config/autostart/meuzapzap-autostart.desktop"
sudo update-desktop-database
echo "✅ MeuZapZap desinstalado com sucesso!"
EOF

sudo chmod +x "$INSTALL_DIR/uninstall.sh"

# Criar comando para auto-start
sudo tee "/usr/local/bin/meuzapzap-autostart" > /dev/null << EOF
#!/bin/bash
AUTOSTART_DIR="\$HOME/.config/autostart"
DESKTOP_FILE="\$AUTOSTART_DIR/meuzapzap-autostart.desktop"

mkdir -p "\$AUTOSTART_DIR"

cat > "\$DESKTOP_FILE" << 'AUTOSTART_EOF'
[Desktop Entry]
Type=Application
Name=MeuZapZap
Comment=WhatsApp para Linux com notificações nativas
Exec=/opt/MeuZapZap/meuzapzap
Icon=/opt/MeuZapZap/assets/icon.png
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
Terminal=false
Categories=Network;InstantMessaging;
AUTOSTART_EOF

echo "✅ Auto-start configurado! MeuZapZap iniciará automaticamente no próximo login."
EOF

sudo chmod +x "/usr/local/bin/meuzapzap-autostart"

echo ""
echo "💡 Dicas extras:"
echo "   • Para configurar auto-start: meuzapzap-autostart"
echo "   • Para editar ícones SVG: Edite em $INSTALL_DIR/assets/ e execute sudo $INSTALL_DIR/convert-icons.sh"