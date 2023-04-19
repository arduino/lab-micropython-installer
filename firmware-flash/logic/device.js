import { SerialPort } from 'serialport'
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';

export class Device {
    constructor(vendorID, productID, deviceDescriptor, serialPort = null, serialNumber = null) {
        this.vendorID = vendorID;
        this.productID = productID;
        this.deviceDescriptor = deviceDescriptor;
        this.serialNumber = serialNumber;
        this.serialPort = serialPort;
    }

    async getUPythonFirmwareUrl(useNightlyBuild = false) {
        const fileExtension = this.deviceDescriptor.firmwareExtension;
        const boardName = this.deviceDescriptor.firmwareID;
        this.logger?.log(`🔍 Finding latest firmware for board '${boardName}' ...`);

        const jsonUrl = "https://downloads.arduino.cc/micropython/index.json";
        const response = await fetch(jsonUrl);
        const data = await response.json();

        // Find the board with the given name
        const boards = data.boards.filter((board) => board.name === boardName);

        if (boards.length === 0) {
            return null;
        } else {
            const boardData = boards[0];

            // Find the first release that matches the desired file extension
            const stableRelease = boardData.releases.find((release) =>
                release.type.trim() === "(stable)" &&
                release.url.endsWith("." + fileExtension)
            );

            if(!stableRelease){
                this.logger?.log("🙅 No stable release found.");
            }

            // Find the first release that matches the desired file extension
            const nightlyRelease = boardData.releases.find((release) =>
                release.type.trim() === "(nightly)" &&
                release.url.endsWith("." + fileExtension)
            );

            // If we are using a nightly build, return the nightly release URL
            // same if no stable release is available.
            if (useNightlyBuild && nightlyRelease || !stableRelease) {
                this.logger?.log("🌙 Using nightly build.");
                return "https://downloads.arduino.cc" + nightlyRelease.url;
            }

            return "https://downloads.arduino.cc" + stableRelease.url;
        }
    }

    async downloadFirmware(firmwareUrl) {
        this.logger?.log(`🔗 Firmware URL: ${firmwareUrl}`);
        this.logger?.log(`🌐 Downloading firmware ...`);

        // Extract the file name from the URL
        const fileName = firmwareUrl.split("/").pop();
        const targetFile = path.join(os.tmpdir(), fileName);

        // Download the file and save it to disk
        const response = await fetch(firmwareUrl);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(targetFile, Buffer.from(buffer));

        return targetFile;
    }

    async downloadMicroPythonFirmware(useNightlyBuild = false) {
        const firmwareUrl = await this.getUPythonFirmwareUrl(useNightlyBuild);
        if (!firmwareUrl) {
            this.logger?.log("❌ No firmware found.");
            return null;
        }
        return await this.downloadFirmware(firmwareUrl);
    }

    async flashFirmware(firmwareFile, isMicroPython = false) {
        if(this.deviceDescriptor.onPreFlashFirmware){
            this.logger?.log(`🔥 Running pre-flash step ...`);
            await this.deviceDescriptor.onPreFlashFirmware(this);
        };
        this.logger?.log(`🔥 Flashing firmware '${path.basename(firmwareFile)}' ...`);
        return this.deviceDescriptor.onFlashFirmware(firmwareFile, this, isMicroPython);
    }

    async sendREPLCommand(command, awaitResponse = true, debug = false) {
        if(debug){
            this.logger?.log(`📤 Sending REPL command: ${command}`);
        }
        
        return new Promise((resolve, reject) => {
            let responseData = "";
            // For MicroPython devices, we need to open the serial port with a baud rate of 115200
            const serialport = new SerialPort({ path: this.getSerialPort(), baudRate: 115200, autoOpen : false } );
            
            serialport.open(function (err) {
                if (err) {
                    this.logger?.log('❌ Error opening port: ', err.message);
                    reject(err);
                }
                
                serialport.write(command, function (err) {
                    if (err) {
                        this.logger?.log('❌ Error on write: ', err.message);
                        reject(err);
                    }
                });
    
                if(!awaitResponse) {
                    if(serialport.isOpen) serialport.close();
                    resolve();
                    return;
                }
            });
    
            // Read response
            // TODO: Use https://serialport.io/docs/api-parser-readline instead
            serialport.on('data', function (data) {
                responseData += data.toString();
                let lines = responseData.split('\r\n');
                let lastLine = lines[lines.length - 1];
                
                if(lastLine === ">>> ") {
                    serialport.close();
                    if(debug){
                        this.logger?.log(`📥 Received REPL response: ${responseData}`);
                    }
                    resolve(responseData);
                }
            });
        });
    }

