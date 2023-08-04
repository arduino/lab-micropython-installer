import Device from '../device.js';
import DeviceFinder from './deviceFinder.js';
import Flasher from '../flasher.js';
import Logger from '../logger.js';
import { arduinoPortentaC33Descriptor } from '../descriptors.js';

class DFUDeviceFinder extends DeviceFinder {

    async getDeviceList() {
        const flasher = new Flasher();
        const logger = new Logger(null, true, Logger.LOG_LEVEL.DEBUG);
        flasher.logger = logger;
        try {
            const deviceInfo = await flasher.getDeviceListFromDFUUtil();
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

            const identifiersMatch = deviceInfo.match(/Found DFU: \[(\d{4}):(\d{4})\]/);
            if(!identifiersMatch) {
                return [];
            }
            const vid = this.convertHexToNumber("0x" + identifiersMatch[1]);
            const pid = this.convertHexToNumber("0x" + identifiersMatch[2]);
            
            // Use the VID and PID from the Portenta C33 bootloader
            const targetVID = arduinoPortentaC33Descriptor.getDefaultIDs().vid;
            const targetPID = arduinoPortentaC33Descriptor.getDefaultIDs().pids.bootloader;

            if(vid === targetVID && pid === targetPID) {
                const newDevice = new Device(vid, pid);
                return [newDevice];
            }
            return [];            

        } catch (error) {
            logger.log(error, Logger.LOG_LEVEL.ERROR);
            return [];
        }
    }
}

export default DFUDeviceFinder;