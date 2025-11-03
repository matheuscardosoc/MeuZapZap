#!/bin/bash

# Script para converter ícones SVG para PNG usando ImageMagick
# Instalar: sudo apt install imagemagick

ASSETS_DIR="./assets"

echo "Convertendo ícones SVG para PNG..."

# Verificar se ImageMagick está instalado
if command -v convert &> /dev/null; then
    # Ícone principal da aplicação (256x256)
    convert "$ASSETS_DIR/icon.svg" -resize 256x256 "$ASSETS_DIR/icon.png"
    
    # Ícones da bandeja (16x16)
    convert "$ASSETS_DIR/tray-icon.svg" -resize 16x16 "$ASSETS_DIR/tray-icon.png"
    convert "$ASSETS_DIR/tray-icon-unread.svg" -resize 16x16 "$ASSETS_DIR/tray-icon-unread.png"
    convert "$ASSETS_DIR/tray-icon-offline.svg" -resize 16x16 "$ASSETS_DIR/tray-icon-offline.png"
    
    echo "✅ Ícones convertidos com sucesso!"
    
    # Se estiver em desenvolvimento, reiniciar a aplicação
    if pgrep -f "electron.*meuzapzap" > /dev/null; then
        echo "🔄 Reiniciando aplicação para aplicar novos ícones..."
        pkill -f "electron.*meuzapzap"
        sleep 2
        nohup npm start > /dev/null 2>&1 &
        echo "🚀 Aplicação reiniciada!"
    fi
else
    echo "❌ ImageMagick não está instalado. Execute: sudo apt install imagemagick"
    echo "Alternativamente, você pode converter os SVGs manualmente ou usar ferramentas online."
fi