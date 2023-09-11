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
            const newDevice = new Device(vendorID, productID, port.path, port.serialNumber);
            devices.push(newDevice);
        }
        return devices;
    }
}

export default SerialDeviceFinder;