import Device from './device.js';
import Logger from './logger.js';

class DeviceManager {
    constructor() {
      this.devices = null;
      this.deviceDescriptors = [];
      this.deviceFinders = [];
    }

    get logger() {
        if(this._logger === undefined) {
            return Logger.defaultLogger;
        }
        return this._logger;
    }

    set logger(logger) {
        this._logger = logger;
    }

    addDeviceFinder(deviceFinder) {
        this.deviceFinders.push(deviceFinder);
    }

    addDeviceDescriptor(deviceDescriptor) {
        this.deviceDescriptors.push(deviceDescriptor);
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
                    const defaultVID = deviceInBootloaderMode.getDefaultVID();
                    const defaultArduinoPID = deviceInBootloaderMode.getDefaultArduinoPID();
                    this.logger?.log(`⌛️ Waiting for the device with VID ${defaultVID} and PID ${defaultArduinoPID} to become available...`, Logger.LOG_LEVEL.DEBUG);
                    let deviceInArduinoMode = await this.waitForDevice(defaultVID, defaultArduinoPID, timeout, refreshInterval);
                    this.logger?.log(`👍 Device is now in Arduino mode.`);
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
                    reject("❌ Failed to enter Arduino mode.");
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

    /**
     * Refreshes the list of connected devices. It uses the device finders to find the devices.
     * The device descriptors are used to filter the devices and only list the ones that are supported.
     * The registered device finders are used in the order they were added.
     * If a device gets added to the list by a device finder, it will not be added again by another device finder.
     * Consequently, the order of the device finders is important.
     */
    async refreshDeviceList() {
        this.devices = [];
        
        if(this.deviceDescriptors.length === 0) {
            throw new Error("❌ No device descriptors have been added.");
        }

        for (const deviceFinder of this.deviceFinders) {
            const foundDevices = await deviceFinder.getDeviceList();
            for (let foundDevice of foundDevices) {
                let deviceDescriptor = this.getDeviceDescriptor(foundDevice.getVendorID(), foundDevice.getProductID());

                if (deviceDescriptor) {
                    foundDevice.setDeviceDescriptor(deviceDescriptor);
                    foundDevice.deviceManager = this;
                    if (!this.devices.find(device => 
                                            device.getVendorID() === foundDevice.getVendorID() && 
                                            device.getProductID() === foundDevice.getProductID())) {
                        this.devices.push(foundDevice);
                    } else {
                        this.logger?.log(`ℹ️ ${deviceFinder.constructor.name}: Device with VID ${foundDevice.getVendorID()} and PID ${foundDevice.getProductID()} already exists in list. Skipping.`, Logger.LOG_LEVEL.DEBUG);
                    }
                }
            }
        }

        return this.devices;
    }

    /**
     * Factory method to create a new device.
     * This ensures that the device is created with the correct device manager.
     * @param {*} vendorID 
     * @param {*} productID 
     * @param {*} deviceDescriptor 
     * @param {*} port 
     * @param {*} serialNumber 
     * @returns 
     */
    createDevice(vendorID, productID, deviceDescriptor, port = null, serialNumber = null) {
        const newDevice = new Device(vendorID, productID, port, serialNumber);
        newDevice.setDeviceDescriptor(deviceDescriptor);
        newDevice.deviceManager = this;
        return newDevice;
    };
  
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