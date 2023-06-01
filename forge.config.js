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
    ignore: filesToExclude,
    prune: true
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
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
          "owner": "sebromero",
          "name": "micropython-installer"
        }
      }
    }
  ]
};
