import DeviceDescriptor from './DeviceDescriptor.js';
import Flasher from './flasher.js';
import path from 'path';
import { fileURLToPath } from 'url';

const flasher = new Flasher();

// Get from https://www.nordicsemi.com/Products/Development-software/nRF5-SDK/Download
const softDeviceFirmwareFilename = "s140_nrf52_7.2.0_softdevice.bin";
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
// const arduinoNano33BLESoftDeviceOffset = "0xA0000";
// const arduinoNano33BLEMinimumBootloaderVersion = 3;

const arduinoNano33BLEDescriptor = new DeviceDescriptor(arduinoNano33BLEIdentifiers, 'Nano 33 BLE', 'Arduino', 'arduino_nano_33_ble_sense', 'bin');
arduinoNano33BLEDescriptor.onPreFlashFirmware = async (device) => {
    /* For now we require the user to flash the softdevice manually.
    const bootloaderVersion = await flasher.getBootloaderVersionWithBossac(device.serialPort);
    const majorVersion = parseInt(bootloaderVersion.split(".")[0]);
    // console.log("👢 Bootloader version: " + bootloaderVersion);
    
    if(majorVersion < arduinoNano33BLEMinimumBootloaderVersion){
        throw new Error("Bootloader version is too old. Please update it to version 3.0 or higher.");
    }

    // Don't reset the device after flashing the softdevice so that we can flash the upython firmware directly afterwards.
    await flasher.runBossac(getSoftDevicePath(), device.serialPort, arduinoNano33BLESoftDeviceOffset, false);
    */
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