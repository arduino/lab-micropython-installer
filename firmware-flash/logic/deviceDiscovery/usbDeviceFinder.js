import SerialDeviceFinder from './serialDeviceFinder.js';
import Device from '../device.js';
import DeviceFinder from './deviceFinder.js';
import USB from 'usb';

class USBDeviceFinder extends DeviceFinder {

    constructor() {
        super();
        // Use the serial device finder to add the serial port 
        // and serial number of the USB device.
        this.serialDeviceFinder = new SerialDeviceFinder();

        USB.usb.once('attach', async (usbDevice) => {
            if(!this.onDeviceConnected ) return;

            const device = await this.deviceFromUSBDescriptor(usbDevice.deviceDescriptor);
            if(device) this.onDeviceConnected(device);            
        });
        USB.usb.once('detach', async (usbDevice) => {
            if(!this.onDeviceDisconnected) return;
            const device = await this.deviceFromUSBDescriptor(usbDevice.deviceDescriptor);
            if(device) this.onDeviceDisconnected(device);
        });
    }

    async deviceFromUSBDescriptor(descriptor) {
        if(descriptor.idVendor === undefined || descriptor.idProduct === undefined) return null;
        const serialDevices = await this.serialDeviceFinder.getDeviceList();

        const vendorID = descriptor.idVendor;
        const productID = descriptor.idProduct;
        const serialDevice = serialDevices.find((device) => device.vendorID === vendorID && device.productID === productID);
        const serialPort = serialDevice ? serialDevice.serialPort : null;
        const serialNumber = serialDevice ? serialDevice.serialNumber : null;
        const newDevice = new Device(vendorID, productID, serialPort, serialNumber);
        return newDevice;
    }

    async getDeviceList() {
        let devices = [];
        const usbDevices = USB.getDeviceList();        

        for (const usbDevice of usbDevices) {
            const descriptor = usbDevice.deviceDescriptor;
            const newDevice = await this.deviceFromUSBDescriptor(descriptor);
            
            if(newDevice){
                devices.push(newDevice);
            }
        }
        return devices;
    }
}

export default USBDeviceFinder;