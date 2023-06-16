const os = require('os');

let filesToExclude = [];
switch (os.platform()) {
  case 'win32':
    filesToExclude = ["(\/firmware-flash\/bin\/linux$)", "(\/firmware-flash\/bin\/darwin$)"];
    break;
  case 'darwin':
    filesToExclude = ["(\/firmware-flash\/bin\/linux$)", "(\/firmware-flash\/bin\/win32$)"];
    break;
  default:
    filesToExclude = ["(\/firmware-flash\/bin\/darwin$)", "(\/firmware-flash\/bin\/win32$)"];
    break;
}

// Source code of firmware-flash is not needed as it's already installed as a dependency
filesToExclude.push("^\/firmware-flash");

module.exports = {
  packagerConfig: {
    icon: './assets/app-icon',
    name: 'MicroPython Installer',
    executableName: 'micropython-installer',
    ignore: filesToExclude,
    prune: true,
    derefSymlinks: true,
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      const fs = require('fs');
      const path = require('path');
      // Remove files under node_modules/@serialport/bindings-cpp/build/node_gyp_bins/
      // because the cause notarization issues and they are not needed after building.
      // One of the files is a symlink to python which is outside of the app bundle.
      // SEE: https://github.com/nodejs/node-gyp/issues/2713#issuecomment-1400959609
      const nodeGypBinsDir = path.join(buildPath, 'node_modules/firmware-flash/node_modules/@serialport/bindings-cpp/build/node_gyp_bins/');
      // Remove files under node_modules/@serialport/bindings-cpp/prebuilds/
      // because they are not needed after building and they cause code signing issues under Windows.
      // signtool.exe would e.g. try to sign android-arm\node.napi.armv7.node which will in fail.
      const nodeGypPrebuildsDir = path.join(buildPath, 'node_modules/firmware-flash/node_modules/@serialport/bindings-cpp/prebuilds/');
      
      [nodeGypBinsDir, nodeGypPrebuildsDir].forEach(dir => {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true });
        }
      });

      callback();
    }],
    osxSign: {
      app: './out/MicroPython Installer-darwin-x64/MicroPython Installer.app',
      optionsForFile: (filePath) => {
        return {
          entitlements: './config/entitlements.plist'
        }
      },
      keychain: process.env.KEYCHAIN_PATH
    },
    osxNotarize: process.env.APPLE_API_KEY_PATH ? {
      tool: 'notarytool',
      appPath: './out/MicroPython Installer-darwin-x64/MicroPython Installer.app',
      appleApiKey: process.env.APPLE_API_KEY_PATH,
      appleApiKeyId: process.env.APPLE_API_KEY_ID,
      appleApiIssuer: process.env.APPLE_API_ISSUER,
    } : undefined
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
    },
  ],
  publishers: [
    {
      "name": "@electron-forge/publisher-github",
      "config": {
        "repository": {
          "owner": "arduino",
          "name": "lab-micropython-installer"
        }
      }
    }
  ]
};
