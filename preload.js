const {
    contextBridge,
    ipcRenderer
} = require("electron");

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
})


contextBridge.exposeInMainWorld(
    "api", {
    invoke: (channel, data) => {
        let validChannels = ["on-install", "onFileDrop"]; // list of ipcMain.handle channels you want access in frontend to
        if (validChannels.includes(channel)) {
            // ipcRenderer.invoke accesses ipcMain.handle channels like 'myfunc'
            // make sure to include this return statement or you won't get your Promise back
            return ipcRenderer.invoke(channel, data);
        }
    },
}
);