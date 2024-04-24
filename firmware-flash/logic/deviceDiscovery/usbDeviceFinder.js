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
        
        this.webusb = new USB.WebUSB({
            allowAllDevices: true
        });

        this.webusb.addEventListener('connect', async (usbDevice) => {
                if(!this.onDeviceConnected ) return;
                // For now it's enough to just inform that a device is connected
                // since the device manager will ask for a refreshed device list.
                // const device = await this.deviceFromUSBDescriptor(usbDevice.deviceDescriptor);
                this.onDeviceConnected();            
        });
        this.webusb.addEventListener('disconnect', async (usbDevice) => {
                if(!this.onDeviceDisconnected) return;
                // For now it's enough to just inform that a device is disconnected
                // since the device manager will ask for a refreshed device list.
                // const device = await this.deviceFromUSBDescriptor(usbDevice.deviceDescriptor);
                this.onDeviceDisconnected();
        });
    }

    async deviceFromDeviceInfo(deviceInfo) {
        if(deviceInfo.vendorId === undefined || deviceInfo.productId === undefined) return null;
        const serialDevices = await this.serialDeviceFinder.getDeviceList();

        const serialNumber = deviceInfo.serialNumber;
        const serialDevice = serialDevices.find((device) => device.vendorID === deviceInfo.vendorId && device.productID === deviceInfo.productId);
        const serialPort = serialDevice ? serialDevice.serialPort : null;
        const newDevice = new Device(deviceInfo.vendorId, deviceInfo.productId, serialPort, serialNumber);
        return newDevice;
    }

    async getDeviceList() {
        let devices = [];
        const usbDevices = await this.webusb.getDevices();

        for (const usbDevice of usbDevices) {
            const newDevice = await this.deviceFromDeviceInfo(usbDevice);
            
            if(newDevice){
                devices.push(newDevice);
            }
        }
        return devices;
    }
}

export default USBDeviceFinder;