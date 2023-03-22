import DeviceManager from './logic/DeviceManager.js';
import descriptors from './logic/descriptors.js';
import Device from './logic/Device.js';
import Logger from './logic/Logger.js';

async function flashFirmware(firmwarePath, selectedDevice){
    // TODO
    console.log('TODO: flashFirmware ' + firmwarePath);
    console.log("SelectedDevice ", selectedDevice);
    logger.log('✅ Firmware flashed successfully!');
    return true;
}

async function getDeviceList(){
    return await deviceManager.getDeviceList();
}

async function getFirstFoundDevice(){
    const foundDevices = await this.getDeviceList();
    
    if(foundDevices.length === 0) {
        logger.log('🤷 No compatible device detected.');
        return null;
    }

    return foundDevices[0];
}

async function flashMicroPythonFirmware(selectedDevice){    
    selectedDevice.logger = logger;
    logger.log('👀 Device detected: ' + selectedDevice.deviceDescriptor.name);
    
    if(selectedDevice.runsMicroPython()) {
        let version = await selectedDevice.getMicroPythonVersion();
        logger.log('🐍 Device is running MicroPython version:', version);
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
                logger.log(`⌛️ Waiting ${ms}ms for the device to become available...`);
                await deviceManager.wait(3000);
            } else {
                logger.log("⌛️ Waiting for the device to become available...");
                targetDevice = await deviceManager.waitForDevice(selectedDevice.getBootloaderVID(), selectedDevice.getBootloaderPID());
            }
            targetDevice.logger = logger;
            logger.log(`👍 Device is now in bootloader mode.`);
            await targetDevice.flashMicroPythonFirmware(true);
        } catch (error) {
            logger.log(error);
            return false;
        }
    } else {
        await selectedDevice.flashMicroPythonFirmware(true);
    }    
    return true;
}

const logger = new Logger();
const deviceManager = new DeviceManager();
    
for (const descriptor of descriptors) {
    deviceManager.addDeviceDescriptor(descriptor);
}

export { flashFirmware, flashMicroPythonFirmware, getDeviceList, getFirstFoundDevice, logger };