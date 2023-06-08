const os = require('os');

let filesToExclude;
switch (os.platform()) {
  case 'win32':
    filesToExclude = ["^(\/firmware-flash\/bin\/linux$)", "^(\/firmware-flash\/bin\/darwin$)"];
    break;
  case 'darwin':
    filesToExclude = ["^(\/firmware-flash\/bin\/linux$)", "^(\/firmware-flash\/bin\/win32$)"];
    break;
  default:
    filesToExclude = ["^(\/firmware-flash\/bin\/darwin$)", "^(\/firmware-flash\/bin\/win32$)"];
    break;
}

module.exports = {
  packagerConfig: {
    icon: './assets/app-icon',
    name: 'MicroPython Installer',
    executableName: 'micropython-installer',
    ignore: filesToExclude,
    prune: true,
    osxSign: {
      app: './out/MicroPython Installer-darwin-x64/MicroPython Installer.app',
      optionsForFile: (filePath) => {
        return {
          entitlements: './config/entitlements.plist'
        }
      },
      keychain: process.env.KEYCHAIN_PATH
    },
    osxNotarize: process.env.APPLE_API_KEY ? {
      tool: 'notarytool',
      appleApiKey: process.env.APPLE_API_KEY,
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
