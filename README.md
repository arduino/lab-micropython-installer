# 🐍 MicroPython Installer for Arduino

MicroPython Installer for Arduino is a cross-platform tool that streamlines the process of downloading and installing MicroPython firmware on compatible Arduino boards. It is compatible with macOS, Linux, and Windows and is built using the Electron framework.

## ✨ Features
- Automatic download of MicroPython firmware.
- Seamless installation process onto Arduino boards.
- Cross-platform support (macOS, Linux, Windows).

## 💻 System Requirements
There are no special system requirements for this tool beyond the prerequisites for running Electron applications.

## 👀 Usage
Connect your Arduino board to your computer.
Launch the application.
Follow the on-screen prompts to download and install the MicroPython firmware.

## ✅ Supported Boards
- Arduino Portenta H7
- Arduino Portenta C33
- Arduino Nicla Vision
- Arduino Giga
- Arduino Nano RP2040
- Arduino Nano ESP32
- Arduino Nano 33 BLE

## 🙅 Limitations

- The Arduino Nano RP2040 and Portenta C33 are not detected when in bootloader mode. This is because the bootloader doesn't expose a serial port but this tool relies on it to detect boards. Therefore make sure that the board is not in bootloader mode when you run the application.

## ⚙️ Installation

You can download the binary for your operating system from the [release page](https://github.com/arduino/lab-micropython-installer/releases).

> ⚠️ Windows users may have to first install the drivers for their board to be able to install MicroPython with this tool. The easiest way is to install the corresponding Arduino core via Arduino IDE or Arduino CLI. [Here](https://docs.arduino.cc/software/ide-v2/tutorials/ide-v2-board-manager) are detailed instructions on how to do this.

## 🚑 Troubleshooting

- If you get an error message such as "No DFU capable device found" make sure you install the drivers for the board first if you're on Windows. On Linux you may need to adjust the udev rules.
- If in the log files you see that the tool is sending a REPL command to the board but doesn't get a response (hangs), please double check if you have either a tool on your computer running that occupies the serial port. It's also possible that your board is running a MicroPython script that occupies the serial port (check boot.py and main.py).

## 🐛 Reporting Issues
If you encounter any issue, please open a bug report [here](https://github.com/arduino/lab-micropython-installer/issues). Please also add all generated log output to your issue. To get that, you need to launch the tool from the command line:
- macOS: `"/Applications/MicroPython Installer.app/Contents/MacOS/micropython-installer"`
- Windows: `micropython-installer.exe | echo`
- Linux: `micropython-installer`

You may need to adjust the path depending on where the tool is installed on your system.

## 🧑‍💻 Developer Installation

```bash
# Clone this repository
git clone https://github.com/arduino/lab-micropython-installer.git

# Go into the repository
cd micropython-installer-arduino

# Install dependencies
npm install

# Run the app
npm run start
```

## 📦 Packaging

The packaging is done via Electron Forge. The configuration can be found in [forge.config.js](./forge.config.js). To package the app, run:

```bash
npm run make # Creates a ready-to-run application
# or
npm run package # Creates a distributable file bundle
```

## 📣 Publishing

The CI takes care of making new releases. All that needs to be done is to bump the version with `npm version patch`, `npm version minor` or `npm version major` and push the tags with `git push --follow-tags`. 
When the CI is done the release will be in draft state so you can add release notes and publish it.

To do a development release, you can run e.g. `npm version preminor --preid=beta` to create a new minor version of the tool that contains the given suffix (e.g. v1.1.9-beta). For each successor development version you can run `npm version prerelease` which bumps the "beta" version to the next number (e.g. v1.1.0-beta.2).

To manually publish a new version (if you really need to), run:

```bash
npm run publish
```

## 🫶 Adding Support for Other Boards
To add support for additional boards a few changes / additions may be required:
- Add a descriptor for the device to [descriptors.js](./firmware-flash/logic/descriptors.js). The descriptor contains the VID and PID of the board plus some instructions on how to flash a firmware.
- If the board requires a flashing tool other than the ones already supported, it needs to be added to [firmware-flash/bin](./firmware-flash/bin/) and the corresponding Node.js binding needs to be added to [flasher.js](./firmware-flash/logic/flasher.js)
- An SVG asset of the board needs to be added to [assets/boards](./assets/boards/). The filename will be derived from the board manufacturer and product name in the descriptor.

## 💪 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 🤙 Contact
For questions, comments, or feedback about this tool, please create an issue on this repository.
