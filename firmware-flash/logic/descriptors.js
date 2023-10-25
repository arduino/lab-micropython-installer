import DeviceDescriptor from './deviceDescriptor.js';
import CommandRunner from './commandRunner.js';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from './logger.js';

/// The amount of time to wait for the softdevice to be relocated to the final location in the flash.
const SOFTDEVICE_RELOCATE_DURATION = 7000;

/// The magic number sent by the device to indicate that the softdevice has been flashed.
const SOFT_DEVICE_MAGIC_NUMBER = 1;

const commandRunner = new CommandRunner();
const logger = Logger.defaultLogger;

const softDeviceFirmwareFilename = "SoftDeviceUpdater.bin";
const nanoESP32RecoveryFirmwareFilename = "nora_recovery.ino.bin";
const __filename = fileURLToPath(import.meta.url);

function getSoftDeviceFirmwarePath(){
    const scriptDir = path.dirname(__filename);
    const firmwarePath = path.join(scriptDir, ".." , "bin", "firmware", softDeviceFirmwareFilename);
    return firmwarePath;  
}

function getNanoESP32RecoveryFirmwarePath(){
    const scriptDir = path.dirname(__filename);
    const firmwarePath = path.join(scriptDir, ".." , "bin", "firmware", nanoESP32RecoveryFirmwareFilename);
    return firmwarePath;
}

const arduinoPortentaH7Identifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : {"arduino" : 0x025b, "bootloader" : 0x035b, "upython" : 0x055b, "omv" : 0x045b}
    },
};

const arduinoPortentaH7Descriptor = new DeviceDescriptor(arduinoPortentaH7Identifiers, 'Portenta H7', 'Arduino', 'ARDUINO_PORTENTA_H7', 'dfu');
arduinoPortentaH7Descriptor.onFlashFirmware = async (firmware, device, isMicroPython) => {
    // Check if firmware is a DFU file
    if(firmware.endsWith(".dfu")){
        await commandRunner.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex(), true);
        return;
    }
    // Check if firmware is a binary file
    if(firmware.endsWith(".bin")){
        await commandRunner.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex(), true, true, "0x08040000");
        return;
    }

    throw new Error("❌ Invalid firmware file");
};

const arduinoPortentaC33Identifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : {"arduino" : 0x0068, "bootloader" : 0x0368, "upython" : 0x0468 }
    },
};
const arduinoPortentaC33Descriptor = new DeviceDescriptor(arduinoPortentaC33Identifiers, 'Portenta C33', 'Arduino', 'ARDUINO_PORTENTA_C33', 'bin');
arduinoPortentaC33Descriptor.onFlashFirmware = async (firmware, device, isMicroPython) => {
    // Check if firmware is a binary file
    if(firmware.endsWith(".bin")){
        await commandRunner.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex(), false);
        return;
    }
    
    throw new Error("❌ Invalid firmware file");
};

const arduinoGigaIdentifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : {"arduino" : 0x0266, "bootloader" : 0x0366, "upython" : 0x0566 }
    },
};

const arduinoGigaDescriptor = new DeviceDescriptor(arduinoGigaIdentifiers, 'Giga R1 WiFi', 'Arduino', 'ARDUINO_GIGA', 'dfu');
arduinoGigaDescriptor.onFlashFirmware = arduinoPortentaH7Descriptor.onFlashFirmware;

const arduinoNanoRP2040Identifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : { "arduino" : 0x005e, "upython" : 0x025e, "omv" : 0x015e }
    },
    "alternative" : {
        "vid" : 0x2e8a,
        "pids" : { 
            "bootloader" : 0x0003, 
            /* Older version of MicroPython didn't use the Arduino VID and used this deprecated PID */
            "upython": 0x0005 
        }
    }
};
const arduinoNanoRP2040Descriptor = new DeviceDescriptor(arduinoNanoRP2040Identifiers, 'Nano RP2040 Connect', 'Arduino', 'ARDUINO_NANO_RP2040_CONNECT', 'uf2');
arduinoNanoRP2040Descriptor.onFlashFirmware = async (firmware, device, isMicroPython) => {
    await commandRunner.runPicotool(firmware, device.getVendorIDHex(), device.getProductIDHex());
};

const arduinoNiclaVisionIdentifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : { "arduino" : 0x025f, "bootloader" : 0x035f, "upython" : 0x055f, "omv" : 0x045f }
    }
};
const arduinoNiclaVisionDescriptor = new DeviceDescriptor(arduinoNiclaVisionIdentifiers, 'Nicla Vision', 'Arduino', 'ARDUINO_NICLA_VISION', 'dfu');
arduinoNiclaVisionDescriptor.onFlashFirmware = async (firmware, device, isMicroPython) => {
    await commandRunner.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex(), true);
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
/*
The default offset of bossac is always 0x10000 (a mistake from the initial implementation that we can't change without breaking a good half of the boards), 
so the softdevice-based image should be flashed with --offset=0x16000 (since it ends up at 0x26000).
*/
const arduinoNano33BLEUPythonOffset = "0x16000";

const arduinoNano33BLEDescriptor = new DeviceDescriptor(arduinoNano33BLEIdentifiers, 'Nano 33 BLE', 'Arduino', 'arduino_nano_33_ble_sense', 'bin');
arduinoNano33BLEDescriptor.onReset = async (device) => {
    await commandRunner.resetBoardWithBossac(device.getSerialPort());
};

