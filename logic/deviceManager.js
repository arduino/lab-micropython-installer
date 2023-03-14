import { SerialPort } from 'serialport'
import DeviceDescriptor from './DeviceDescriptor.js';
import Device from './Device.js';

class DeviceManager {
    constructor() {
      this.devices = [];
      this.deviceDescriptors = [];
    }

    addDeviceDescriptor(deviceDescriptor) {
        this.deviceDescriptors.push(deviceDescriptor);
    }

    waitForDevice(deviceDescriptor) {
        console.log("⌛️ Waiting for the device to become available...")
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                await this.refreshDevices();
                const foundDevice = this.devices.find(device => device.deviceDescriptor === deviceDescriptor);
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
            let deviceDescriptor = this.getDeviceDescriptor(port.vendorId, port.productId);
            if (deviceDescriptor) {
                this.devices.push(new Device(deviceDescriptor, port.path, port.serialNumber));
            }
        }
    }
  
    getDeviceDescriptor(vendorID, productID) {
        if(!vendorID || !productID) {
            return null;
        }
        return this.deviceDescriptors.find(dev => dev.getVendorIDString() === vendorID && dev.getProductIDString() === productID);
    }

    getDeviceList() {
        return this.devices;
    }
    
  }
  
export default DeviceManager;