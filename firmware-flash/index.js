import DeviceManager from './logic/deviceManager.js';
import * as descriptors from './logic/descriptors.js';
import Logger from './logic/logger.js';
import Device from './logic/device.js';
import SerialDeviceFinder from './logic/deviceDiscovery/serialDeviceFinder.js';
import PicotoolDeviceFinder from './logic/deviceDiscovery/picotoolDeviceFinder.js';
import DFUDeviceFinder from './logic/deviceDiscovery/dfuDeviceFinder.js';

/// The amount of time to wait for the device to become available in bootloader mode.
/// This is only used for devices that can't be detected in bootloader mode through their serial port.
/// An alternative could be to use the device's VID/PID with https://www.npmjs.com/package/usb
const DEVICE_AWAIT_TIMEOUT = 3000;

let logger;

async function flashFirmware(firmwarePath, selectedDevice, isMicroPython = false){
    if(!selectedDevice.logger){
        selectedDevice.logger = logger;
    }
    const serialPort = selectedDevice.getSerialPort();
    if(serialPort) {
        logger?.log(`👀 Device found: ${selectedDevice.deviceDescriptor.name} at ${serialPort}`);
    } else {
        logger?.log(`👀 Device found: ${selectedDevice.deviceDescriptor.name}`);
    }
    
    if(selectedDevice.runsBootloader()) {
        logger?.log(`👍 Device is already in bootloader mode.`);
        await selectedDevice.flashFirmware(firmwarePath, isMicroPython);
        logger?.log('✅ Firmware flashed successfully.');
        return true;
    }
    
    if(selectedDevice.runsMicroPython()) {
        let version = await selectedDevice.getMicroPythonVersion();
        logger?.log(`🐍 Device is running MicroPython version: ${version}`);
    }

    try {
        await selectedDevice.enterBootloader();
        let deviceInBootloaderMode;

        // Some devices can't be detected in bootloader mode through their serial port.
        // In this case, we wait a few seconds and then try to flash the device.
        // An alternative could be to use the device's VID/PID with https://www.npmjs.com/package/usb
        // or to use the device's mass storage volume with https://www.npmjs.com/package/drivelist
        if(selectedDevice.deviceDescriptor.skipWaitForDevice) {
            deviceInBootloaderMode = deviceManager.createDevice(selectedDevice.getBootloaderVID(), selectedDevice.getBootloaderPID(), selectedDevice.deviceDescriptor);
            logger?.log(`⌛️ Waiting ${DEVICE_AWAIT_TIMEOUT}ms for the device to become available...`);
            await deviceManager.wait(DEVICE_AWAIT_TIMEOUT);
        } else {
            logger?.log("⌛️ Waiting for bootloader to become available...");
            deviceInBootloaderMode = await deviceManager.waitForDevice(selectedDevice.getBootloaderVID(), selectedDevice.getBootloaderPID());
        }
        deviceInBootloaderMode.logger = logger;
        logger?.log(`👍 Device is now in bootloader mode.`);

        await deviceInBootloaderMode.flashFirmware(firmwarePath, isMicroPython);
        logger?.log('✅ Firmware flashed successfully.');
        return true;
    } catch (error) {
        logger?.log(error);
        logger?.log('❌ Put the device in bootloader mode manually and try again.');
        return false;
    }        
}

async function flashMicroPythonFirmware(selectedDevice, useNightlyBuild = false){
    if(!selectedDevice.logger){
        selectedDevice.logger = logger;
    }
    const firmwareFile = await selectedDevice.downloadMicroPythonFirmware(useNightlyBuild);
    if(!firmwareFile) {
        return false;
    }
    return await flashFirmware(firmwareFile, selectedDevice, true);
}

async function getDeviceList(){
    return await deviceManager.getDeviceList();
}

async function getFirstFoundDevice(){
    const foundDevices = await deviceManager.getDeviceList();
    
    if(foundDevices.length === 0) {
        logger?.log('🤷 No compatible device detected.');
        return null;
    }

    return foundDevices[0];
}

function setLogger(alogger){
    logger = alogger;
    deviceManager.logger = logger;
}

const deviceManager = new DeviceManager();
    
for (const descriptor of Object.values(descriptors)) {
    deviceManager.addDeviceDescriptor(descriptor);
}
deviceManager.addDeviceFinder(new SerialDeviceFinder());
deviceManager.addDeviceFinder(new PicotoolDeviceFinder());
deviceManager.addDeviceFinder(new DFUDeviceFinder());

export { Device, Logger, flashFirmware, flashMicroPythonFirmware, getDeviceList, getFirstFoundDevice, setLogger, deviceManager };