const installButton = document.getElementById('install-button');
const chooseFileLink = document.getElementById('choose-file-link');
const outputElement = document.getElementById('output');
const fileDropElement = document.getElementById('file-drop-area');
const flashActivityIndicator = document.getElementById('activity-indicator');
const usePreviewBuildCheckbox = document.getElementById('preview-builds-enabled');
const deviceLoadingActivityIndicator = document.getElementById("device-loading-indicator");
const deviceLoadingHint = document.getElementById("device-loading-hint");
const reloadLinkContainer = document.getElementById("reload-link-container");
const deviceSelectionList = document.querySelector(".item-selection-list");
const reloadDeviceListLink = document.getElementById("reload-link");

const statusTextAnimator = new StatusTextAnimator(outputElement);

const showErrorInStatusText = (err, timeout = 4000) => {
  setTimeout(() => {
    // Extract relevant part of the error message 
    const regex = /Error [a-zA-Z\s]+ '(?:.+)': (?:Error: )?(.+)/;
    const match = regex.exec(err.message);
    if(match) {
      statusTextAnimator.showStatusText(match[1], 5000);
    } else {
      statusTextAnimator.showStatusText(err.message, 5000);
    }
  }, timeout);
};

const showDialogMessageBox = (title, message) => {
  const dialogConfig = {title: title, message: message};
  // Use dialog function exposed by preload.js
  electron.openDialog('showMessageBox', dialogConfig);
};

const flashFirmwareFromFile = (filePath) => {
    disableFlashingInteractions();
    disableDeviceListInteractions();
    showFlashProgressIndicator();

    const data = {
      deviceData : getSelectedDeviceData(deviceSelectionList),
      filePath : filePath
    };

    window.api.invoke('on-custom-install', data).then(function (result) {
        console.log(result);
        statusTextAnimator.clearStatusText();
        showDialogMessageBox("Success", result);
        disableFlashingInteractions();
        // Give the device some time to reboot
        refreshDeviceList(2000);
    }).catch(function (err) {
        console.error(err);
        showErrorInStatusText(err);        
    }).finally(() => {
        enableDeviceListInteractions();
        enableFlashingInteractions();
        hideFlashProgressIndicator();
    });
};


function disableDeviceListInteractions() {
  reloadDeviceListLink.style.pointerEvents = 'none';
  reloadDeviceListLink.style.opacity = 0.25;

  // Disable all buttons in the device selection list
  const deviceItems = deviceSelectionList.querySelectorAll(".selection-item");
  deviceItems.forEach((item) => {
    item.disabled = true;
  });
}

function enableDeviceListInteractions() {
  reloadDeviceListLink.style.pointerEvents = 'auto';
  reloadDeviceListLink.style.opacity = 1;

   // Enable all buttons in the device selection list
   const deviceItems = deviceSelectionList.querySelectorAll(".selection-item");
   deviceItems.forEach((item) => {
       item.disabled = false;
   });
}

function enableFlashingInteractions() {
    usePreviewBuildCheckbox.disabled = false;
    installButton.disabled = false;
    installButton.style.opacity = 1;
    fileDropElement.style.opacity = 1;
    fileDropElement.style.pointerEvents = 'auto';
}

function disableFlashingInteractions() {
    usePreviewBuildCheckbox.disabled = true;
    installButton.disabled = true;
    installButton.style.opacity = 0.25;
    fileDropElement.style.opacity = 0.25;
    fileDropElement.style.pointerEvents = 'none';
}
  
function showFlashProgressIndicator() {
  flashActivityIndicator.style.display = 'inline-block';
}

function hideFlashProgressIndicator() {
  flashActivityIndicator.style.display = 'none';
}

window.api.on('on-output', (message) => {
    statusTextAnimator.showStatusText(message);
});

reloadDeviceListLink.addEventListener('click', () => {
    disableFlashingInteractions();
    refreshDeviceList();
});

chooseFileLink.addEventListener('click', () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");    
    input.onchange = async (event) => {
        // Get the selected file from the input element
        const file = event.target.files[0];
        flashFirmwareFromFile(file.path);
    };
    input.click();
    return false;
});
      

