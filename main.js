const { app, BrowserWindow, ipcMain, Menu, dialog, shell, net } = require('electron');
Menu.setApplicationMenu(null);
const path = require('path');
const fs = require('fs');

// Import the existing server logic
require('./server.js');

let mainWindow;

async function checkForUpdates() {
    try {
        const url = 'https://api.github.com/repos/davidrfyt/VimeoDownload/releases/latest';
        const response = await net.fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        const currentVersion = app.getVersion();

        if (isBetterVersion(latestVersion, currentVersion)) {
            const result = dialog.showMessageBoxSync({
                type: 'info',
                buttons: ['Actualizar', 'Más tarde'],
                defaultId: 0,
                title: 'Actualización disponible',
                message: `¡Hay una nueva versión disponible (${latestVersion})!`,
                detail: '¿Quieres ir a GitHub para descargar el nuevo ZIP?'
            });

            if (result === 0) {
                shell.openExternal('https://github.com/davidrfyt/VimeoDownload/releases/latest');
            }
        }
    } catch (err) {
        console.error('Error checking for updates:', err);
    }
}

function isBetterVersion(latest, current) {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (l[i] > (c[i] || 0)) return true;
        if (l[i] < (c[i] || 0)) return false;
    }
    return false;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        frame: true,
        icon: path.join(__dirname, 'public/icons/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#0f172a'
    });

    mainWindow.loadURL('http://localhost:3000');
    mainWindow.maximize();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Initial check
    setTimeout(checkForUpdates, 3000);
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC communication for version and status
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});
