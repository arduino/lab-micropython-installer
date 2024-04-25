import { SerialPort, ByteLengthParser } from 'serialport'

import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger from './logger.js';

const HOST_URL = "https://downloads.arduino.cc";
const JSON_URL = HOST_URL + "/micropython/index.json";

export class Device {
    constructor(vendorID, productID, serialPort = null, serialNumber = null) {
        this.vendorID = vendorID;
        this.productID = productID;
        this.serialNumber = serialNumber;
        this.serialPort = serialPort;
        this.deviceManager = null;
        this.deviceDescriptor = null;
    }

    get logger() {
        if(this._logger === undefined) {
            return Logger.defaultLogger;
        }
        return this._logger;
    }

    set logger(logger) {
        this._logger = logger;
    }

    async getUPythonFirmwareUrl(usePreviewBuild = false) {
        const fileExtension = this.deviceDescriptor.firmwareExtension;
        const boardName = this.deviceDescriptor.firmwareID;
        this.logger?.log(`🔍 Finding latest firmware for board '${boardName}' ...`);

        const response = await fetch(JSON_URL);
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
            const previewRelease = boardData.releases.find((release) =>
                release.type.trim() === "(preview)" &&
                release.url.endsWith("." + fileExtension)
            );

            if(!previewRelease && !stableRelease){
                this.logger?.log("🤷 Neither a stable nor preview release was found.");
                return null;
            }

            // If we are using a preview build, return the preview release URL
            // same if no stable release is available.
            if (usePreviewBuild && previewRelease || !stableRelease) {
                this.logger?.log("🚧 Using preview build.");
                return HOST_URL + previewRelease.url;
            }

            return HOST_URL + stableRelease.url;
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
        if(!response.ok){
            this.logger?.log(`❌ Error downloading firmware: ${response.statusText}.`, Logger.LOG_LEVEL.ERROR);
            return null;
        }
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(targetFile, Buffer.from(buffer));

        return targetFile;
    }

    async downloadMicroPythonFirmware(usePreviewBuild = false) {
        const firmwareUrl = await this.getUPythonFirmwareUrl(usePreviewBuild);
        if (!firmwareUrl) {
            this.logger?.log("❌ No firmware found.", Logger.LOG_LEVEL.ERROR);
            return null;
        }
        return await this.downloadFirmware(firmwareUrl);
    }

    async flashFirmware(firmwareFile, isMicroPython = false) {
        this.logger?.log(`🔥 Flashing firmware '${path.basename(firmwareFile)}' ...`);
        return await this.deviceDescriptor.onFlashFirmware(firmwareFile, this, isMicroPython);
    }

    async sendREPLCommand(command, awaitResponse = true) {
        const serialPort = this.getSerialPort();
        if (!serialPort) {
            this.logger?.log(`❌ Can't send REPL command. No serial port available.`, Logger.LOG_LEVEL.ERROR);
            return;
        }
        const logger = this.logger;
        logger?.log(`📤 Sending REPL command: ${command}`, Logger.LOG_LEVEL.DEBUG);
        
        return new Promise((resolve, reject) => {
            let responseData = "";
            // For MicroPython devices, we need to open the serial port with a baud rate of 115200
            const serialport = new SerialPort({ path: serialPort, baudRate: 115200, autoOpen : false } );
            
            serialport.open(function (err) {
                if (err) {
                    logger?.log('❌ Error opening port: ' + err.message, Logger.LOG_LEVEL.ERROR);
                    reject(err);
                    return;
                }
                
                serialport.write(command, function (err) {
                    if (err) {
                        logger?.log('❌ Error on write: ' + err.message, Logger.LOG_LEVEL.ERROR);
                        serialport.close(function(e){
                            reject(err);
                        });
                        return;
                    }
                    serialport.drain(function(err){
                        if(err){
                            logger?.log('❌ Error on drain: ' + err.message, Logger.LOG_LEVEL.ERROR);
                            serialport.close(function(e){
                                reject(err);
                            });
                            return;
                        }
                        
                        if(!awaitResponse) {
                            if(serialport.isOpen){
                                serialport.close(function(err){
                                    if(err){
                                        reject("❌ Error on closing port: " + err.message);
                                    } else {
                                        resolve();
                                    }
                                });
                            } else {
                               resolve();
                            }
                            return;
                        }
                    });
                });
    
            });
    
            // Read response
            serialport.on('data', function (data) {
                responseData += data.toString();
                let lines = responseData.split('\r\n');
                let secondLastLine = lines[lines.length - 2];
                let lastLine = lines[lines.length - 1];
                
                // The inital >>> is received sometimes depending on the timing
                // and is hence disregarded for the completion condition.
                const endOfOutputReached = lastLine === ">>> " && secondLastLine != "Type \"help()\" for more information.";
                
                if(endOfOutputReached) {
                    logger?.log(`📥 Received REPL response: ${responseData}`, Logger.LOG_LEVEL.DEBUG);
                    serialport.close(function(err){
                        if(err){
                            logger?.log('❌ Error on port close: ' + err.message);
                            reject(err);
                        } else {
                            resolve(responseData);
                        }
                    });
                }
            });
        });
    }

