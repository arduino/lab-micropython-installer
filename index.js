import DeviceManager from './logic/DeviceManager.js';
import { usb, getDeviceList } from 'usb';
import Flasher from './logic/flasher.js';
import DeviceDescriptor from './logic/DeviceDescriptor.js';

const SOFT_DEVICE_FIRMWARE_FILENAME = "Nano33_updateBLandSoftDevice.bin"
const flasher = new Flasher();
const deviceManager = new DeviceManager();

const arduinoGigaDescriptor = new DeviceDescriptor(0x2341, {"arduinoPID" : 0x0266, "bootloaderPID" : 0x0366, "upythonPID" : 0x0566 }, 'Giga R1 WiFi', 'Arduino', 'ARDUINO_GIGA', 'dfu');
arduinoGigaDescriptor.onFlashFirmware = async (firmware, device) => {
    flasher.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex());
};

// const arduinoNiclaVisionDescriptor = new DeviceDescriptor(0x2341, 0x025f, 'Nicla Vision', 'Arduino', 'ARDUINO_NICLA_VISION', 'dfu');
// arduinoNiclaVisionDescriptor.onFlashFirmware = (firmware) => {
//     flasher.runDfuUtil(firmware, arduinoNiclaVisionDescriptor.vendorID, arduinoNiclaVisionDescriptor.productIDs);
// };
// deviceManager.addDeviceDescriptor(arduinoNiclaVisionDescriptor);

deviceManager.addDeviceDescriptor(arduinoGigaDescriptor);
const foundDevices = await deviceManager.getDeviceList();


function getSoftDevicePath(){
    const scriptDir = path.dirname(__filename);
    const firmwarePath = path.join(scriptDir, "bin", "firmware", SOFT_DEVICE_FIRMWARE_FILENAME);
    return firmwarePath;  
}

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
    const targetDevice = await deviceManager.waitForDevice(selectedDevice.vendorID, selectedDevice.deviceDescriptor.productIDs.bootloaderPID);
    console.log(`👍 Device is now in bootloader mode.`);
    await targetDevice.flashMicroPythonFirmware();
} else {
    await selectedDevice.flashMicroPythonFirmware();
}

console.log('✅ MicroPython firmware flashed successfully. You may need to reset the device to run it.');