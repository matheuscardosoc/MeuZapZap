#!/bin/bash

# Script de atualização do MeuZapZap
# Atualiza a aplicação instalada sem perder configurações

set -e  # Parar em caso de erro

INSTALL_DIR="/opt/MeuZapZap"
CURRENT_DIR="$(pwd)"
BACKUP_DIR="/tmp/meuzapzap-backup-$(date +%Y%m%d_%H%M%S)"

echo "🔄 Atualizador do MeuZapZap v1.0.0"
echo "=================================="
echo ""

# Verificar se a aplicação está instalada
if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ MeuZapZap não está instalado no sistema!"
    echo "💡 Execute: ./install.sh para instalar"
    exit 1
fi

# Verificar se estamos no diretório correto
if [ ! -f "$CURRENT_DIR/package.json" ]; then
    echo "❌ Execute este script no diretório do MeuZapZap!"
    exit 1
fi

echo "📋 Verificando versões..."

# Obter versão atual instalada
CURRENT_VERSION=""
if [ -f "$INSTALL_DIR/package.json" ]; then
    CURRENT_VERSION=$(grep '"version"' "$INSTALL_DIR/package.json" | cut -d'"' -f4)
fi

# Obter nova versão
NEW_VERSION=$(grep '"version"' "$CURRENT_DIR/package.json" | cut -d'"' -f4)

echo "   • Versão instalada: ${CURRENT_VERSION:-"Desconhecida"}"
echo "   • Nova versão: $NEW_VERSION"
echo ""

# Confirmar atualização
read -p "🤔 Deseja continuar com a atualização? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "❌ Atualização cancelada pelo usuário"
    exit 0
fi

echo ""
echo "🛑 Parando aplicação..."
# Parar a aplicação se estiver rodando
pkill -f "meuzapzap" 2>/dev/null || true
pkill -f "electron.*MeuZapZap" 2>/dev/null || true
sleep 2

echo "💾 Criando backup das configurações..."
# Criar backup das configurações importantes
mkdir -p "$BACKUP_DIR"
if [ -d "$INSTALL_DIR" ]; then
    # Backup de arquivos que podem ter sido personalizados
    cp -f "$INSTALL_DIR/package.json" "$BACKUP_DIR/" 2>/dev/null || true
    cp -rf "$INSTALL_DIR/assets" "$BACKUP_DIR/" 2>/dev/null || true
fi

echo "📁 Atualizando arquivos..."
# Copiar novos arquivos
sudo cp -r "$CURRENT_DIR/src" "$INSTALL_DIR/"
sudo cp -r "$CURRENT_DIR/assets" "$INSTALL_DIR/"
sudo cp "$CURRENT_DIR/package.json" "$INSTALL_DIR/"
sudo cp "$CURRENT_DIR/convert-icons.sh" "$INSTALL_DIR/"
sudo cp "$CURRENT_DIR/LICENSE" "$INSTALL_DIR/" 2>/dev/null || true

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

# Ajustar permissões
sudo chown -R root:root "$INSTALL_DIR"
sudo chmod -R 755 "$INSTALL_DIR"
sudo chmod +x "$INSTALL_DIR/convert-icons.sh"

echo "📦 Atualizando dependências..."
cd "$INSTALL_DIR"
sudo npm install --omit=dev --no-audit --no-fund > /dev/null 2>&1

echo "🎨 Convertendo ícones..."
sudo bash "$INSTALL_DIR/convert-icons.sh" > /dev/null 2>&1

# Verificar se o script executável existe e atualizá-lo se necessário
if [ ! -f "$INSTALL_DIR/meuzapzap" ]; then
    echo "🔧 Criando script executável..."
    sudo tee "$INSTALL_DIR/meuzapzap" > /dev/null << 'EOF'
#!/bin/bash
export DISPLAY=${DISPLAY:-:0}
cd /opt/MeuZapZap
exec /usr/bin/npm start 2>/dev/null
EOF
    sudo chmod +x "$INSTALL_DIR/meuzapzap"
fi

# Atualizar entrada do menu se necessário
DESKTOP_FILE="/usr/share/applications/meuzapzap.desktop"
if [ ! -f "$DESKTOP_FILE" ]; then
    echo "🖥️ Criando entrada no menu..."
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
    sudo update-desktop-database
fi

echo ""
echo "🎉 Atualização concluída com sucesso!"
echo ""
echo "📋 O que foi atualizado:"
echo "   • Código fonte da aplicação"
echo "   • Dependências Node.js"
echo "   • Ícones e recursos"
echo "   • Scripts e configurações"
echo ""
echo "💾 Backup criado em: $BACKUP_DIR"
echo ""
echo "🚀 Como usar:"
echo "   • Pelo menu: Procure por 'MeuZapZap'"
echo "   • Pelo terminal: meuzapzap"
echo ""
echo "🔄 A aplicação foi reiniciada automaticamente!"

# Tentar reiniciar a aplicação
nohup "$INSTALL_DIR/meuzapzap" > /dev/null 2>&1 &

echo ""
echo "💡 Se houver problemas:"
echo "   • Restaurar backup: sudo cp -r $BACKUP_DIR/* $INSTALL_DIR/"
echo "   • Logs de erro: journalctl -f | grep meuzapzap"
echo "   • Reiniciar: meuzapzap"