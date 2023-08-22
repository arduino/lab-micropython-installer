import Device from '../device.js';
import DeviceFinder from './deviceFinder.js';
import Flasher from '../flasher.js';
import Logger from '../logger.js';
import { arduinoNanoRP2040Descriptor } from '../descriptors.js';

const PICO_BOARD_NAME = 'arduino_nano_rp2040_connect';

class PicotoolDeviceFinder extends DeviceFinder {

    async getDeviceList() {
        const flasher = new Flasher();
        try {
            const boardInfo = await flasher.getBoardInfoWithPicotool();
            /* 
            Extract the board name from the output of picotool info -l
            Example output:
            Build Information
                sdk version:       1.5.0
                pico_board:        arduino_nano_rp2040_connect
                boot2_name:        boot2_w25q080
                build date:        Apr 26 2023
                build attributes:  MinSizeRel
            */

            const boardNameMatch = boardInfo.match(/pico_board:\s+(\S+)/);
            const boardName = boardNameMatch ? boardNameMatch[1] : null;
    
            if(boardName === PICO_BOARD_NAME) {
                // Use the VID and PID from the RP2040 native bootloader
                const vid = arduinoNanoRP2040Descriptor.getAlternativeIDs().vid;
                const pid = arduinoNanoRP2040Descriptor.getAlternativeIDs().pids.bootloader;
                const newDevice = new Device(vid, pid);
                return [newDevice];
            }
            return [];            

        } catch (error) {
            this.logger.log(error, Logger.LOG_LEVEL.ERROR);
            return [];
        }
    }
}

export default PicotoolDeviceFinder;