export class DeviceDescriptor {

    constructor(vendorID, productID, name, manufacturer, firmwareID, firmwareExtension, runsBootloader =false , runsMicroPython = false) {
        this.vendorID = vendorID;
        this.productID = productID;
        this.name = name;
        this.manufacturer = manufacturer;
        this.firmwareID = firmwareID;
        this.firmwareExtension = firmwareExtension;
        this.runsBootloader = runsBootloader;
        this.runsMicroPython = runsMicroPython;
        this.onFlashFirmware = null;
        this.onFlashUPythonFirmware = null;
    }

    runsMicroPython() {
        return this.runsMicroPython;
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

export default DeviceDescriptor;