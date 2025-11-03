#!/bin/bash

# Script para verificar e instalar dependências necessárias para o MeuZapZap

echo "🔍 Verificando dependências do sistema..."

# Verificar se estamos no Ubuntu/Debian
if command -v apt &> /dev/null; then
    echo "📦 Sistema baseado em Debian/Ubuntu detectado"
    
    # Lista de dependências necessárias
    DEPS=(
        "libnotify4"
        "libappindicator3-1" 
        "libsecret-1-0"
        "libnss3"
        "libatk-bridge2.0-0"
        "libdrm2"
        "libxkbcommon0"
        "libxss1"
        "libasound2"
    )
    
    echo "🔧 Instalando dependências necessárias..."
    for dep in "${DEPS[@]}"; do
        if ! dpkg -l | grep -q "^ii  $dep "; then
            echo "📥 Instalando $dep..."
            sudo apt install -y "$dep" 2>/dev/null || echo "⚠️  Falha ao instalar $dep"
        else
            echo "✅ $dep já está instalado"
        fi
    done
    
# Verificar se estamos no Fedora/Red Hat
elif command -v dnf &> /dev/null; then
    echo "📦 Sistema baseado em Red Hat/Fedora detectado"
    
    DEPS=(
        "libnotify"
        "libappindicator-gtk3"
        "libsecret"
        "nss"
        "atk"
        "libdrm"
        "libxkbcommon"
        "libXScrnSaver"
        "alsa-lib"
    )
    
    echo "🔧 Instalando dependências necessárias..."
    for dep in "${DEPS[@]}"; do
        if ! rpm -q "$dep" &>/dev/null; then
            echo "📥 Instalando $dep..."
            sudo dnf install -y "$dep" 2>/dev/null || echo "⚠️  Falha ao instalar $dep"
        else
            echo "✅ $dep já está instalado"
        fi
    done
    
else
    echo "⚠️  Sistema não reconhecido. Verifique manualmente as dependências."
fi

echo ""
echo "🎉 Verificação de dependências concluída!"
echo ""
echo "💡 Se ainda houver problemas, tente:"
echo "   - Reiniciar o sistema"
echo "   - Executar: export DISPLAY=:0"
echo "   - Verificar se o X11 está funcionando corretamente"
echo ""
echo "🚀 Agora você pode executar: npm start"