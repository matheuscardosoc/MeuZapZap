#!/bin/bash

# Script para configurar auto-start do MeuZapZap no login do sistema

AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/meuzapzap-autostart.desktop"
CURRENT_DIR="$(pwd)"

echo "🔧 Configurando auto-start do MeuZapZap..."

# Criar diretório autostart se não existir
mkdir -p "$AUTOSTART_DIR"

# Criar arquivo .desktop para autostart
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=MeuZapZap
Comment=WhatsApp para Linux com notificações nativas
Exec=$CURRENT_DIR/start-meuzapzap.sh
Icon=$CURRENT_DIR/assets/icon.png
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
Terminal=false
Categories=Network;InstantMessaging;
EOF

# Criar script de inicialização
cat > "$CURRENT_DIR/start-meuzapzap.sh" << EOF
#!/bin/bash
cd "$CURRENT_DIR"
npm start > /dev/null 2>&1 &
EOF

# Tornar executável
chmod +x "$CURRENT_DIR/start-meuzapzap.sh"
chmod +x "$DESKTOP_FILE"

echo "✅ Auto-start configurado com sucesso!"
echo ""
echo "📋 O que foi criado:"
echo "   • $DESKTOP_FILE"
echo "   • $CURRENT_DIR/start-meuzapzap.sh"
echo ""
echo "🚀 O MeuZapZap agora iniciará automaticamente quando você fizer login!"
echo ""
echo "💡 Para desabilitar:"
echo "   • Execute: rm '$DESKTOP_FILE'"
echo "   • Ou desmarque nas configurações de aplicações de inicialização do sistema"