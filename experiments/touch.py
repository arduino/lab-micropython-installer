import subprocess

import platform
import subprocess

# Puts supported boards in bootloader mode by sending a 1200bps touch
def perform_1200_touch(port):
    if platform.system() == 'Linux':
        stty_cmd = ['stty', '-F', port, '1200']
    elif platform.system() == 'Darwin':
        stty_cmd = ['stty', '-f', port, '1200']
    else:
        raise OSError('Unsupported operating system: ' + platform.system())
    subprocess.run(stty_cmd)  # open the serial port
    subprocess.run(stty_cmd[:3] + ['0'])  # close the serial port

# Get the port from the command line
if __name__ == '__main__':
    import sys
    if len(sys.argv) != 2:
        print('Usage: python touch.py <port>')
        sys.exit(1)
    perform_1200_touch(sys.argv[1])