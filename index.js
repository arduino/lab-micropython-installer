import DeviceManager from './logic/DeviceManager.js';
import { usb, getDeviceList } from 'usb';
import * as readline from 'readline';
import Flasher from './logic/flasher.js';
import DeviceDescriptor from './logic/DeviceDescriptor.js';

const SOFT_DEVICE_FIRMWARE_FILENAME = "Nano33_updateBLandSoftDevice.bin"
const flasher = new Flasher();
const deviceManager = new DeviceManager();

const arduinoGigaDescriptor = new DeviceDescriptor(0x2341, {"arduinoPID" : 0x0266, "bootloaderPID" : 0x0366}, 'Giga R1 WiFi', 'Arduino', 'ARDUINO_GIGA', 'dfu');
arduinoGigaDescriptor.onFlashFirmware = (firmware) => {
    flasher.runDfuUtil(firmware, arduinoGigaDescriptor.vendorID, arduinoGigaDescriptor.productID);
};

const arduinoNiclaVisionDescriptor = new DeviceDescriptor(0x2341, 0x025f, 'Nicla Vision', 'Arduino', 'ARDUINO_NICLA_VISION', 'dfu');
arduinoNiclaVisionDescriptor.onFlashFirmware = (firmware) => {
    flasher.runDfuUtil(firmware, arduinoNiclaVisionDescriptor.vendorID, arduinoNiclaVisionDescriptor.productID);
};

deviceManager.addDeviceDescriptor(arduinoGigaDescriptor);
deviceManager.addDeviceDescriptor(arduinoNiclaVisionDescriptor);

await deviceManager.refreshDevices();
const foundDevices = deviceManager.getDeviceList();

function getSoftDevicePath(){
    const scriptDir = path.dirname(__filename);
    const firmwarePath = path.join(scriptDir, "bin", "firmware", SOFT_DEVICE_FIRMWARE_FILENAME);
    return firmwarePath;  
}

// TODO: implement a device selection dialog
async function selectDevice(devices) {
    // create an array of device names to display to the user
    const deviceNames = devices.map(device => device.name);
    console.log(deviceNames);
    return null;
}

if(foundDevices.length === 0) {
    console.log('🤷 No compatible device detected.');
    process.exit(-1);
}

const selectedDevice = foundDevices[0]; // await selectDevice(foundDevices);
console.log(selectedDevice);
await selectedDevice.flashMicroPythonFirmware();