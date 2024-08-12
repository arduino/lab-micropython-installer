const os = require('os');
const path = require('path');

const platform = os.platform();
const architecture = os.arch();

const applicationNames = {
  'darwin': 'MicroPython-Installer',
  'win32': 'MicroPython-Installer',
  'linux': 'micropython-installer'
};

const applicationName = applicationNames[platform];
let filesToExclude = [];

switch (platform) {
  case 'win32':
    filesToExclude = ["(\/firmware-flash\/bin\/linux$)",
                      "(\/firmware-flash\/bin\/darwin$)",
                      "(\/@serialport\/bindings-cpp\/prebuilds\/android.*)",
                      "(\/@serialport\/bindings-cpp\/prebuilds\/darwin.*)",
                      "(\/@serialport\/bindings-cpp\/prebuilds\/linux.*)"
                    ];
    break;
  case 'darwin':
    filesToExclude = ["\/firmware-flash\/bin\/linux$", 
                      "\/firmware-flash\/bin\/win32$",
                      "\/@serialport\/bindings-cpp\/prebuilds\/android.*",
                      "\/@serialport\/bindings-cpp\/prebuilds\/linux.*",
                      "\/@serialport\/bindings-cpp\/prebuilds\/win32.*",
                    ];
    break;
  default:
    filesToExclude = ["(\/firmware-flash\/bin\/darwin$)", 
                      "(\/firmware-flash\/bin\/win32$)",
                      "(\/@serialport\/bindings-cpp\/prebuilds\/darwin.*)",
                      "(\/@serialport\/bindings-cpp\/prebuilds\/android.*)",
                      "(\/@serialport\/bindings-cpp\/prebuilds\/win32.*)",
                    ];
    break;
}

// Source code of firmware-flash is not needed as it's already installed as a dependency
filesToExclude.push("^\/firmware-flash");

const distributableRenamingRules = {
  "darwin": { from: 'darwin', to: 'macOS' },
  "win32": { from: 'Setup', to: 'Windows-Setup' },
  "linux": { from: 'amd64', to: 'Linux' }
};

// Check options at https://electron.github.io/electron-packager/main/interfaces/electronpackager.options.html
module.exports = {
  hooks: {
    postMake: async (forgeConfig, results) => {
      const fs = require('fs');

      for(let result of results) {
        result.artifacts.forEach((artifact, index) => {  
          const fileName = path.basename(artifact);          
          const renameRule = distributableRenamingRules[result.platform];
          
          if(!fileName.includes(renameRule.from)) {
            return;
          }
          const targetName = fileName.replace(renameRule.from, renameRule.to);
          console.log(`Renaming ${fileName} to ${targetName}`);
          const targetPath = path.join(path.dirname(artifact), targetName);

          try {
            fs.renameSync(artifact, targetPath);
            result.artifacts[index] = targetPath;
          } catch (err) {
            console.error(err);
          }
        });
      }
      return results;
    }
  },
  packagerConfig: {
    icon: './assets/app-icon',
    name: applicationName, // Name cannot contain spaces because gyp doesn't support them
    arch: 'all',
    ignore: filesToExclude,
    prune: true,
    derefSymlinks: true,
    protocols: [ {
      name: 'micropython-installer',
      schemes: ['micropython-installer']
    }],
    // osxUniversal: {
    //   outAppPath: './out/' + applicationName + '-darwin-universal.app',
    // },
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      const fs = require('fs');
      const path = require('path');
      
      // UPDATE: Seems to be no longer needed, keeping it for reference
      // Remove files under node_modules/@serialport/bindings-cpp/build/node_gyp_bins/
      // because the cause notarization issues and they are not needed after building.
      // One of the files is a symlink to python which is outside of the app bundle.
      // SEE: https://github.com/nodejs/node-gyp/issues/2713#issuecomment-1400959609
      const serialportNodeGypBinsDir = path.join(buildPath, 'node_modules/firmware-flash/node_modules/@serialport/bindings-cpp/build/node_gyp_bins/');

      // UPDATE: Seems to be no longer needed, keeping it for reference
      // Remove files under node_modules/@serialport/bindings-cpp/prebuilds/
      // because they are not needed after building and they cause code signing issues under Windows.
      // signtool.exe would e.g. try to sign android-arm\node.napi.armv7.node which will in fail.
      const nodeGypPrebuildsDir = path.join(buildPath, 'node_modules/firmware-flash/node_modules/@serialport/bindings-cpp/prebuilds/');
      
      // Remove files under node_modules/usb/build/node_gyp_bins/
      // because the cause notarization issues and they are not needed after building.
      // One of the files is a symlink node_gyp_bins/python3 which points outside of the app bundle.
      const usbNodeGypBinsDir = path.join(buildPath, 'node_modules/usb/build/node_gyp_bins/');
      
      // Remove files under node_modules\usb\prebuilds because they are not needed after building and they cause code signing issues under Windows.
      // signtool.exe would e.g. try to sign android-arm\node.napi.armv7.node which will in fail.
      const usbPrebuildsDir = path.join(buildPath, 'node_modules/usb/prebuilds/');

      // Remove temporary build files of usb module to speed up code signing under macOS
      const usbObjectsDir = path.join(buildPath, 'node_modules/usb/build/Release/obj.target/');

      [usbNodeGypBinsDir, usbPrebuildsDir, usbObjectsDir].forEach(dir => {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true });
        }
      });

      callback();
    }],
    osxSign: {
      app: './out/' + applicationName + '-darwin-' + architecture + '/' + applicationName + '.app',
      optionsForFile: (filePath) => {
        return {
          entitlements: './config/entitlements.plist'
        }
      },
      keychain: process.env.KEYCHAIN_PATH
    },
    osxNotarize: process.env.APPLE_API_KEY_PATH ? {
      tool: 'notarytool',
      appPath: './out/' + applicationName + '-darwin-' + architecture + '/' + applicationName + '.app',
      appleApiKey: process.env.APPLE_API_KEY_PATH,
      appleApiKeyId: process.env.APPLE_API_KEY_ID,
      appleApiIssuer: process.env.APPLE_API_ISSUER,
    } : undefined,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        loadingGif: './assets/installer.gif',
        // See: https://js.electronforge.io/interfaces/_electron_forge_maker_squirrel.InternalOptions.WindowsSignOptions.html
        // See: https://www.npmjs.com/package/@electron/windows-sign
        signWithParams : process.env.WINDOWS_CERTIFICATE_FILE ? [
          '/d', '\"MicroPython Installer\"',
          '/f', `\"${process.env.WINDOWS_CERTIFICATE_FILE}\"`,
          '/csp', '\"eToken Base Cryptographic Provider\"',
          '/kc', `\"[{{${process.env.WINDOWS_CERTIFICATE_PASSWORD}}}]=${process.env.WINDOWS_CERTIFICATE_CONTAINER}\"`,
          '/fd', '\"sha256\"',
          '/tr', '\"http://timestamp.digicert.com\"',
          '/td', '\"SHA256\"',
          // '/v' // Verbose output
        ].join(' ') : undefined
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
