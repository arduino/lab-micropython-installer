const button = document.querySelector('#install-button');
const chooseFileLink = document.querySelector('#choose-file-link');
const outputElement = document.querySelector('#output');
const fileDropElement = document.querySelector('#file-drop-area');
const loaderElement = document.querySelector('.loader-ring');

const flashFirmwareFromFile = (filePath) => {
    disableUserInteraction();

    window.api.invoke('on-file-selected', filePath).then(function (result) {
        console.log(result);
        showStatusText(result, outputElement, 5000);
    }).catch(function (err) {
        console.error(err);
        setTimeout(() => {
            showStatusText("❌ Failed to flash firmware.", outputElement, 5000);
        }, 2000);
    }).finally(() => {
        enableUserInteraction();
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
    button.disabled = false;
    button.style.opacity = 1;
    loaderElement.style.display = 'none';
}

function disableUserInteraction() {
    button.disabled = true;
    button.style.opacity = 0.25;
    loaderElement.style.display = 'inline-block';
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
      

button.addEventListener('click', () => {
    disableUserInteraction();
    
    window.api.invoke('on-install')
        .then((result) => {
            console.log(result);
            showStatusText(result, outputElement, 5000);
        })
        .catch((err) => {
            console.error(err);
            setTimeout(() => {
                showStatusText("❌ Failed to flash firmware.", outputElement, 5000);
            }, 2000);
        }).finally(() => {
            enableUserInteraction();
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
