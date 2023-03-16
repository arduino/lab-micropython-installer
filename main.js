const { app, BrowserWindow, ipcMain, nativeImage, NativeImage } = require('electron')
const path = require('path')
let flash;

let win;
const createWindow = () => {
    win = new BrowserWindow({
        width: 665,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.webContents.openDevTools();
    win.loadFile('index.html')
}

app.whenReady().then(async () => {
    flash = await import('firmware-flash');
    createWindow()

    // const CHANNEL_NAME = 'main';
    // const MESSAGE = 'tick';

    /** Send message every one second */
    // setInterval(() => {
    //     win.webContents.send(CHANNEL_NAME, MESSAGE);
    // }, 1000);
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

ipcMain.handle('on-install', async (event, arg) => {
    return new Promise(async function (resolve, reject) {
        if(await flash.flashFirmware()) {
            resolve("✅ Firmware flashed successfully!");
        } else {
            reject("❌ Firmware flash failed!");
        }
    });
});