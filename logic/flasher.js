import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export class Flasher {

    runDfuUtil(firmwareFilepath, vendorId, productId, reset = true) {
        const binaryFolder = os.platform();
        const scriptDir = path.dirname(__filename);
        const dfuUtilPath = path.join(scriptDir, "..", "bin", binaryFolder, "dfu-util");

        // Specify the altsetting of the DFU interface via -a.
        let cmd = `${dfuUtilPath} -a 0 -d ${vendorId}:${productId} -D ${firmwareFilepath}`;
        if (reset) {
            cmd += " -R";
        }

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running dfu-util: ${error.message}`);
                return false;
            }
            if (stderr) {
                console.error(`Error running dfu-util: ${stderr}`);
                return false;
            }
            // console.log(stdout);
            return true;
        });
    }

    runBossac(firmwareFilepath, port = null, offset = null) {
        const folder = os.platform();
        const scriptDir = path.dirname(__filename);
        const bossacPath = path.join(scriptDir, "..", "bin", folder, "bossac");

        let cmd = `${bossacPath} -i -d -e -w -R`;
        
        // In theory, the port should be automatically detected, but it doesn't seem to work
        if (port) {
            cmd += ` -U --port=${port}`;
        }
        if (offset) {
            cmd += ` --offset=${offset}`;
        }
        cmd += ` ${firmwareFilepath}`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running bossac: ${error.message}`);
                return false;
            }
            if (stderr) {
                console.error(`Error running bossac: ${stderr}`);
                return false;
            }
            console.log(stdout);
            return true;
        });
    }

}

export default Flasher;