const { execSync } = require('child_process');
const path = require('path');

// Configuração para o electron-builder
module.exports = {
  appId: 'com.meuzapzap.app',
  productName: 'MeuZapZap',
  directories: {
    output: 'dist'
  },
  files: [
    'src/**/*',
    'assets/**/*',
    'node_modules/**/*',
    '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
    '!**/node_modules/*.d.ts',
    '!**/node_modules/.bin',
    '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
    '!.editorconfig',
    '!**/._*',
    '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
    '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
    '!**/{appveyor.yml,.travis.yml,circle.yml}',
    '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}'
  ],
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      },
      {
        target: 'snap',
        arch: ['x64']
      }
    ],
    category: 'Network',
    desktop: {
      Name: 'MeuZapZap',
      Comment: 'WhatsApp para Linux com notificações nativas',
      Categories: 'Network;InstantMessaging;',
      StartupWMClass: 'MeuZapZap',
      MimeType: 'x-scheme-handler/whatsapp;'
    },
    icon: 'assets/icon.png'
  },
  deb: {
    depends: [
      'libnotify4',
      'libappindicator3-1',
      'libsecret-1-0'
    ]
  },
  rpm: {
    depends: [
      'libnotify',
      'libappindicator-gtk3',
      'libsecret'
    ]
  },
  snap: {
    grade: 'stable',
    confinement: 'strict',
    plugs: [
      'default',
      'browser-support',
      'network',
      'desktop',
      'desktop-legacy',
      'home',
      'opengl',
      'pulseaudio',
      'removable-media',
      'unity7'
    ]
  },
  appImage: {
    license: 'LICENSE'
  }
};