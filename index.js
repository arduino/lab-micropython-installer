import DeviceManager from './logic/DeviceManager.js';
import { usb, getDeviceList } from 'usb';
import Flasher from './logic/flasher.js';
import descriptors from './logic/descriptors.js';

const SOFT_DEVICE_FIRMWARE_FILENAME = "Nano33_updateBLandSoftDevice.bin"
const deviceManager = new DeviceManager();


for (const descriptor of descriptors) {
    deviceManager.addDeviceDescriptor(descriptor);
}

const foundDevices = await deviceManager.getDeviceList();

// function getSoftDevicePath(){
//     const scriptDir = path.dirname(__filename);
//     const firmwarePath = path.join(scriptDir, "bin", "firmware", SOFT_DEVICE_FIRMWARE_FILENAME);
//     return firmwarePath;  
// }

if(foundDevices.length === 0) {
    console.log('🤷 No compatible device detected.');
    process.exit(-1);
}

// TODO - add support for multiple devices
const selectedDevice = foundDevices[0];
console.log('👀 Device detected: ' + selectedDevice.deviceDescriptor.name);

if(selectedDevice.runsMicroPython()) {
    let version = await selectedDevice.getMicroPythonVersion();
    console.log('🐍 Device is already running MicroPython version:', version);
}

if(!selectedDevice.runsBootloader()) {
    await selectedDevice.enterBootloader();
    try {
        const targetDevice = await deviceManager.waitForDevice(selectedDevice.getBootloaderVID(), selectedDevice.getBootloaderPID());
        console.log(`👍 Device is now in bootloader mode.`);
        await targetDevice.flashMicroPythonFirmware(true);
    } catch (error) {
        console.log(error);
        console.log('🚨 Failed to flash MicroPython firmware.');
        process.exit(-1);
    }
} else {
    await selectedDevice.flashMicroPythonFirmware(true);
}

console.log('✅ MicroPython firmware flashed successfully. You may need to reset the device to run it.');