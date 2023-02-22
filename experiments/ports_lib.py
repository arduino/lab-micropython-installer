import os, sys, inspect
currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
parentdir = os.path.dirname(currentdir)
binarydir = os.path.join(parentdir, 'lib')
sys.path.insert(0, binarydir)

import serial
import serial.tools.list_ports


# Function to print number as hexadecimal string
def hex_string(number):
    return f"0x{number:04x}"
    
# List all ports with their VID and PID
def list_ports():
    ports = list(serial.tools.list_ports.comports())
    for port in ports:
        if port.vid is None or port.pid is None:
            continue
        print(hex_string(port.vid), hex_string(port.pid), port.device)

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


def open_and_close_serial_port(port):
    ser = serial.Serial(port, baudrate=1200)
    ser.close()
    

print(get_serial_port("0x2341", "0x045b"))
