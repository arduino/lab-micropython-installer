# Author: Sebastian Romero https://github.com/sebromero/

import subprocess
import json
import platform
import shutil
import urllib.request
import os
import tempfile
import time

# Add the lib folder to the path
import sys, inspect
currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
binarydir = os.path.join(currentdir, 'lib')
sys.path.insert(0, binarydir)

import serial
import serial.tools.list_ports

SOFT_DEVICE_FIRMWARE_FILENAME = "Nano33_updateBLandSoftDevice.bin"

ARDUINO_VENDOR_ID = "0x2341"
RASPERRY_PI_VENDOR_ID = "0x2e8a"

PORTENTA_H7_BL_PID = "0x035b"
PORTENTA_H7_ARDUINO_PID = "0x025b"
PORTENTA_H7_MP_PID = "0x055b"
PORTENTA_H7_OMV_PID = "0x045b"

NANO_33_BLE_BL_PID = "0x005a"
NANO_33_BLE_ARDUINO_PID = "0x805a"
NANO_33_BLE_UPYTHON_OFFSET = "0x16000"

NANO_RP2040_OMV_PID = "0x015e"
NANO_RP2040_ARDUINO_PID = "0x005e"
NANO_RP2040_MP_PID = "0x025e"
RP2040_BL_PID = "0x0003"


# Returns a list of connected USB devices
# TODO consider using pyusb instead of system commands
def get_connected_usb_devices():
    system = platform.system()
    devices = []

    if system == "Darwin":
        cmd = "system_profiler SPUSBDataType -json 2>/dev/null"
        output = subprocess.check_output(cmd, shell=True)
        for bus in json.loads(output)["SPUSBDataType"]:
            if bus.get("_items") is None:
                continue

            for item in bus.get("_items"):
                device = {}
                device["vendor_id"] = item.get("vendor_id", "")
                device["product_id"] = item.get("product_id", "")
                device["manufacturer"] = item.get("manufacturer", "")
                device["name"] = item.get("_name", "")
                for medium in item.get("Media", []):
                    for volume in medium.get("volumes", []):
                        if volume.get("mount_point", ""):
                            device["mount_point"] = volume["mount_point"]
                devices.append(device)
    elif system == "Linux":
        cmd = "lsusb -t"
        output = subprocess.check_output(cmd, universal_newlines=True)
        usb_data = output.decode("utf-8")
        for line in usb_data.splitlines():
            if "DeviceDesc=" in line:
                device = {}
                device["vendor_id"] = line.split()[3].split(":")[0]
                device["product_id"] = line.split()[3].split(":")[1]
                device["name"] = line.split()[2].split("=")[1]
                devices.append(device)    
    else:
        raise Exception("Unsupported platform: " + platform.system())

    return devices

# Returns device information for a given vendor and product ID
def get_device(vendor_id, product_id):
    connected_devices = get_connected_usb_devices()
    for device in connected_devices:
        if device['vendor_id'] == vendor_id and device['product_id'] == product_id:
            return device
    return None

# Returns the connected devices from a given list of vendor and product ID pairs
def get_connected_devices(vendor_product_ids):
    connected_devices = get_connected_usb_devices()
    connected_devices = list(filter(lambda x: (x['vendor_id'], x['product_id']) in vendor_product_ids, connected_devices))
    return connected_devices

# Gets the serial port for a given VID and PID
def get_serial_port(vendor_id, product_id):
    # Remove '0x' from the beginning of the strings if they are there
    product_id = product_id[2:] if product_id.startswith("0x") else product_id
    vendor_id = vendor_id[2:] if vendor_id.startswith("0x") else vendor_id

    ports = list(serial.tools.list_ports.grep(f"(?i){vendor_id}:{product_id}"))
    if len(ports) == 0:
        return None
    elif len(ports) > 1:
        print(f"Warning: Found {len(ports)} ports for PID {product_id} and VID {vendor_id}. Using the first one.")
    return str(ports[0].device)

# Waits for a USB device's mass storage to become available
def wait_for_storage_device(vendor_id, product_id):
    print("⌛️ Waiting for the device to become available...")
    while True: 
        device = get_device(vendor_id, product_id)    
        if not device or not device.get('mount_point'):
            print(".", end="", flush=True)
            time.sleep(1)
            continue
        break
    print("")

# Waits for a device to become available as a serial port
def wait_for_device_serial_port(vendor_id, product_id):
    print("⌛️ Waiting for the device to become available...")
    while not get_serial_port(vendor_id, product_id):
        print(".", end="", flush=True)
        time.sleep(1)
    print("")

