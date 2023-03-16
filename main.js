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
        },
        maximizable: false,
        minWidth: 480
    })

    // win.webContents.openDevTools();
    win.loadFile('index.html')
}

const forwardOutput = (message) => {
    win.webContents.send("on-output", message);
}

app.whenReady().then(async () => {
    flash = await import('firmware-flash');
    flash.logger.printToConsole = true;
    flash.logger.onLog = forwardOutput;
    createWindow()
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

ipcMain.handle('on-file-dropped', (event, filePath) => {
    flash.flashFirmware(filePath);
    event.returnValue = `Done`; // Synchronous reply
})

ipcMain.handle('on-install', async (event, arg) => {    
    return new Promise(async function (resolve, reject) {                
        if(await flash.flashMicroPythonFirmware()) {
            resolve("✅ Firmware flashed successfully!");
        } else {
            reject("❌ Failed to flash firmware!");
        }
    });
});