const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

// Import the existing server logic (we'll modify server.js slightly to export the app or just require it)
// For now, we'll let server.js run as usual but controlled by main.js
require('./server.js');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        frame: true, // We can make it frameless later for a pro look
        icon: path.join(__dirname, 'public/icons/icon.ico'), // We'll need to generate an ico
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#0f172a'
    });

    // In production, we might load the localhost URL or the file directly
    mainWindow.loadURL('http://localhost:3000');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Auto-updater events
    autoUpdater.checkForUpdatesAndNotify();
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
