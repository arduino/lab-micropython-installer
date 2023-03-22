import { flashMicroPythonFirmware, getFirstFoundDevice, logger } from './index.js';

logger.printToConsole = true;
const selectedDevice = await getFirstFoundDevice();

if (selectedDevice && await flashMicroPythonFirmware(selectedDevice)) {
    console.log('✅ MicroPython firmware flashed successfully. You may need to reset the device to run it.');
    process.exit(0);
} else {
    console.log('❌ Failed to flash MicroPython firmware.');
    process.exit(-1);
}