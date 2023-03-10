elif system == "Windows":
        output = subprocess.check_output("wmic path Win32_PnPEntity where \"PNPClass='USB'\" get DeviceID /value", universal_newlines=True)
        lines = output.split("\n")
        devices = []
        current_device = {}
        for line in lines:
            if line == "":
                devices.append({
                    "vendor_id": current_device["device_id"].split("&")[1].split("_")[1],
                    "product_id": current_device["device_id"].split("&")[1].split("_")[2],
                    "name": current_device["name"]
                })
                current_device = {}
            else:
                key, value = line.split("=", 1)
                if key == "DeviceID":
                    current_device["device_id"] = value
                elif key == "Name":
                    current_device["name"] = value