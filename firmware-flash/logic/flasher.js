import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export class Flasher {

    async runDfuUtil(firmwareFilepath, vendorId, productId, reset = true) {
        const binaryFolder = os.platform();
        const scriptDir = path.dirname(__filename);
        const dfuUtilPath = path.join(scriptDir, "..", "bin", binaryFolder, "dfu-util");

        // Specify the altsetting of the DFU interface via -a.
        let cmd = `${dfuUtilPath} -a 0 -d ${vendorId}:${productId} -D ${firmwareFilepath}`;
        
        if (reset) {
            // In theory, the reset should be automatic with -R, but it doesn't seem to work
            //cmd += " -R";
            cmd += " -s :leave";
        }

        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error running dfu-util: ${error.message}`);
                    return;
                }
                if (stderr) {
                    reject(`Error running dfu-util: ${stderr}`);
                    return;
                }
                resolve(stdout);
            });
        });
    }

    async runBossac(firmwareFilepath, port, offset = null, reset = true) {
        const folder = os.platform();
        const scriptDir = path.dirname(__filename);
        const bossacPath = path.join(scriptDir, "..", "bin", folder, "bossac");

        // In theory, the port should be automatically detected, but it doesn't seem to work
        let cmd = `${bossacPath} -d  --port=${port} -U -i -e -w ${firmwareFilepath}`;
        
        if (offset) {
            cmd += ` --offset=${offset}`;
        }
        if (reset) {
            // In theory, the reset should be automatic with -R, but it doesn't seem to work
            //cmd += " -R";
            cmd += " -R -x";
        }
        cmd += " -R";

        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error running bossac: ${error.message}`);
                    return;
                }
                if (stderr) {
                    reject(`Error running bossac: ${stderr}`);
                    return;
                }
                resolve(stdout);
            });
        });
    }

    async runPicotool(firmwareFilepath, reset = true) {
        const binaryFolder = os.platform();
        const scriptDir = path.dirname(__filename);
        const picotoolPath = path.join(scriptDir, "..", "bin", binaryFolder, "picotool");
        let params = ["-v"]; // Verify the firmware after flashing

        if (reset) {
            params.push("-x")
        }

        let cmd = `${picotoolPath} load ${params.join(" ")} ${firmwareFilepath}`;
        
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error running picotool: ${error.message}`);
                    return;
                }
                if (stderr) {
                    reject(`Error running picotool: ${stderr}`);
                    return;
                }
                resolve(stdout);
            });
        });
    }

    async runEsptool(firmwareFilepath, port, reset = true) {
        const binaryFolder = os.platform();
        const scriptDir = path.dirname(__filename);
        const espToolPath = path.join(scriptDir, "..", "bin", binaryFolder, "esptool");
        let params = ["--chip esp32", `--port ${port}`];
        let eraseCmd = `${espToolPath} ${params.join(" ")} --after no_reset erase_flash`;
        
        if (!reset) {
            params.push("--after no_reset")
        }
        let flashCmd = `'${espToolPath}' ${params.join(" ")} --baud 460800 write_flash -z 0x1000 '${firmwareFilepath}'`;
        
        await new Promise((resolve, reject) => {
            exec(eraseCmd, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error running esptool: ${error.message}`);
                    return;
                }
                if (stderr) {
                    reject(`Error running esptool: ${stderr}`);
                    return;
                }
                resolve(stdout);
            });
        });

        return new Promise((resolve, reject) => {
            exec(flashCmd, (error, stdout, stderr) => {
                if (error) {
                    reject(`Error running esptool: ${error.message}`);
                    return;
                }
                if (stderr) {
                    reject(`Error running esptool: ${stderr}`);
                    return;
                }
                resolve(stdout);
            });
        });
    }

}

export default Flasher;