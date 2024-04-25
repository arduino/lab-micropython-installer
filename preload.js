const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
});

contextBridge.exposeInMainWorld(
    "api", {
        invoke: (channel, data = null) => {
            let validChannels = ["on-install", "on-custom-install", "on-get-devices"];
            if(!validChannels.includes(channel)) return;
            // ipcRenderer.invoke accesses ipcMain.handle channels like 'on-custom-install'
            // make sure to include this return statement or you won't get your Promise back
            return ipcRenderer.invoke(channel, data);
        },
        on: (channel, func) => {
            let validChannels = ["on-output", "on-device-list-changed"];
            if(!validChannels.includes(channel)) return;
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
);

contextBridge.exposeInMainWorld(
    "electron", {
        openDialog: (method, config) => ipcRenderer.invoke('dialog', method, config)
    }
);