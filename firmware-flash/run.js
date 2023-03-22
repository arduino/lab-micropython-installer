import { flashMicroPythonFirmware, logger } from './index.js';

logger.printToConsole = true;
const result = await flashMicroPythonFirmware();

if (result) {
    console.log('✅ MicroPython firmware flashed successfully. You may need to reset the device to run it.');
} else {
    console.log('❌ Failed to flash MicroPython firmware.');
}
process.exit(result ? 0 : -1);