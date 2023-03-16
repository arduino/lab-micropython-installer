import DeviceManager from './logic/DeviceManager.js';
import descriptors from './logic/descriptors.js';
import Device from './logic/Device.js';
import esMain from 'es-main';

async function run(){
    const deviceManager = new DeviceManager();
    
    for (const descriptor of descriptors) {
        deviceManager.addDeviceDescriptor(descriptor);
    }
    
    const foundDevices = await deviceManager.getDeviceList();
    
    if(foundDevices.length === 0) {
        console.log('🤷 No compatible device detected.');
        return -1;
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
            let targetDevice;
    
            // Some devices can't be detected in bootloader mode through their serial port.
            // In this case, we wait a few seconds and then try to flash the device.
            // An alternative could be to use the device's VID/PID with https://www.npmjs.com/package/usb
            // or to use the device's mass storage volume with https://www.npmjs.com/package/drivelist
            if(selectedDevice.deviceDescriptor.skipWaitForDevice) {
                targetDevice = new Device(selectedDevice.getBootloaderVID(),selectedDevice.getBootloaderPID(), selectedDevice.deviceDescriptor);
                await deviceManager.wait(3000);
            } else {
                targetDevice = await deviceManager.waitForDevice(selectedDevice.getBootloaderVID(), selectedDevice.getBootloaderPID());
            }
            console.log(`👍 Device is now in bootloader mode.`);
            await targetDevice.flashMicroPythonFirmware(true);
        } catch (error) {
            console.log(error);
            console.log('🚨 Failed to flash MicroPython firmware.');
            return -1;
        }
    } else {
        await selectedDevice.flashMicroPythonFirmware(true);
    }
    
    console.log('✅ MicroPython firmware flashed successfully. You may need to reset the device to run it.');
}

// Check if this file is being run directly
if (esMain(import.meta)) {
    const returnCode = await run();
    process.exit(returnCode);
}

export { run };