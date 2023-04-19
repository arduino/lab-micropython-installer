import DeviceManager from './logic/DeviceManager.js';
import descriptors from './logic/descriptors.js';
import Device from './logic/Device.js';
import Logger from './logic/Logger.js';
import Flasher from './logic/flasher.js';

/// The amount of time to wait for the device to become available in bootloader mode.
/// This is only used for devices that can't be detected in bootloader mode through their serial port.
/// An alternative could be to use the device's VID/PID with https://www.npmjs.com/package/usb
const DEVICE_AWAIT_TIMEOUT = 3000;

/// The amount of time to wait for the softdevice to be relocated to the final location in the flash.
const SOFTDEVICE_RELOCATE_DURATION = 7000;

async function flashFirmware(firmwarePath, selectedDevice, isMicroPython = false){
    if(!selectedDevice.logger){
        selectedDevice.logger = logger;
    }
    logger.log(`👀 Device found: ${selectedDevice.deviceDescriptor.name} at ${selectedDevice.getSerialPort()}`);
    
    if(selectedDevice.runsMicroPython()) {
        let version = await selectedDevice.getMicroPythonVersion();
        logger.log(`🐍 Device is running MicroPython version: ${version}`);
    }
    
    if(!selectedDevice.runsBootloader()) {
        await selectedDevice.enterBootloader();
        try {
            let targetDevice;
    
            // Some devices can't be detected in bootloader mode through their serial port.
            // In this case, we wait a few seconds and then try to flash the device.
            // An alternative could be to use the device's VID/PID with https://www.npmjs.com/package/usb
            // or to use the device's mass storage volume with https://www.npmjs.com/package/drivelist
            if(selectedDevice.deviceDescriptor.skipWaitForDevice) {
                targetDevice = new Device(selectedDevice.getBootloaderVID(),selectedDevice.getBootloaderPID(), selectedDevice.deviceDescriptor);
                logger.log(`⌛️ Waiting ${DEVICE_AWAIT_TIMEOUT}ms for the device to become available...`);
                await deviceManager.wait(DEVICE_AWAIT_TIMEOUT);
            } else {
                logger.log("⌛️ Waiting for bootloader to become available...");
                targetDevice = await deviceManager.waitForDevice(selectedDevice.getBootloaderVID(), selectedDevice.getBootloaderPID());
            }
            targetDevice.logger = logger;
            logger.log(`👍 Device is now in bootloader mode.`);
            const flasher = new Flasher();
            logger.log("🔥 Flashing SoftDevice updater...");
            await flasher.runBossac('/Users/sebastianhunkeler/Repositories/sebromero/upython-flasher/firmware-flash/bin/firmware/SoftDeviceUpdater.bin', targetDevice.getSerialPort());
            logger.log("🏃 Waiting for device to run sketch...");
            
            //TODO: Get Arduino PID for the case that we started in bootloader
            // Try to wait for the device 10 times then give up.
            const maxTries = 10;
            for(let i = 0; i < maxTries; i++){
                try {
                    await deviceManager.waitForDevice(selectedDevice.vendorID, selectedDevice.productID, 1000);
                    break; // Exit the loop if the device is found.
                } catch (error) {
                    logger.log(error);
                    try {
                        logger.log("🔄 Resetting the board...");
                        await flasher.resetBoardWithBossac(targetDevice.getSerialPort());
                    } catch (error) {
                        logger.log(`❌ Failed to reset the board.`);
                        console.log(error);
                    }
                }
                if(i === maxTries - 1) throw new Error("❌ Failed to flash SoftDevice.");
            }

            logger.log("🪄 Sending magic number to device...");
            // Write one byte (1) to the serial port to tell the device to flash the bootloader / softdevice.
            await selectedDevice.writeToSerialPort(new Uint8Array([1])); // Tells the device to flash the bootloader / softdevice.
            const data = await selectedDevice.readBytesFromSerialPort(1); // Wait for the device to finish flashing the bootloader / softdevice.
            const magicNumber = data.readUint8();
            if(magicNumber != 1) throw new Error("❌ Failed to flash SoftDevice.");
            // Device enters bootloader automatically after flashing the SoftDevice.
            // Give the bootloader some time to relocate the SoftDevice.
            logger.log("⌛️ Waiting for the device to relocate the SoftDevice...");
            await deviceManager.wait(SOFTDEVICE_RELOCATE_DURATION);
            targetDevice = await deviceManager.waitForDevice(selectedDevice.getBootloaderVID(), selectedDevice.getBootloaderPID());
            if(!targetDevice){
                throw new Error("❌ Failed to flash SoftDevice.");
            }
            targetDevice.logger = logger;
            await targetDevice.flashFirmware(firmwarePath, isMicroPython);
            logger.log('✅ Firmware flashed successfully.');
        } catch (error) {
            logger.log(error);
            logger.log('❌ Put the device in bootloader mode manually and try again.');
            return false;
        }
    } else {
        //TODO pre flash also here
        await selectedDevice.flashFirmware(firmwarePath, isMicroPython);
        logger.log('✅ Firmware flashed successfully.');
    }    
    return true;
}

async function flashMicroPythonFirmware(selectedDevice, useNightlyBuild = false){
    if(!selectedDevice.logger){
        selectedDevice.logger = logger;
    }
    const firmwareFile = await selectedDevice.downloadMicroPythonFirmware(useNightlyBuild);
    return await flashFirmware(firmwareFile, selectedDevice, true);
}

async function getDeviceList(){
    return await deviceManager.getDeviceList();
}

async function getFirstFoundDevice(){
    const foundDevices = await deviceManager.getDeviceList();
    
    if(foundDevices.length === 0) {
        logger.log('🤷 No compatible device detected.');
        return null;
    }

    return foundDevices[0];
}

const logger = new Logger();
const deviceManager = new DeviceManager();
    
for (const descriptor of descriptors) {
    deviceManager.addDeviceDescriptor(descriptor);
}

export { Device, flashFirmware, flashMicroPythonFirmware, getDeviceList, getFirstFoundDevice, logger, deviceManager };