import glob
import os

def get_serial_port(vendor_id, product_id):
    for port in glob.glob('/dev/ttyUSB*') + glob.glob('/dev/ttyACM*') + glob.glob('/dev/cu.usbmodem*') + glob.glob('/dev/cu.usbserial*'):
        try:
            with open(os.path.join('/sys/class/tty', os.path.basename(port), 'device/uevent'), 'rt') as f:
                uevent = f.read()
                if 'ID_VENDOR_ID={:04x}'.format(vendor_id) in uevent and 'ID_MODEL_ID={:04x}'.format(product_id) in uevent:
                    return port
            with open(os.path.join('/dev', os.path.basename(port)), 'rb') as f:
                data = f.read(64)
                if data.startswith(b'\x80\x80' + bytes.fromhex('{:04x}{:04x}'.format(vendor_id, product_id))):
                    return port
        except IOError:
            pass
    return None


vendor_id = 0x2341  # replace with your vendor ID
product_id = 0x005a  # replace with your product ID
port = get_serial_port(vendor_id, product_id)
if port is not None:
    print(f"Device found on port {port}")
else:
    print("Device not found")
