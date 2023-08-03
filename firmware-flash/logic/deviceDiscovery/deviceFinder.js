class DeviceFinder {

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

}

export default DeviceFinder;