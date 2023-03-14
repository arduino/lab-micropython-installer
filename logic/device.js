import { SerialPort } from 'serialport'
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';

export class Device {
    constructor(deviceDescriptor, serialPort, serialNumber = null, mountPoint = null) {
        this.deviceDescriptor = deviceDescriptor;
        this.serialNumber = serialNumber;
        this.serialPort = serialPort;
        this.mountPoint = mountPoint;
    }

    async getUPythonFirmwareUrl() {
        const fileExtension = this.deviceDescriptor.firmwareExtension;
        const boardName = this.deviceDescriptor.firmwareID;        
        console.log(`🔍 Finding latest firmware for board '${boardName}' ...`);

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
            const releaseData = boardData.releases.find((release) =>
                release.url.endsWith("." + fileExtension)
            );

            return "https://downloads.arduino.cc" + releaseData.url;
        }
    }

    async downloadFirmware(firmwareUrl) {        
        console.log(`🔗 Firmware URL: ${firmwareUrl}`);
        console.log(`🌐 Downloading firmware ...`);

        // Extract the file name from the URL
        const fileName = firmwareUrl.split("/").pop();
        const targetFile = path.join(os.tmpdir(), fileName);

        // Download the file and save it to disk
        const response = await fetch(firmwareUrl);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(targetFile, Buffer.from(buffer));

        return targetFile;
    }

    async flashFirmware(firmwareFile) {
        if(!this.deviceDescriptor.runsBootloader) this.enterBootloader();
        return this.deviceDescriptor.onFlashFirmware(firmwareFile);
    }

    sendREPLCommand(command) {
        // For MicroPython devices, we need to open the serial port with a baud rate of 115200
        const serialport = new SerialPort({ path: this.serialPort, baudRate: 115200 });
        serialport.write(command);
        serialport.close();
    }

    async flashMicroPythonFirmware() {
        const firmwareUrl = await this.getUPythonFirmwareUrl();
        const firmwareFile = await this.downloadFirmware(firmwareUrl);
        
        if(!this.deviceDescriptor.runsBootloader) this.enterBootloader();
        if(this.deviceDescriptor.onFlashUPythonFirmware){
            return this.deviceDescriptor.onFlashUPythonFirmware(firmwareFile);
        }
        return this.deviceDescriptor.onFlashFirmware(firmwareFile);
    }

    enterBootloader() {
        console.log(`👢 Entering bootloader ...`);
        if (!this.deviceDescriptor.runsMicroPython) {
            // Open the serial port with a baud rate of 1200
            const serialport = new SerialPort({ path: this.serialPort, baudRate: 1200 });
            if (serialport.isOpen) serialport.close();
        } else {            
            this.sendREPLCommand('import machine\r\nmachine.bootloader()\r\n');
        }
    }
}

export default Device;