# Flashes the latest firmware for a given board by copying the file to its mount point
def copy_file_to_device(file_path, mount_point):
    shutil.copy2(file_path, mount_point)
    #print(f"File {file_path} copied to {destination_device['name']}.")

# Returns the latest firmware download URL for a given board
def get_firmware_url(board_name, file_extension):
    print(f"🔍 Finding latest firmware for board '{board_name}' ...")

    # URL of the JSON file
    json_url = "https://downloads.arduino.cc/micropython/index.json"

    # Fetch the JSON data
    with urllib.request.urlopen(json_url) as response:
        data = json.loads(response.read().decode())

    # Find the board with the given name
    boards = list(filter(lambda x: x["name"] == board_name, data["boards"]))

    if not boards:
        return None
    else:
        board_data = boards[0]

        # Find the first release that matches the desired file extension
        for release in board_data["releases"]:
            if release["url"].endswith(file_extension):
                release_data = release
                break

        download_url = "https://downloads.arduino.cc" + release_data["url"]
        return download_url

# Downloads a file from a given URL
def download_file(url):
    print(f"🌐 Downloading file {url} ...")

    # Extract the file name from the URL
    file_name = url.split("/")[-1]

    # Create a temporary directory to save the file
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file_name)

    # Download the file and save it to disk
    with urllib.request.urlopen(url) as response, open(file_path, "wb") as f:
        f.write(response.read())

    return file_path

# Runs the dfu-util command to flash the firmware
def run_dfu_util(firmware_filepath, vendor_id, product_id, reset=True):
    folder = platform.system()
    script_dir = os.path.dirname(os.path.realpath(__file__))
    dfu_util_path = os.path.join(script_dir, 'bin', folder, 'dfu-util')
    cmd = [dfu_util_path, '-a', '0', '-d', f'{vendor_id}:{product_id}', '-D', firmware_filepath]
    if reset:
        # FIXME doesn't seem to have an effect
        cmd.append('-R')    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running dfu-util: {result.stderr}")
    else:
        print(result.stdout)
    return result.returncode == 0

# Runs the bossac command to flash the firmware
def run_bossac(firmware_filepath, port=None, offset=None):
    folder = platform.system()
    script_dir = os.path.dirname(os.path.realpath(__file__))
    bossac_path = os.path.join(script_dir, 'bin', folder, 'bossac')
    cmd = [bossac_path, '-i', '-d', '-e', '-w', '-R']
    if port:
        cmd.append('-U')
        cmd.append(f'--port={port}')
    if offset:
        cmd.append(f'--offset={offset}')
    cmd.append(firmware_filepath)

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running bossac: {result.stderr}")
    else:
        print(result.stdout)
    return result.returncode == 0

# Flashes the soft device firmware using bossac
def flash_soft_device(port=None):
    script_dir = os.path.dirname(os.path.realpath(__file__))
    firmware_path = os.path.join(script_dir, 'bin', "firmware", SOFT_DEVICE_FIRMWARE_FILENAME)
    return run_bossac(firmware_path, port)

# Puts supported boards in bootloader mode by sending a 1200bps touch
def perform_1200_touch(port):
    # Consider using pyserial instead of stty
    # ser = serial.Serial(port, baudrate=1200)
    # ser.close()

    if platform.system() == 'Linux':
        stty_cmd = ['stty', '-F', port, '1200']
    elif platform.system() == 'Darwin':
        stty_cmd = ['stty', '-f', port, '1200']
    else:
        raise OSError('Unsupported operating system: ' + platform.system())
    subprocess.run(stty_cmd)  # open the serial port
    subprocess.run(stty_cmd[:3] + ['0'])  # close the serial port

# Function to get user confirmation
def get_confirmation(prompt="Continue?"):
    while True:
        print(f"{prompt} [y/n]")
        answer = input().lower()
        if answer == "y":
            return True
        elif answer == "n":
            return False

