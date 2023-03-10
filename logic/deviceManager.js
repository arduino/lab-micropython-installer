class DeviceManager {
    constructor() {
      this.devices = [];
    }
  
    addDevice(device) {
      this.devices.push(device);
    }
  
    findDevice(vendorID, productID) {
      return this.devices.find(device => device.vendorID === vendorID && device.productID === productID);
    }

    getProductList() {
        return this.devices.map(device => ({ vendorID: device.vendorID, productID: device.productID }));
    }

    findDevicesFromDeviceList(list) {
        const foundDevices = [];
        for (const element of list) {
            const device = this.findDevice(element.deviceDescriptor.idVendor, element.deviceDescriptor.idProduct);
            if (device) {
              foundDevices.push(device);
            }
        }
        return foundDevices;
      }
      
    
  }
  
export default DeviceManager;