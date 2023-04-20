import { SerialPort } from 'serialport'
import Device from './device.js';
import Logger from './logger.js';

class DeviceManager {
    constructor() {
      this.devices = null;
      this.deviceDescriptors = [];
      this.logger = null;
    }

    addDeviceDescriptor(deviceDescriptor) {
        this.deviceDescriptors.push(deviceDescriptor);
    }

    // Function to convert a hex string ID to a number.
    convertHexToNumber(anID) {
        // The hex string can have the 0x prefix or not.
        if (anID.startsWith("0x")) {
            anID = anID.substring(2);
        }
        // The hex string can be padded with a 0 or not.
        if (anID.length === 3) {
            anID = "0" + anID;
        }
        // The hex string can be upper or lower case.
        anID = anID.toLowerCase();

        return parseInt(anID, 16);
    }

    // Function to wait for the specified number of milliseconds.
    wait(ms) {        
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitForDeviceToEnterArduinoMode(deviceInBootloaderMode, maxTries = 5, timeout = 10000, refreshInterval = 1000) {
        return new Promise(async (resolve, reject) => {
            if(!deviceInBootloaderMode.runsBootloader()) {
                reject("❌ The device is not in bootloader mode.");
                return;
            }

            // Wait for the device given times then give up.
            for(let i = 0; i < maxTries; ++i){
                try {
                    // Using the default VID/PID to detect the device in Arduino mode.
                    // If we started in MicroPython or bootloader mode the VID/PID will be different.
                    let deviceInArduinoMode = await this.waitForDevice(deviceInBootloaderMode.getDefaultVID(), deviceInBootloaderMode.getDefaultArduinoPID(), timeout, refreshInterval);
                    resolve(deviceInArduinoMode);
                    return;
                } catch (error) {
                    this.logger?.log(error);
                    try {
                        await deviceInBootloaderMode.reset();
                    } catch (error) {
                        this.logger?.log(`❌ Failed to reset the board.`, Logger.LOG_LEVEL.ERROR);
                        this.logger?.log(error, Logger.LOG_LEVEL.DEBUG);
                    }
                }

                if(i === maxTries - 1) {
                    reject("❌ Failed to flash SoftDevice.");
                    return;
                }
            }
        });
    }

    // Wait for a USB device to become available.
    waitForDevice(vendorID, productID, timeout = 10000, refreshInterval = 1000) {
        return new Promise((resolve, reject) => {
            let timeoutID, intervalID;

            const checkDevices = async () => {
                await this.refreshDeviceList();
                const foundDevice = this.devices.find((device) => device.vendorID === vendorID && device.productID === productID);

                if(foundDevice) {
                    clearTimeout(timeoutID);
                    clearInterval(intervalID);
                    resolve(foundDevice);
                }  
            };

            // Set a timeout of specified seconds.
            timeoutID = setTimeout(() => {
                clearInterval(intervalID);
                reject("❌ Timeout waiting for the device to become available.");
            }, timeout);

            intervalID = setInterval(checkDevices, refreshInterval);
            checkDevices();
        });
    }    

    async refreshDeviceList() {
        this.devices = [];
        const ports = await SerialPort.list();
  
        for (const port of ports) {
            if(port.vendorId === undefined || port.productId === undefined) continue;

            const vendorID = this.convertHexToNumber(port.vendorId);
            const productID = this.convertHexToNumber(port.productId);
            let deviceDescriptor = this.getDeviceDescriptor(vendorID, productID);

            if (deviceDescriptor) {
                this.devices.push(new Device(vendorID, productID, deviceDescriptor, port.path, port.serialNumber));
            }
        }
    }
  
    /**
     * Returns a device descriptor for the specified vendorID and productID.
     * Using this descriptor connected devices can be identified.
     * @param {Number} vendorID 
     * @param {Number} productID 
     * @returns {DeviceDescriptor} The device descriptor or null if no descriptor was found.
     */
    getDeviceDescriptor(vendorID, productID) {
        const descriptor = this.deviceDescriptors.find(
                desc => desc.getDefaultIDs().vid === vendorID && desc.getDefaultProductIDList().includes(productID)
            );
        const altDescriptor = this.deviceDescriptors.find(
                desc => desc.getAlternativeIDs()?.vid === vendorID && desc.getAlternativeProductIDList().includes(productID)
            );
        return descriptor || altDescriptor;
    }

    /**
     * Returns a list of devices. The list of devices is cached and refreshed when calling refreshDeviceList().
     * @returns The list of devices as an array. of Device objects.
     **/
    async getDeviceList() {
        if(this.devices === null){
            await this.refreshDeviceList();
        }
        return this.devices;
    }

    /**
     * Finds a device by vendorID and productID in the list of devices.
     * The list of devices is cached and refreshed when calling refreshDeviceList().
     * @param {Number} vendorID 
     * @param {Number} productID 
     * @returns 
     */
    getDevice(vendorID, productID) {
        return this.devices.find((device) => device.vendorID === vendorID && device.productID === productID);
    }
    
  }
  
export default DeviceManager;