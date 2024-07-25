import { SerialPort } from 'serialport'
import Device from '../device.js';
import DeviceFinder from './deviceFinder.js';

class SerialDeviceFinder extends DeviceFinder {

    async getDeviceList() {
        let devices = [];
        const ports = await SerialPort.list();

        for (const port of ports) {
            if(port.vendorId === undefined || port.productId === undefined) continue;
            const vendorID = this.convertHexToNumber(port.vendorId);
            const productID = this.convertHexToNumber(port.productId);
            let serialNumber = port.serialNumber;

            // Check if serial number contains an ampersand (bug on Windows)
            // SEE: https://github.com/serialport/node-serialport/issues/2726
            if(port.serialNumber?.includes('&')){
                serialNumber = null;
            }
            const newDevice = new Device(vendorID, productID, port.path, serialNumber);
            devices.push(newDevice);
        }
        return devices;
    }
}

export default SerialDeviceFinder;