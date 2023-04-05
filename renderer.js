const installButton = document.getElementById('install-button');
const chooseFileLink = document.getElementById('choose-file-link');
const outputElement = document.getElementById('output');
const fileDropElement = document.getElementById('file-drop-area');
const loaderElement = document.querySelector('.loader-ring');
const deviceSelectionList = document.getElementById("device-selection-list");

const flashFirmwareFromFile = (filePath) => {
    disableUserInteraction();
    showLoadingIndicator();

    window.api.invoke('on-file-selected', filePath).then(function (result) {
        console.log(result);
        showStatusText(result, outputElement, 5000);
    }).catch(function (err) {
        console.error(err);
        setTimeout(() => {
            showStatusText("❌ Failed to flash firmware.", outputElement, 5000);
        }, 4000);
    }).finally(() => {
        enableUserInteraction();
        hideLoadingIndicator();
    });
};

let animationRunning = false;
let fadeOutTimeout = null;

function showStatusText(text, target, duration = null, speed = 50) {
  const statusText = target;

  if (animationRunning) {
    statusText.textContent = text;
    clearTimeout(fadeOutTimeout);
    if(duration){
        fadeOutTimeout = setTimeout(() => {
          const fadeOutInterval = setInterval(() => {
            let opacity = parseFloat(statusText.style.opacity);
            opacity -= 0.1;
            statusText.style.opacity = opacity;
            if (opacity <= 0) {
              clearInterval(fadeOutInterval);
              statusText.style.visibility = 'hidden';
              animationRunning = false;
            }
          }, speed);
        }, duration);
    }
    return;
  }
  animationRunning = true;
  statusText.textContent = text;
  statusText.style.opacity = 0;
  statusText.style.visibility = 'visible';

  let opacity = 0;
  const fadeInInterval = setInterval(() => {
    opacity += 0.1;
    statusText.style.opacity = opacity;
    if (opacity >= 1) {
      clearInterval(fadeInInterval);
      if (duration) {
        fadeOutTimeout = setTimeout(() => {
          const fadeOutInterval = setInterval(() => {
            let opacity = parseFloat(statusText.style.opacity);
            opacity -= 0.1;
            statusText.style.opacity = opacity;
            if (opacity <= 0) {
              clearInterval(fadeOutInterval);
              statusText.style.visibility = 'hidden';
              animationRunning = false;
            }
          }, speed);
        }, duration);
      } else {
        animationRunning = false;
      }
    }
  }, speed);
}

function enableUserInteraction() {
    installButton.disabled = false;
    installButton.style.opacity = 1;
    fileDropElement.style.opacity = 1;
    fileDropElement.style.pointerEvents = 'auto';

    // Enable all buttons in the device selection list
    const deviceItems = deviceSelectionList.querySelectorAll(".device-item");
    deviceItems.forEach((item) => {
        item.disabled = false;
    });
}

function disableUserInteraction() {
    installButton.disabled = true;
    installButton.style.opacity = 0.25;
    fileDropElement.style.opacity = 0.25;
    fileDropElement.style.pointerEvents = 'none';
    
    // Disable all buttons in the device selection list
    const deviceItems = deviceSelectionList.querySelectorAll(".device-item");
    deviceItems.forEach((item) => {
      item.disabled = true;
    });
  }
  
function showLoadingIndicator() {
  loaderElement.style.display = 'inline-block';
}

function hideLoadingIndicator() {
  loaderElement.style.display = 'none';
}

window.api.on('on-output', (message) => {
    showStatusText(message, outputElement);
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
    disableUserInteraction();
    showLoadingIndicator();
    
    window.api.invoke('on-install')
        .then((result) => {
            console.log(result);
            showStatusText(result, outputElement, 5000);
        })
        .catch((err) => {
            console.error(err);
            setTimeout(() => {
                showStatusText("❌ Failed to flash firmware.", outputElement, 5000);
            }, 4000);
        }).finally(() => {
            enableUserInteraction();
            hideLoadingIndicator();
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
}

function getSelectedDevice(container) {
  return container.querySelector(".selected");
}

function createDeviceSelectorItem(id, label, imageSrc) {
  const deviceItem = document.createElement("button");
  deviceItem.classList.add("device-item");
  deviceItem.setAttribute("id", id);
  deviceItem.setAttribute("data-label", label);
  deviceItem.addEventListener("click", () => {
    selectDevice(deviceItem);
    deviceItem.dispatchEvent(new Event("device-selected", { bubbles: true }));
  });

  const btnImage = document.createElement("img");
  btnImage.classList.add("device-image");
  btnImage.setAttribute("src", "./assets/boards/" + imageSrc);
  deviceItem.appendChild(btnImage);

  const deviceLabel = document.createElement("span");
  deviceLabel.classList.add("device-label");
  deviceLabel.textContent = label;
  deviceItem.appendChild(deviceLabel);

  return deviceItem;
}

function listDevices(data, container) {
  data.forEach(({ id, label, imageSrc }) => {
      container.appendChild(createDeviceSelectorItem(id, label, imageSrc));
  });
}

const deviceData = [
  {
      id: "btn1",
      label: "Arduino Nano RP2040 Connect",
      imageSrc: "arduino-nano-rp2040-connect.svg"
  },
  {
      id: "btn2",
      label: "Arduino Nicla Vision",
      imageSrc: "arduino-nicla-vision.svg"
  },
  {
      id: "btn3",
      label: "Arduino Portenta H7",
      imageSrc: "arduino-portenta-h7.svg"
  },
  {
      id: "btn4",
      label: "Arduino Nano 33 BLE",
      imageSrc: "arduino-nano-33-ble.svg"
  },
  {
      id: "btn5",
      label: "Arduino Giga R1",
      imageSrc: "arduino-giga-r1.svg"
  },
];

window.addEventListener('DOMContentLoaded', () => {
  
  disableUserInteraction();
  listDevices(deviceData, deviceSelectionList);
  
  deviceSelectionList.addEventListener("device-selected", (event) => {
    console.log(event.target.dataset.label);
    enableUserInteraction();
  });
});