installButton.addEventListener('click', () => {
    disableFlashingInteractions();
    disableDeviceListInteractions();
    showFlashProgressIndicator();
    const data = {
      deviceData : getSelectedDeviceData(deviceSelectionList),
      usePreviewBuild : usePreviewBuildCheckbox.checked
    };

    window.api.invoke('on-install', data)
        .then((result) => {
            console.log(result);
            statusTextAnimator.clearStatusText();
            showDialogMessageBox("Success", result);
            disableFlashingInteractions();
            // Give the device some time to reboot
            refreshDeviceList(2000);
        })
        .catch((err) => {
            console.error(err);
            showErrorInStatusText(err);
        }).finally(() => {
            enableDeviceListInteractions();
            enableFlashingInteractions();
            hideFlashProgressIndicator();
        });
});

fileDropElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileDropElement.classList.add('file-drop-hovered');
});

fileDropElement.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileDropElement.classList.remove('file-drop-hovered');
});

fileDropElement.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    fileDropElement.classList.remove('file-drop-hovered');

    let filePaths = [];
    for (const f of event.dataTransfer.files) {
        // Using the path attribute to get absolute file path
        filePaths.push(f.path);
    }

    if(filePaths.length > 1) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    flashFirmwareFromFile(filePaths[0]);
});


function selectDevice(deviceItem) {
  const container = deviceItem.parentElement;
  const previousSelectedElement = container.querySelector(".selected");

  if (previousSelectedElement !== null) {
      previousSelectedElement.classList.remove("selected");
  }

  deviceItem.classList.add("selected");
  deviceItem.dispatchEvent(new Event("device-selected", { bubbles: true }));
}

function getSelectedDeviceData(container) {
  const selectedElement = container.querySelector(".selected");
  
  if(!selectedElement) {
    return null;
  }

  return {
    vendorID: parseInt(selectedElement.dataset.vid),
    productID: parseInt(selectedElement.dataset.pid)
  };
}

function createDeviceSelectorItem(device) {
  const fullDeviceName = device.manufacturer + " " + device.name;
  const deviceItem = document.createElement("button");
  deviceItem.classList.add("selection-item");

  // Populate the device item with data attributes so that we can easily access them later
  // when the user selects a device and we need to flash the firmware
  deviceItem.setAttribute("data-vid", device.vendorID);
  deviceItem.setAttribute("data-pid", device.productID);
  deviceItem.addEventListener("click", () => {
    selectDevice(deviceItem);    
  });

  const deviceImage = document.createElement("img");
  deviceImage.setAttribute("src", "./assets/boards/" + fullDeviceName + ".svg");
  deviceItem.appendChild(deviceImage);

  const deviceLabel = document.createElement("span");
  deviceLabel.classList.add("selection-item-label");
  deviceLabel.textContent = fullDeviceName;
  deviceItem.appendChild(deviceLabel);

  return deviceItem;
}

function showDeviceLoadingIndicator() {
  deviceLoadingActivityIndicator.style.display = 'block';
  setTimeout(() => {
    deviceLoadingHint.style.opacity = 1;
  }, 4000);
}

function hideDeviceLoadingIndicator() {
  deviceLoadingActivityIndicator.style.display = 'none';
  deviceLoadingHint.style.opacity = 0;
}

function refreshDeviceList(delay = 0) {
  // Clear the device list
  displayDevices([], deviceSelectionList);

  if(delay > 0) {
    // Calls itself after a delay
    setTimeout(refreshDeviceList, delay);
    return;
  }

  showDeviceLoadingIndicator();

  window.api.invoke('on-get-devices').then((result) => {
    if(result.length == 0) {
      console.log("🤷 No devices found. Trying again in 4 seconds.");
      // Try again in 4 seconds if no devices were found
      setTimeout(refreshDeviceList, 4000);
    } else {
      displayDevices(result, deviceSelectionList);
      hideDeviceLoadingIndicator();
    }
  }).catch((err) => {
    console.error(err);
  });
}

function displayDevices(deviceList, container) {
  
  // Sort the device list by manufacturer name and device name
  deviceList.sort((deviceA, deviceB) => {
    const deviceAName = deviceA.manufacturer + deviceA.name;
    const deviceBName = deviceB.manufacturer + deviceB.name;
    return deviceAName.localeCompare(deviceBName);
  });

  // Clear the device list
  container.innerHTML = "";

  reloadLinkContainer.style.display = deviceList.length > 0 ? 'block' : 'none';

  for (const device of deviceList) {
    container.appendChild(createDeviceSelectorItem(device));
  }
    

  // If there is only one device, select it
  if(deviceList.length == 1) {
    selectDevice(container.firstElementChild);
  }

}

window.addEventListener('DOMContentLoaded', () => {
  deviceSelectionList.addEventListener("device-selected", (event) => {
    enableFlashingInteractions();
  });
  
  disableFlashingInteractions();
  refreshDeviceList();
});
