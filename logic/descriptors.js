import DeviceDescriptor from './DeviceDescriptor.js';
import Flasher from './flasher.js';

const flasher = new Flasher();

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


// NANO_RP2040_OMV_PID = "0x015e"
// NANO_RP2040_ARDUINO_PID = "0x005e"
// NANO_RP2040_MP_PID = "0x025e"
// RP2040_BL_PID = "0x0003"

// const arduinoNanoRP2040Descriptor = new DeviceDescriptor(0x2341, {"arduinoPID" : 0x005e, "bootloaderPID" : 0x0366, "upythonPID" : 0x0566 }, 'Giga R1 WiFi', 'Arduino', 'ARDUINO_GIGA', 'dfu');
// arduinoNanoRP2040Descriptor.onFlashFirmware = async (firmware, device) => {
//     await flasher.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex());
// };

// const arduinoNiclaVisionDescriptor = new DeviceDescriptor(0x2341, {"arduinoPID" : 0x0000, "bootloaderPID" : 0x0000, "upythonPID" : 0x0000 }, 'Nicla Vision', 'Arduino', 'ARDUINO_NICLA_VISION', 'dfu');
// arduinoNiclaVisionDescriptor.onFlashFirmware = async (firmware, device) => {
//     await flasher.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex());
// };

const descriptors = [arduinoGigaDescriptor];

export default descriptors;