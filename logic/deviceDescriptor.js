export class DeviceDescriptor {

    constructor(identifiers, name, manufacturer, firmwareID, firmwareExtension) {
        this.identifiers = identifiers;
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
    getDefaultProductIDList() {
        return Object.values(this.getDefaultIDs().pids);
    }

    getAlternativeProductIDList() {
        return Object.values(this.getAlternativeIDs().pids);
    }

    /**
     * @returns {object} An object containing 'vid' and 'pids' properties.
     */
    getDefaultIDs(){
        return this.identifiers.default;
    }

    /**
     * Gets the alternative IDs for this device. This is used for devices that have multiple
     * vendor IDs or product IDs. For example, the Arduino Nano RP2040 has a different vendor ID
     * when it runs the bootloader.
     * @returns {object} An object containing 'vid' and 'pids' properties.
     */
    getAlternativeIDs(){
        return this.identifiers.alternative;
    }
}

export default DeviceDescriptor;