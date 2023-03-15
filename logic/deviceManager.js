import { SerialPort } from 'serialport'
import Device from './Device.js';

class DeviceManager {
    constructor() {
      this.devices = [];
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

    // Wait for a USB device to become available.
    waitForDevice(vendorID, productID) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                console.log("⌛️ Waiting for the device to become available...")
                await this.refreshDevices();
                const foundDevice = this.devices.find((device) => device.vendorID === vendorID && device.productID === productID);

                if(foundDevice) {
                    clearInterval(interval);
                    resolve(foundDevice);
                }
            }, 1000);
        });
    }    

    async refreshDevices() {
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
  
    // The vendor ID and product ID are hex strings without the 
    // 0x prefix padded with a 0 if they are less than 4 digits long.
    getDeviceDescriptor(vendorID, productID) {
        const descriptor = this.deviceDescriptors.find(
                desc => desc.getDefaultIDs().vid === vendorID && desc.getDefaultProductIDList().includes(productID)
            );
        const altDescriptor = this.deviceDescriptors.find(
                desc => desc.getAlternativeIDs()?.vid === vendorID && desc.getAlternativeProductIDList().includes(productID)
            );
        return descriptor || altDescriptor;
    }

    async getDeviceList() {
        await this.refreshDevices();
        return this.devices;
    }
    
  }
  
export default DeviceManager;