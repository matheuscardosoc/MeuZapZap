#!/bin/bash

# Script para forçar atualização dos ícones no sistema Linux

echo "🧹 Forçando atualização do cache de ícones do sistema..."

# Atualizar cache de ícones do sistema
echo "📁 Atualizando cache de ícones..."
sudo update-desktop-database
sudo gtk-update-icon-cache -f /usr/share/icons/hicolor/ 2>/dev/null || true

# Limpar cache do usuário
echo "👤 Limpando cache do usuário..."
rm -rf ~/.cache/icon-theme.cache 2>/dev/null || true
rm -rf ~/.cache/thumbnails/* 2>/dev/null || true

# Se o MeuZapZap estiver instalado, atualizar seus ícones
if [ -d "/opt/MeuZapZap" ]; then
    echo "🔄 Sincronizando ícones da aplicação instalada..."
    sudo cp assets/*.png /opt/MeuZapZap/assets/ 2>/dev/null || true
    
    # Recriar arquivo .desktop com timestamp atualizado
    sudo touch /usr/share/applications/meuzapzap.desktop
fi

# Recarregar ambiente de desktop
echo "🖥️ Recarregando ambiente de desktop..."
if command -v xdg-desktop-menu &> /dev/null; then
    xdg-desktop-menu forceupdate 2>/dev/null || true
fi

# Tentar recarregar diferentes gerenciadores de janela
if pgrep -x "gnome-shell" > /dev/null; then
    echo "🔄 Recarregando GNOME Shell..."
    # GNOME Shell - recarregar
    busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Recarregando...")' 2>/dev/null || true
elif pgrep -x "cinnamon" > /dev/null; then
    echo "🔄 Recarregando Cinnamon..."
    cinnamon --replace &>/dev/null &
elif pgrep -x "mate-panel" > /dev/null; then
    echo "🔄 Recarregando MATE..."
    mate-panel --replace &>/dev/null &
fi

echo ""
echo "✅ Cache de ícones atualizado!"
echo ""
echo "💡 Para garantir que os ícones sejam atualizados:"
echo "   1. Feche e abra o menu de aplicações"
echo "   2. Ou faça logout/login"
echo "   3. Ou reinicie o sistema"
echo ""
echo "🔍 Verificar se funcionou:"
echo "   • Procure por 'MeuZapZap' no menu de aplicações"
echo "   • O ícone deve aparecer atualizado"