if __name__ == "__main__":    

    # TODO add selection of board if multiple are connected
    # get_connected_devices()


    # TODO put board in bootloader mode automatically
    if get_device(ARDUINO_VENDOR_ID, NANO_33_BLE_ARDUINO_PID):
        print("👀 Arduino Nano 33 BLE detected.")
        print("👉 Put it in bootloader mode and run this script again.")
        print("📚 Read how to do this here: https://docs.arduino.cc/tutorials/portenta-h7/micropython-installation")
        exit()

    if get_device(ARDUINO_VENDOR_ID, NANO_33_BLE_BL_PID):
        print("👀 Arduino Nano BLE in bootloader mode detected.")
        wait_for_device_serial_port(ARDUINO_VENDOR_ID, NANO_33_BLE_BL_PID)
        print("⌛️ Downloading SoftDevice firmware to device. Please wait...")
        device_port = get_serial_port(ARDUINO_VENDOR_ID, NANO_33_BLE_BL_PID)
        
        if flash_soft_device(device_port):
            print("✅ Done downloading SoftDevice firmware!")
            # TODO check why it doesn't reset automatically
            print("👇 Reset the board to flash the SoftDevice firmware.")
            get_confirmation()

            print("🔥 Flashing SoftDevice. DO NOT RESET/UNPLUG THE BOARD! Please wait...")
            time.sleep(10) # Wait for the SoftDevice firmware to be flashed
            
            print("✅ Done. Putting the board in bootloader mode...")            
            perform_1200_touch(device_port)            
            wait_for_device_serial_port(ARDUINO_VENDOR_ID, NANO_33_BLE_BL_PID)
            
            device_port = get_serial_port(ARDUINO_VENDOR_ID, NANO_33_BLE_BL_PID)
            firmware_url = get_firmware_url("arduino_nano_33_ble_sense", ".bin")
            file = download_file(firmware_url)
            if file:
                print("🐍 Flashing micropython...")
                run_bossac(file, device_port, NANO_33_BLE_UPYTHON_OFFSET)
                print("🎉 Done! Reset the board to start using MicroPython.")
        else:
            print("❌ Failed to flash SoftDevice.")
        exit()

    if get_device(ARDUINO_VENDOR_ID, NANO_RP2040_OMV_PID) or get_device(ARDUINO_VENDOR_ID, NANO_RP2040_MP_PID):
        print("👀 Arduino Nano RP2040 Connect detected.")
        print("👉 Put it in bootloader mode and run this script again.")
        print("📚 Read how to do this here: https://docs.arduino.cc/tutorials/nano-rp2040-connect/micropython-installation")
        exit()

    if get_device(ARDUINO_VENDOR_ID, NANO_RP2040_ARDUINO_PID):
        print("👀 Arduino Nano RP2040 Connect detected. Putting it in bootloader mode...")
        perform_1200_touch(get_serial_port(ARDUINO_VENDOR_ID, NANO_RP2040_ARDUINO_PID))        
        wait_for_storage_device(RASPERRY_PI_VENDOR_ID, RP2040_BL_PID)

    device = get_device(RASPERRY_PI_VENDOR_ID, RP2040_BL_PID)
    if device:
        print("👀 RP2040 detected.")
        firmware_url = get_firmware_url("ARDUINO_NANO_RP2040_CONNECT", ".uf2")
        file = download_file(firmware_url)
        if file:
            print("🐍 Flashing micropython...")
            copy_file_to_device(file, device['mount_point'])
            print("🎉 Done!")
        exit()

    if get_device(ARDUINO_VENDOR_ID, PORTENTA_H7_MP_PID):
        print("👀 Arduino Portenta H7 running uPython detected.")
        print("👉 Put it in bootloader mode and run this script again.")
        print("📚 Read how to do this here: https://docs.arduino.cc/tutorials/portenta-h7/micropython-installation")
        exit()

    if get_device(ARDUINO_VENDOR_ID, PORTENTA_H7_ARDUINO_PID):
        print("👀 Arduino Portenta H7 detected. Putting it in bootloader mode...")
        perform_1200_touch(get_serial_port(ARDUINO_VENDOR_ID, PORTENTA_H7_ARDUINO_PID))        
        wait_for_device_serial_port(ARDUINO_VENDOR_ID, PORTENTA_H7_BL_PID)

    if get_device(ARDUINO_VENDOR_ID, PORTENTA_H7_OMV_PID):
        print("👀 Arduino Portenta H7 running OpenMV detected. Putting it in bootloader mode...")
        perform_1200_touch(get_serial_port(ARDUINO_VENDOR_ID, PORTENTA_H7_OMV_PID))        
        wait_for_device_serial_port(ARDUINO_VENDOR_ID, PORTENTA_H7_BL_PID)

    device = get_device(ARDUINO_VENDOR_ID, PORTENTA_H7_BL_PID)
    if device:
        print("👀 Arduino Portenta H7 in bootloader mode detected.")
        firmware_url = get_firmware_url("ARDUINO_PORTENTA_H7", ".dfu")
        file = download_file(firmware_url)
        if file:
            print("🐍 Flashing MicroPython...")
            if run_dfu_util(file, ARDUINO_VENDOR_ID, PORTENTA_H7_BL_PID):
                # TODO check why manual reset is needed
                print("🎉 Done! Now restart the board by pressing the reset button.")
            else:
                print("🚨 Error flashing MicroPython.")
        exit()

    print("🤷 No compatible device detected.")
