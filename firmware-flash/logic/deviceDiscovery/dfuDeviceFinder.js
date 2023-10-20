import Device from '../device.js';
import DeviceFinder from './deviceFinder.js';
import CommandRunner from '../commandRunner.js';
import Logger from '../logger.js';
import * as descriptors from '../descriptors.js';

class DFUDeviceFinder extends DeviceFinder {

    async getDeviceList() {
        const commandRunner = new CommandRunner();
        try {
            const deviceInfo = await commandRunner.getDeviceListFromDFUUtil();
            /* 
            Extract the board name from the output of picotool info -l
            Example output:
            dfu-util 0.11-arduino4

            Copyright 2005-2009 Weston Schmidt, Harald Welte and OpenMoko Inc.
            Copyright 2010-2021 Tormod Volden and Stefan Schmidt
            This program is Free Software and has ABSOLUTELY NO WARRANTY
            Please report bugs to http://sourceforge.net/p/dfu-util/tickets/

            Found DFU: [2341:0368] ver=0100, devnum=38, cfg=1, intf=0, path="20-3", alt=0, name="@CodeFlash /0x00000000/8*8Ka,63*32Kg", serial="4206546E3536353291C846534E4B2CC7"
            Found DFU: [2341:0368] ver=0100, devnum=38, cfg=1, intf=0, path="20-3", alt=1, name="@DataFlash /0x08000000/8*1Kg", serial="4206546E3536353291C846534E4B2CC7"
            */

            const identifiersMatches = deviceInfo.matchAll(/Found DFU: \[(\d{4}):(\d{4})\]/g);
            if(identifiersMatches.next().done) {
                const message = "🔌 No DFU capable USB device found.";
                this.logger.log(message, Logger.LOG_LEVEL.DEBUG);
                return [];
            }

            let devices = [];

            for(let match of identifiersMatches) {
                const vid = this.convertHexToNumber("0x" + match[1]);
                const pid = this.convertHexToNumber("0x" + match[2]);
                
                for(let descriptor of Object.values(descriptors)) {
                    // Use the VID and PID from the Portenta C33 bootloader
                    const targetVID = descriptor.getDefaultIDs().vid;
                    const targetPID = descriptor.getDefaultIDs().pids.bootloader;
        
                    if(vid === targetVID && pid === targetPID) {
                        const newDevice = new Device(vid, pid);
                        devices.push(newDevice);
                    }
                }
            }

            // Filter out duplicates by checking the getVendorID() and getProductID() of each device
            // Duplicates can occur when a device has multiple DFU interfaces
            devices = devices.filter((device, index, self) =>
                index === self.findIndex((t) => (
                    t.getVendorID() === device.getVendorID() && t.getProductID() === device.getProductID()
                ))
            );

            return devices;            

        } catch (error) {
            this.logger.log(error, Logger.LOG_LEVEL.ERROR);
            return [];
        }
    }
}

export default DFUDeviceFinder;