    // Function to read one byte from the serial port.
    // Returns a promise that resolves to the byte read as a Buffer.
    async readBytesFromSerialPort(baudRate = 115200, bytes = 1, timeout = 20000) {
        const logger = this.logger;
        return new Promise((resolve, reject) => {
            let timeoutID = null;
            const serialport = new SerialPort({ path: this.serialPort, baudRate: baudRate, autoOpen : false } );
            const parser = serialport.pipe(new ByteLengthParser({
                length: bytes
            }));
            
            parser.on('data', function (data) {
                logger?.log('📥 Received data: ' + data.toString('hex'), Logger.LOG_LEVEL.DEBUG);
                clearTimeout(timeoutID);
                serialport.close(function (err){
                    if(err){
                        logger?.log('❌ Error on port close: ' + err.message, Logger.LOG_LEVEL.ERROR);
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });

            serialport.open(function (err) {
                if (err) {
                    logger?.log('❌ Error opening port: ' + err.message)
                    reject(err);
                } else {
                    timeoutID = setTimeout(() => {
                        if(serialport.isOpen){
                            serialport.close(function(err){
                                reject("❌ Timeout while reading from serial port.");
                            });
                        } else {
                            reject("❌ Timeout while reading from serial port.");
                        }
                    }, timeout);
                }
            });
           
        });
    };

    // Function to write a byte to the serial port.
    async writeToSerialPort(byte, baudRate = 115200) {
        const logger = this.logger;
        return new Promise((resolve, reject) => {
            const serialport = new SerialPort({ path: this.serialPort, baudRate: baudRate, autoOpen : false } );
            serialport.open(function (err) {
                if (err) {
                    logger?.log('❌ Error opening port: ' + err.message, Logger.LOG_LEVEL.ERROR)
                    reject(err);
                } else {
                    serialport.write(byte, function (err) {
                        if (err) {
                            logger?.log('❌ Error on write: ' + err.message), Logger.LOG_LEVEL.ERROR;
                            serialport.close();
                            reject(err);
                            return;
                        }
                        
                        serialport.drain(function(err){
                            if(err){
                                logger?.log('❌ Error on drain: ' + err.message, Logger.LOG_LEVEL.ERROR);
                                serialport.close();
                                reject(err);       
                                return;                 
                            }
                            serialport.close(function (err){
                                if(err){
                                    logger?.log('❌ Error on port close: ' + err.message, Logger.LOG_LEVEL.ERROR);
                                    reject(err);
                                } else {
                                    resolve();
                                }
                                return;
                            });
                        });
        
                    });
                }
            });
        });
    };

    async enterBootloader() {
        this.logger?.log(`👢 Entering bootloader ...`);
        if (!this.runsMicroPython()) {
            const serialPort = this.getSerialPort();
            if (!serialPort) {
                this.logger?.log(`❌ Can't enter bootloader. No serial port available.`, Logger.LOG_LEVEL.ERROR);
                return;
            }
            // Open the serial port with a baud rate of 1200
            const serialport = new SerialPort({ path: serialPort, baudRate: 1200, autoOpen: false });
            serialport.on('open', function () {
                serialport.close();
            });

            serialport.open(function (err) {
                if (err) {
                    this.logger?.log('❌ Error opening port: ' + err.message, Logger.LOG_LEVEL.ERROR);
                }
            });
        } else {
            await this.sendREPLCommand('import machine; machine.bootloader()\r\n', false);
        }
    }

    async reset() {
        if(!this.runsBootloader()) {
            this.logger?.log(`❌ Can't reset device. It is not in bootloader mode.`, Logger.LOG_LEVEL.ERROR);
            return;
        }

        this.logger?.log(`🔄 Resetting device ...`);
        if(this.deviceDescriptor.onReset){
            await this.deviceDescriptor.onReset(this);
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

    runsArduino() {
        const arduinoID = this.deviceDescriptor.getDefaultIDs().pids.arduino;
        // The Arduino firmware should never run with the alternative IDs but we check it anyway
        // in case that changes in the future. 
        const arduinoIDAlt = this.deviceDescriptor.getAlternativeIDs()?.pids.arduino;
        return this.productID === arduinoID || this.productID === arduinoIDAlt;
    }

    /**
     * Returns the device's current mode based on the VID / PID information.
     * @returns {string} The current mode as a string.
     */
    getMode() {
        if (this.runsMicroPython()) {
            return "MicroPython";
        } else if (this.runsBootloader()) {
            return "Bootloader";
        } else if (this.runsArduino()) {
            return "Arduino";
        } else {
            return "Unknown";
        }
    }

    // Function to convert the vendor /product ID to a hex string wihtout the 0x prefix.
    // The number is padded with a 0 if it is less than 4 digits long.
    convertNumberToHex(anID) {
        return "0x" + anID.toString(16).padStart(4, '0');
    }

    setDeviceDescriptor(deviceDescriptor) {
        this.deviceDescriptor = deviceDescriptor;
    }

    getVendorID() {
        return this.vendorID;
    }

    getProductID() {
        return this.productID;
    }

    getVendorIDHex() {
        return this.convertNumberToHex(this.vendorID);
    }

    getProductIDHex() {
        return this.convertNumberToHex(this.productID);
    }


    getBootloaderVID(){
        const hasDefaultBootloaderPID = !!this.deviceDescriptor.getDefaultIDs().pids.bootloader;
        if(hasDefaultBootloaderPID){
            return this.deviceDescriptor.getDefaultIDs().vid;
        }

        const hasAlternativeBootloaderPID = !!this.deviceDescriptor.getAlternativeIDs()?.pids.bootloader;
        if(hasAlternativeBootloaderPID){
            return this.deviceDescriptor.getAlternativeIDs()?.vid;
        }
        return null;
    }
    
    getBootloaderPID(){
        return this.deviceDescriptor.getDefaultIDs().pids.bootloader || this.deviceDescriptor.getAlternativeIDs()?.pids.bootloader;
    }

    getDefaultVID(){
        return this.deviceDescriptor.getDefaultIDs().vid;
    }

    getDefaultArduinoPID(){
        return this.deviceDescriptor.getDefaultIDs().pids.arduino;
    }

    getSerialPort() {
        return this.serialPort;
    }

    getSerialNumber() {
        return this.serialNumber;
    }

    getDeviceManager() {
        return this.deviceManager;
    }

    async getMicroPythonVersion() {
        const versionData = await this.sendREPLCommand('import os; print(os.uname().release)\r\n');
        const lines = versionData.trim().split('\r\n');
        // Find the line that matches the pattern 'x.y.z'
        const versionStringLine = lines.find(line => line.match(/\d+\.\d+\.\d+/));

        if (!versionStringLine) {
            this.logger?.log(`❌ Could not find version string in response: ${versionData}`);
            return null;
        }
        return versionStringLine;
    }

    async toPlainObject() {
        return {
            manufacturer: this.deviceDescriptor.manufacturer,
            name: this.deviceDescriptor.name,
            vendorID: this.vendorID,
            productID: this.productID,
            serialNumber: this.serialNumber,
            serialPort: this.getSerialPort(),
            mode: this.getMode(),
            microPythonVersion: this.runsMicroPython() ? await this.getMicroPythonVersion() : null
        };
    }

}

export default Device;