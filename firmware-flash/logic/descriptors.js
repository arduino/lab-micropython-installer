import DeviceDescriptor from './DeviceDescriptor.js';
import Flasher from './flasher.js';
import path from 'path';
import { fileURLToPath } from 'url';

const flasher = new Flasher();

const softDeviceFirmwareFilename = "Nano33_updateBLandSoftDevice.bin";
const __filename = fileURLToPath(import.meta.url);

function getSoftDevicePath(){
    const scriptDir = path.dirname(__filename);
    const firmwarePath = path.join(scriptDir, ".." , "bin", "firmware", softDeviceFirmwareFilename);
    return firmwarePath;  
}

const arduinoGigaIdentifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : {"arduino" : 0x0266, "bootloader" : 0x0366, "upython" : 0x0566 }
    },
};
const arduinoGigaDescriptor = new DeviceDescriptor(arduinoGigaIdentifiers, 'Giga R1 WiFi', 'Arduino', 'ARDUINO_GIGA', 'dfu');
arduinoGigaDescriptor.onFlashFirmware = async (firmware, device) => {
    await flasher.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex());
};

const arduinoPortentaH7Identifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : {"arduino" : 0x025b, "bootloader" : 0x035b, "upython" : 0x055b, "omv" : 0x045b}
    },
};
const arduinoPortentaH7Descriptor = new DeviceDescriptor(arduinoPortentaH7Identifiers, 'Portenta H7', 'Arduino', 'ARDUINO_PORTENTA_H7', 'dfu');
arduinoPortentaH7Descriptor.onFlashFirmware = async (firmware, device) => {
    await flasher.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex());
};


const arduinoNanoRP2040Identifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : { "arduino" : 0x005e, "upython" : 0x025e, "omv" : 0x015e }
    },
    "alternative" : {
        "vid" : 0x2e8a,
        "pids" : { "bootloader" : 0x0003 }
    }
};
const arduinoNanoRP2040Descriptor = new DeviceDescriptor(arduinoNanoRP2040Identifiers, 'Nano RP2040 Connect', 'Arduino', 'ARDUINO_NANO_RP2040_CONNECT', 'uf2');
arduinoNanoRP2040Descriptor.onFlashFirmware = async (firmware, device) => {
    await flasher.runPicotool(firmware, device.getVendorIDHex(), device.getProductIDHex());
};
arduinoNanoRP2040Descriptor.skipWaitForDevice = true;

const arduinoNiclaVisionIdentifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : { "arduino" : 0x025f, "bootloader" : 0x035f, "upython" : 0x055f, "omv" : 0x045f }
    }
};
const arduinoNiclaVisionDescriptor = new DeviceDescriptor(arduinoNiclaVisionIdentifiers, 'Nicla Vision', 'Arduino', 'ARDUINO_NICLA_VISION', 'dfu');
arduinoNiclaVisionDescriptor.onFlashFirmware = async (firmware, device) => {
    await flasher.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex());
};

const arduinoNano33BLEIdentifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : { "arduino" : 0x805a, "bootloader" : 0x005a, "omv" : 0x015a }
    },
    "alternative" : {
        "vid" : 0xf055,
        "pids" : { "upython" : 0x9802 }
    }
};
const arduinoNano33BLEUPythonOffset = "0x16000"
const arduinoNano33BLEDescriptor = new DeviceDescriptor(arduinoNano33BLEIdentifiers, 'Nano 33 BLE', 'Arduino', 'arduino_nano_33_ble_sense', 'bin');
arduinoNano33BLEDescriptor.onPreFlashFirmware = async (device) => {
    await flasher.runBossac(getSoftDevicePath(), device.serialPort);
    console.log("Press reset button on the board...");
    // Wait 10 seconds for the soft device to be flashed
    await new Promise(resolve => setTimeout(resolve, 20000)); // 10 should be enough
    await device.enterBootloader();
    //await deviceManager.waitForDevice(); // Fixme: this is not working. Reference to deviceManager is not available here
};
arduinoNano33BLEDescriptor.onFlashFirmware = async (firmware, device) => {
    await flasher.runBossac(firmware,device.serialPort, arduinoNano33BLEUPythonOffset);
};

const descriptors = [
    arduinoGigaDescriptor, 
    arduinoPortentaH7Descriptor, 
    arduinoNanoRP2040Descriptor,
    arduinoNiclaVisionDescriptor,
    arduinoNano33BLEDescriptor
];

export default descriptors;