import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

export class Flasher {

    /**
     * Get binary folder based on the operating system and the architecture.
     * @param {String} binaryName the name of the command line tool to run
     * @returns The absolute path to the binary.
     */
    getBinaryPath(binaryName) {
        const binaryFolder = os.platform();
        const scriptDir = path.dirname(__filename);
        const platform = os.platform();
        const arch = os.arch();
        const osBinaryFolder = path.join(scriptDir, "..", "bin", binaryFolder);

        if (platform === 'darwin') {
            // If the platform is darwin then don't use the architecture.
            return path.join(osBinaryFolder, binaryName);
        }
        const binaryPath = path.join(osBinaryFolder, arch, binaryName);

        // Check if the 64 bit version of the binary exists. If not use the 32 bit version.
        if (arch === 'x64' && !fs.existsSync(binaryPath)) {
            return path.join(osBinaryFolder, "ia32", binaryName);
        } 
        return binaryPath;
    }

    async runDfuUtil(firmwareFilepath, vendorId, productId, reset = true) {
        const dfuUtilPath = this.getBinaryPath("dfu-util");

        // Specify the altsetting of the DFU interface via -a.
        let cmd = `'${dfuUtilPath}' -a 0 -d ${vendorId}:${productId} -D '${firmwareFilepath}'`;
        
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
        const bossacPath = this.getBinaryPath("bossac");

        // In theory, the port should be automatically detected, but it doesn't seem to work
        let cmd = `'${bossacPath}' -d  --port=${port} -U -i -e -w '${firmwareFilepath}'`;
        
        if (offset) {
            cmd += ` --offset=${offset}`;
        }
        if (reset) {
            // In theory, the reset should be automatic with -R, but it doesn't seem to work
            cmd += " -R";
        }

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
    
    async getBootloaderVersionWithBossac(port) {
        const bossacPath = this.getBinaryPath("bossac");
        const regex = /Version\s+:\s+Arduino Bootloader(?: \(.+\))? (\d+\.\d+)/;
        let cmd = `${bossacPath} -U --port=${port} -i`;

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
                const match = stdout.match(regex);

                if (match) {
                    const versionNumber = match[1];
                    resolve(versionNumber);
                } else {
                    reject('Version number not found');
                }
            });
        });
    }



    async runPicotool(firmwareFilepath, reset = true) {
        const picotoolPath = this.getBinaryPath("picotool");
        let params = ["-v"]; // Verify the firmware after flashing

        if (reset) {
            params.push("-x")
        }

        let cmd = `'${picotoolPath}' load ${params.join(" ")} '${firmwareFilepath}'`;
        
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

}

export default Flasher;