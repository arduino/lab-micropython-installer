if (require('electron-squirrel-startup')) return;

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')

// Handle events from windows squirrel installer
if (process.platform === "win32" && handleSquirrelEvent()) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

require('update-electron-app')();

let flash;
let win;
let logger;

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
    win.removeMenu();
    win.loadFile('index.html')
}

const forwardOutput = (message, level) => {
    if(level > flash.Logger.LOG_LEVEL.DEBUG) {
        win.webContents.send("on-output", message);    
    }
}

app.whenReady().then(async () => {
    flash = await import('firmware-flash');
    logger = new flash.Logger(forwardOutput, true, flash.Logger.LOG_LEVEL.DEBUG);
    flash.setLogger(logger);
    createWindow()
})

app.on('window-all-closed', () => {
    app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

ipcMain.handle('on-file-selected', async (event, data) => {
    const { deviceData, filePath } = data;
    logger.log(`⤵️ Data received from UI: '${Object.keys(data)}'`, flash.Logger.LOG_LEVEL.DEBUG);
    logger.log(`📄 File dropped for flashing: '${filePath}'`, flash.Logger.LOG_LEVEL.DEBUG);
    // Alternative to returning a promise:  
    // event.returnValue = `Done`; // Synchronous reply
    return new Promise(async function (resolve, reject) {
        const selectedDevice = flash.deviceManager.getDevice(deviceData.vendorID, deviceData.productID);
        try {
            if(!selectedDevice){
                reject("❌ Selected is not available. Click 'Refresh' to update the list of devices.");
                return;
            }
            if (await flash.flashFirmware(filePath, selectedDevice)) {
                resolve("🎉 Done! You may need to reboot the board.");
            } else {
                // Due to a bug in Electron the error message is reformatted.
                // Therefore the error message is created in the renderer process
                // See: https://github.com/electron/electron/issues/24427
                reject("❌ Failed to flash firmware.");
            }
        } catch (error) {
            logger.log(error, flash.Logger.LOG_LEVEL.DEBUG);
            reject(error);
        }
    });
})

ipcMain.handle('on-install', async (event, data) => {
    const { deviceData, useNightlyBuild } = data;
    return new Promise(async function (resolve, reject) {
        const selectedDevice = flash.deviceManager.getDevice(deviceData.vendorID, deviceData.productID);
        try {
            if(!selectedDevice){
                reject("❌ Selected is not available. Click 'Refresh' to update the list of devices.");
                return;
            }
            if (await flash.flashMicroPythonFirmware(selectedDevice, useNightlyBuild)) {
                resolve("🎉 Done! You may need to reboot the board.");
            } else {
                // Due to a bug in Electron the error message is reformatted and needs
                // to be cleaned up in the renderer process.
                // See: https://github.com/electron/electron/issues/24427
                reject("❌ Failed to flash firmware.");
            }
        } catch (error) {
            logger.log(error, flash.Logger.LOG_LEVEL.DEBUG);
            reject(error);
        }
    });
});

ipcMain.handle('on-get-devices', async (event, arg) => {
    return new Promise(async function (resolve, reject) {
        await flash.deviceManager.refreshDeviceList();
        const devices = await flash.getDeviceList();
        if (devices.length === 0) {
            resolve([]);
        } else {
            const pojos = devices.map(device => device.toPlainObject());
            resolve(pojos);
        }
    });
});

function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function (command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, { detached: true });
        } catch (error) { }

        return spawnedProcess;
    };

    const spawnUpdate = function (args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);
            setTimeout(app.quit, 1000);
            return true;
        case '--squirrel-uninstall':
            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);
            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated
            app.quit();
            return true;
    }
};
