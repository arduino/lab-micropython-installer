import DeviceDescriptor from './DeviceDescriptor.js';
import Flasher from './flasher.js';

const flasher = new Flasher();

// const SOFT_DEVICE_FIRMWARE_FILENAME = "Nano33_updateBLandSoftDevice.bin"

// function getSoftDevicePath(){
//     const scriptDir = path.dirname(__filename);
//     const firmwarePath = path.join(scriptDir, "bin", "firmware", SOFT_DEVICE_FIRMWARE_FILENAME);
//     return firmwarePath;  
// }

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

// const arduinoNiclaVisionDescriptor = new DeviceDescriptor(0x2341, {"arduinoPID" : 0x0000, "bootloaderPID" : 0x0000, "upythonPID" : 0x0000 }, 'Nicla Vision', 'Arduino', 'ARDUINO_NICLA_VISION', 'dfu');
// arduinoNiclaVisionDescriptor.onFlashFirmware = async (firmware, device) => {
//     await flasher.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex());
// };

const descriptors = [
    arduinoGigaDescriptor, 
    arduinoPortentaH7Descriptor, 
    arduinoNanoRP2040Descriptor
];

export default descriptors;