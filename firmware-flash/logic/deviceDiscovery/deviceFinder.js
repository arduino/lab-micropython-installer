import Logger from "../logger.js";

class DeviceFinder {

    get logger() {
        if(this._logger === undefined) {
            return Logger.defaultLogger;
        }
        return this._logger;
    }

    set logger(logger) {
        this._logger = logger;
    }

    // Function to convert a hex string ID to a number.
    convertHexToNumber(anID) {
        // The hex string can have the 0x prefix or not.
        if (anID.startsWith("0x")) {
            anID = anID.substring(2);
        }
        // The hex string can be padded with a 0 or not.
        if (anID.length === 3) {
            anID = "0" + anID;
        }
        // The hex string can be upper or lower case.
        anID = anID.toLowerCase();

        return parseInt(anID, 16);
    }

    async getDeviceList() {
        throw new Error("❌ The getDeviceList() method must be implemented by the subclass.");
    }

}

export default DeviceFinder;