arduinoNano33BLEDescriptor.onFlashFirmware = async (firmware, device, isMicroPython) => {
    if(isMicroPython){
        /*
        // Doesn't work because the bootloader version wasn't updated in the bootloader.
        const arduinoNano33BLEMinimumBootloaderVersion = 3;
        const bootloaderVersion = await commandRunner.getBootloaderVersionWithBossac(device.serialPort);
        const majorVersion = parseInt(bootloaderVersion.split(".")[0]);
        console.log("👢 Bootloader version: " + bootloaderVersion);
        
        if(majorVersion < arduinoNano33BLEMinimumBootloaderVersion){
            throw new Error("Bootloader version is too old. Please update it to version 3.0 or higher.");
        }
        */
        const deviceManager = device.getDeviceManager();
    
        logger.log("🔥 Flashing SoftDevice updater...");
        await commandRunner.runBossac(getSoftDeviceFirmwarePath(), device.getSerialPort());
        logger.log("🏃 Waiting for device to run sketch...");
        let deviceInArduinoMode = await deviceManager.waitForDeviceToEnterArduinoMode(device, 10);
    
        logger.log("🪄 Sending magic number to device...");
        // Write one byte (1) to the serial port to tell the device to flash the bootloader / softdevice.
        await deviceInArduinoMode.writeToSerialPort(new Uint8Array([1])); // Tells the device to flash the bootloader / softdevice.
        logger.log("⌛️ Waiting for device to flash SoftDevice...");
        const data = await deviceInArduinoMode.readBytesFromSerialPort(); // Wait for the device to finish flashing the bootloader / softdevice.
        const magicNumber = data.readUint8();
        if(magicNumber != SOFT_DEVICE_MAGIC_NUMBER) throw new Error("❌ Failed to flash SoftDevice.");
        
        // Device enters bootloader automatically after flashing the SoftDevice.
        // Give the bootloader some time to relocate the SoftDevice.
        logger.log("⌛️ Waiting for the device to relocate the SoftDevice...");
        await deviceManager.wait(SOFTDEVICE_RELOCATE_DURATION);
        const deviceInBootloaderMode = await deviceManager.waitForDevice(deviceInArduinoMode.getBootloaderVID(), deviceInArduinoMode.getBootloaderPID());
        if(!deviceInBootloaderMode){
            throw new Error("❌ Failed to flash SoftDevice.");
        }

        logger.log(`🔥 Installing MicroPython...`);
        await commandRunner.runBossac(firmware, deviceInBootloaderMode.getSerialPort(), arduinoNano33BLEUPythonOffset);
    } else {
        await commandRunner.runBossac(firmware, device.getSerialPort());
    }
        
};

const arduinoNanoESP32Identifiers = {
    "default" : {
        "vid" : 0x2341,
        "pids" : { "arduino" : 0x0070, "upython" : 0x056b, "bootloader" : 0x0070 }
    },
    
    // This VID/PID combination was used in older builds of MicroPython until we submitted a PR to change it.
    "alternative" : {
        "vid" : 0x303a,
        "pids" : { "upython" : 0x4001 }
    }
};

const arduinoNanoESP32Descriptor = new DeviceDescriptor(arduinoNanoESP32Identifiers, 'Nano ESP32', 'Arduino', 'ARDUINO_NANO_ESP32', 'app-bin');
arduinoNanoESP32Descriptor.onFlashFirmware = async (firmware, device, isMicroPython) => {
    if(path.extname(firmware) == ".bin"){
        throw new Error("❌ Installing a raw binary from DFU bootloader is not supported. Please use the native bootloader instead or flash an application image.");
    }
    await commandRunner.runDfuUtil(firmware, device.getVendorIDHex(), device.getProductIDHex(), false);
};

const arduinoNanoESP32NativeIdentifiers = {
    "default" : {
        "vid" : 0x303a,
        "pids" : { "bootloader" : 0x1001 }
    },
}
const arduinoNanoESP32NativeDescriptor = new DeviceDescriptor(arduinoNanoESP32NativeIdentifiers, 'Nano ESP32', 'Arduino', 'ARDUINO_NANO_ESP32', 'bin');
arduinoNanoESP32NativeDescriptor.onFlashFirmware = async (firmware, device, isMicroPython) => {
    if(path.extname(firmware) == ".app-bin"){
        throw new Error("❌ Installing an application image from native bootloader is not supported. Please use the DFU bootloader instead or flash a full firmware image.");
    }
    const config = {"chip": "esp32s3", "flashSize" : "16MB", "flashMode" : "dio", "flashFreq" : "80m"};
    const recoveryCommand = {"address" : "0xf70000", "path" : getNanoESP32RecoveryFirmwarePath()};
    const firmwareCommand = {"address" : "0x0", "path" : firmware};
    await commandRunner.runEsptool([firmwareCommand, recoveryCommand], device.getSerialPort(), config);
};

export {
    arduinoPortentaC33Descriptor,
    arduinoGigaDescriptor, 
    arduinoPortentaH7Descriptor, 
    arduinoNanoRP2040Descriptor,
    arduinoNiclaVisionDescriptor,
    arduinoNano33BLEDescriptor,
    arduinoNanoESP32Descriptor,
    arduinoNanoESP32NativeDescriptor
};