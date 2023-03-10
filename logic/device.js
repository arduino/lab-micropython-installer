export class Device {
    constructor(vendorID, productID, name, manufacturer, firmwareID, mountPoint = null) {
      this.vendorID = vendorID;
      this.productID = productID;
      this.name = name;
      this.mountPoint = mountPoint;
      this.manufacturer = manufacturer;
      this.firmwareID = firmwareID;
    }

    // Function to convert the vendor ID to a hex string wihtout the 0x prefix.
    // The number is padded with a 0 if it is less than 4 digits long.
    getVendorIDString() {
        return this.vendorID.toString(16).padStart(4, '0');
    }

    // Function to convert the product ID to a hex string wihtout the 0x prefix
    getProductIDString() {
        return this.productID.toString(16).padStart(4, '0');
    }
  }
  
export default Device;