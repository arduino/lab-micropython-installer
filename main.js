const { app, BrowserWindow, ipcMain, nativeImage, NativeImage } = require('electron')
const path = require('path')
// const flash = require('firmware-flash');

let win;
const createWindow = () => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.webContents.openDevTools();
    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()

    /** Define channel name and message */
    const CHANNEL_NAME = 'main';
    const MESSAGE = 'tick';

    /** Send message every one second */
    setInterval(() => {
        win.webContents.send(CHANNEL_NAME, MESSAGE);
    }, 1000);
})

ipcMain.on('dropped-file', (event, arg) => {
    console.log('Dropped File(s):', arg);
    event.returnValue = `Received ${arg.length} paths.`; // Synchronous reply
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})



ipcMain.handle('onInstall', async (event, arg) => {
    return new Promise(function (resolve, reject) {
        // do stuff
        if (true) {
            resolve("this worked!");
        } else {
            reject("this didn't work!");
        }
    });
});