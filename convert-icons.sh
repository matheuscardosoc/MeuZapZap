#!/bin/bash

# Script para converter ícones SVG para PNG usando ImageMagick
# Instalar: sudo apt install imagemagick

ASSETS_DIR="./assets"

echo "Convertendo ícones SVG para PNG..."

# Verificar se ImageMagick está instalado
if command -v convert &> /dev/null; then
    # Configurações para preservar transparência e melhorar qualidade
    CONVERT_OPTS="-background transparent -antialias -density 300"
    
    # Ícone principal da aplicação (múltiplas resoluções)
    echo "🎨 Convertendo ícone principal..."
    convert $CONVERT_OPTS "$ASSETS_DIR/icon.svg" -resize 16x16 "$ASSETS_DIR/icon-16.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/icon.svg" -resize 32x32 "$ASSETS_DIR/icon-32.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/icon.svg" -resize 48x48 "$ASSETS_DIR/icon-48.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/icon.svg" -resize 64x64 "$ASSETS_DIR/icon-64.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/icon.svg" -resize 128x128 "$ASSETS_DIR/icon-128.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/icon.svg" -resize 256x256 "$ASSETS_DIR/icon.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/icon.svg" -resize 512x512 "$ASSETS_DIR/icon-512.png"
    
    # Ícones da bandeja (múltiplas resoluções para melhor qualidade)
    echo "🎯 Convertendo ícones da bandeja..."
    
    # Ícone normal (conectado)
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon.svg" -resize 16x16 "$ASSETS_DIR/tray-icon-16.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon.svg" -resize 24x24 "$ASSETS_DIR/tray-icon-24.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon.svg" -resize 32x32 "$ASSETS_DIR/tray-icon.png"
    
    # Ícone com mensagens não lidas
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon-unread.svg" -resize 16x16 "$ASSETS_DIR/tray-icon-unread-16.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon-unread.svg" -resize 24x24 "$ASSETS_DIR/tray-icon-unread-24.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon-unread.svg" -resize 32x32 "$ASSETS_DIR/tray-icon-unread.png"
    
    # Ícone offline
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon-offline.svg" -resize 16x16 "$ASSETS_DIR/tray-icon-offline-16.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon-offline.svg" -resize 24x24 "$ASSETS_DIR/tray-icon-offline-24.png"
    convert $CONVERT_OPTS "$ASSETS_DIR/tray-icon-offline.svg" -resize 32x32 "$ASSETS_DIR/tray-icon-offline.png"
    
    echo "✅ Ícones convertidos com sucesso!"
    echo "📋 Resoluções geradas:"
    echo "   • Ícone principal: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512"
    echo "   • Ícones bandeja: 16x16, 24x24, 32x32"
    echo "   • Transparência: Preservada"
    echo "   • Qualidade: Alta densidade (300 DPI)"
    
    # Limpar cache de ícones do sistema
    echo "🧹 Limpando cache de ícones do sistema..."
    if command -v gtk-update-icon-cache &> /dev/null; then
        gtk-update-icon-cache -f -t ~/.local/share/icons/ 2>/dev/null || true
        gtk-update-icon-cache -f -t /usr/share/icons/hicolor/ 2>/dev/null || true
    fi
    
    # Se aplicação estiver instalada, atualizar ícones do sistema
    if [ -d "/opt/MeuZapZap" ]; then
        echo "🔄 Atualizando ícones da aplicação instalada..."
        sudo cp assets/*.png /opt/MeuZapZap/assets/ 2>/dev/null || true
        sudo update-desktop-database 2>/dev/null || true
    fi
    
    # Se estiver em desenvolvimento, reiniciar a aplicação
    if pgrep -f "electron.*meuzapzap" > /dev/null; then
        echo "🔄 Reiniciando aplicação para aplicar novos ícones..."
        pkill -f "electron.*meuzapzap"
        sleep 2
        nohup npm start > /dev/null 2>&1 &
        echo "🚀 Aplicação reiniciada!"
    fi
    
    echo ""
    echo "💡 Se os ícones ainda não atualizaram no sistema:"
    echo "   • Faça logout/login no sistema"
    echo "   • Ou execute: sudo update-desktop-database && sudo gtk-update-icon-cache -f /usr/share/icons/hicolor/"
    
else
    echo "❌ ImageMagick não está instalado. Execute: sudo apt install imagemagick"
    echo "Alternativamente, você pode converter os SVGs manualmente ou usar ferramentas online."
fi