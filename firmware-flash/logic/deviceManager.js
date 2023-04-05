import { SerialPort } from 'serialport'
import Device from './Device.js';

class DeviceManager {
    constructor() {
      this.devices = null;
      this.deviceDescriptors = [];
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

    // Wait for a USB device to become available.
    waitForDevice(vendorID, productID) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {                
                await this.refreshDeviceList();
                const foundDevice = this.devices.find((device) => device.vendorID === vendorID && device.productID === productID);

                if(foundDevice) {
                    clearInterval(interval);
                    resolve(foundDevice);
                }                
            }, 1000);

            // Set a timeout of 10 seconds.
            setTimeout(() => {
                clearInterval(interval);
                reject("❌ Timeout waiting for the device to become available.");
            }, 10000);
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