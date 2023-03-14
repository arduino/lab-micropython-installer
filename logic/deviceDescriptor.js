export class DeviceDescriptor {

    constructor(vendorID, productIDs, name, manufacturer, firmwareID, firmwareExtension) {
        this.vendorID = vendorID;
        this.productIDs = productIDs;
        this.name = name;
        this.manufacturer = manufacturer;
        this.firmwareID = firmwareID;
        this.firmwareExtension = firmwareExtension;
        this.onFlashFirmware = null;
        this.onFlashUPythonFirmware = null;
    }

    // Returns all the product IDs as an array of numbers. The boards have multiple product IDs depending on the firmware they run.
    // E.g. the bootloader has a different product ID than the Arduino firmware.
    // The returned IDs are in integer format, not hex.
    getProductIDList() {
        return Object.values(this.productIDs);
    }
}

export default DeviceDescriptor;