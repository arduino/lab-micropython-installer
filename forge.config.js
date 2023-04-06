module.exports = {
  packagerConfig: {
    icon: './assets/app-icon',
    name: 'MicroPython Installer',
    ignore: [
      "^(\/firmware-flash\/bin\/firmware$)",
      "^(\/firmware-flash\/bin\/linux$)",
      "^(\/firmware-flash\/bin\/win32$)",
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
