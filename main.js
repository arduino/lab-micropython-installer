const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')
let flash;
let win;

const createWindow = () => {
    win = new BrowserWindow({
        width: 665,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        },
        maximizable: false,
        minWidth: 550,
        minHeight: 800,
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

ipcMain.handle('on-file-selected', async (event, filePath) => {
    // Alternative to returning a promise:  
    // event.returnValue = `Done`; // Synchronous reply
    return new Promise(async function (resolve, reject) {
        const selectedDevice = await flash.getFirstFoundDevice();

        if (selectedDevice && await flash.flashFirmware(filePath, selectedDevice)) {
            resolve("✅ Firmware flashed successfully! You may need to reset the device.");
        } else {
            // Due to a bug in Electron the error message is reformatted.
            // Therefore the error message is created in the renderer process
            // See: https://github.com/electron/electron/issues/24427
            reject("Error");
        }
    });
})

ipcMain.handle('on-install', async (event, arg) => {
    return new Promise(async function (resolve, reject) {
        const selectedDevice = flash.deviceManager.getDevice(arg.vendorID, arg.productID);
        const useNightlyBuild = true; // TODO: Add a checkbox to the UI

        if (selectedDevice && await flash.flashMicroPythonFirmware(selectedDevice, useNightlyBuild)) {
            resolve("✅ Firmware flashed successfully! You may need to reset the device.");
        } else {
            // Due to a bug in Electron the error message is reformatted.
            // Therefore the error message is created in the renderer process
            // See: https://github.com/electron/electron/issues/24427
            reject("Error");
        }
    });
});

ipcMain.handle('on-get-devices', async (event, arg) => {
    return new Promise(async function (resolve, reject) {
        await flash.deviceManager.refreshDeviceList();
        const devices = await flash.getDeviceList();
        if (devices.length === 0) {
            reject("No devices found.");
        } else {
            const pojos = devices.map(device => device.toPlainObject());
            resolve(pojos);
        }
    });
});