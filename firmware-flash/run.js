import { flashMicroPythonFirmware } from './index.js';

const result = await flashMicroPythonFirmware();
process.exit(result ? 0 : -1);