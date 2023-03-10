import DeviceManager from './logic/DeviceManager.js';
import Device from './logic/Device.js';
import { usb, getDeviceList } from 'usb';
import { SerialPort } from 'serialport'

import * as readline from 'readline';

const deviceManager = new DeviceManager();
deviceManager.addDevice(new Device(0x2341, 0x0266, 'Giga R1 WiFi', 'Arduino', 'ARDUINO_GIGA'));
deviceManager.addDevice(new Device(0x2341, 0x025f, 'Nicla Vision', 'Arduino', 'ARDUINO_NICLA_VISION'));
const connectedDevices = getDeviceList();
const foundDevices = deviceManager.findDevicesFromDeviceList(connectedDevices);

async function findSerialPort(vendorId, productId) {
    const ports = await SerialPort.list();
  
    for (const port of ports) {
        console.log(port);
      if (port.vendorId === vendorId && port.productId === productId) {
        return port.path;
      }
    }
  
    throw new Error(`Could not find serial port for vendor ID ${vendorId} and product ID ${productId}`);
}

async function selectDevice(devices) {
    // create an array of device names to display to the user
    const deviceNames = devices.map(device => device.name);
    console.log(deviceNames);
    return null;
}

if(foundDevices.length === 0) {
    console.log('No devices found');
    process.exit(-1);
}

const selectedDevice = foundDevices[0]; // await selectDevice(foundDevices);
findSerialPort(selectedDevice.getVendorIDString(), selectedDevice.getProductIDString()).then((port) => {
    console.log(port);
});