    // Function to read a few bytes from the serial port. Returns after the first burst of data.
    // TODO: Use ready parser instead https://serialport.io/docs/api-parser-ready
    // OR: https://serialport.io/docs/api-parser-packet-length
    async readFromSerialPort(baudRate = 115200) {
        return new Promise((resolve, reject) => {
            const serialport = new SerialPort({ path: this.getSerialPort(), baudRate: baudRate, autoOpen : false } );
            serialport.open(function (err) {
                if (err) {
                    this.logger?.log('❌ Error opening port: ', err.message)
                    reject(err);
                }
            });
            serialport.on('data', function (data) {
                serialport.close();
                resolve(data);
            });
        });
    };

    async enterBootloader() {
        this.logger?.log(`👢 Entering bootloader ...`);
        if (!this.runsMicroPython()) {
            // Open the serial port with a baud rate of 1200
            const serialport = new SerialPort({ path: this.getSerialPort(), baudRate: 1200, autoOpen: false });
            serialport.on('open', function () {
                serialport.close();
            });

            serialport.open(function (err) {
                if (err) {
                    this.logger?.log('❌ Error opening port: ', err.message);
                }
            });
        } else {
            await this.sendREPLCommand('import machine; machine.bootloader()\r\n', false);
        }
    }

    runsMicroPython() {
        const upythonID = this.deviceDescriptor.getDefaultIDs().pids.upython;
        const upythonIDAlt = this.deviceDescriptor.getAlternativeIDs()?.pids.upython;
        return this.productID === upythonID || this.productID === upythonIDAlt;
    }

    runsBootloader() {
        const bootloaderID = this.deviceDescriptor.getDefaultIDs().pids.bootloader;
        const bootloaderIDAlt = this.deviceDescriptor.getAlternativeIDs()?.pids.bootloader;
        return this.productID === bootloaderID || this.productID === bootloaderIDAlt;
    }

    // Function to convert the vendor /product ID to a hex string wihtout the 0x prefix.
    // The number is padded with a 0 if it is less than 4 digits long.
    convertNumberToHex(anID) {
        return "0x" + anID.toString(16).padStart(4, '0');
    }

    getVendorIDHex() {
        return this.convertNumberToHex(this.vendorID);
    }

    getProductIDHex() {
        return this.convertNumberToHex(this.productID);
    }


    getBootloaderVID(){
        const hasAlternativeBootloaderPID = !!this.deviceDescriptor.getAlternativeIDs()?.pids.bootloader;
        return hasAlternativeBootloaderPID ? this.deviceDescriptor.getAlternativeIDs()?.vid : this.deviceDescriptor.getDefaultIDs().vid;
    }
    
    getBootloaderPID(){
        return this.deviceDescriptor.getAlternativeIDs()?.pids.bootloader || this.deviceDescriptor.getDefaultIDs().pids.bootloader;
    }

    getSerialPort() {
        return this.serialPort;
    }

    async getMicroPythonVersion() {
        const versionData = await this.sendREPLCommand('import sys; print(sys.implementation.version)\r\n');
        const lines = versionData.trim().split('\r\n');
        // Find the line that starts with a '(' which contains the version string e.g. (1, 19, 1)
        const versionStringLine = lines.find((line) => line.startsWith('('));
        if (!versionStringLine) {
            this.logger?.log(`❌ Could not find version string in response: ${versionData}`);
            return null;
        }
        const versionString = versionStringLine.split(', ').join('.');
        // Remove the parentheses from the version string
        return versionString.substring(1, versionString.length - 1);
    }

    toPlainObject() {
        return {
            manufacturer: this.deviceDescriptor.manufacturer,
            name: this.deviceDescriptor.name,
            vendorID: this.vendorID,
            productID: this.productID,
            serialNumber: this.serialNumber,
            serialPort: this.getSerialPort(),
        };
    }

}

export default Device;