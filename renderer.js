const button = document.querySelector('#install-button');
const chooseFileLink = document.querySelector('#choose-file-link');
const outputElement = document.querySelector('#output');
const fileDropElement = document.querySelector('#file-drop-area');
let fadeInTimeout, fadeOutTimeout;

const flashFirmwareFromFile = (filePath) => {
    window.api.invoke('on-file-selected', filePath).then(function (result) {
        console.log(result);
        showStatusText(result, outputElement, 5000);
    }).catch(function (err) {
        console.error(err);
        setTimeout(() => {
            showStatusText("❌ Failed to flash firmware.", outputElement, 5000);
        }, 1000);
    });
};

const showStatusText = (text, targetElement, duration = null, speed = 40) => {
    targetElement.textContent = text;

    if (fadeOutTimeout) {
        // If a fade-out animation is already running, clear it and hide the status text immediately
        clearTimeout(fadeOutTimeout);
        targetElement.style.opacity = 0;
        targetElement.style.visibility = 'none';
    }

    if (fadeInTimeout) {
        // If a fade-in animation is already running, update the text and return
        targetElement.textContent = text;
        return;
    }

    // If no animation is running, start the fade-in animation
    targetElement.style.opacity = 0;
    targetElement.style.visibility = 'visible';

    let opacity = 0;
    fadeInTimeout = setInterval(() => {
        opacity += 0.1;
        targetElement.style.opacity = opacity;
        if (opacity >= 1) {
            clearInterval(fadeInTimeout);
            fadeInTimeout = null;
            if(duration){
                fadeOutTimeout = setTimeout(() => {
                    let opacity = 1;
                    fadeOutTimeout = setInterval(() => {
                        opacity -= 0.1;
                        targetElement.style.opacity = opacity;
                        if (opacity <= 0) {
                            clearInterval(fadeOutTimeout);
                            fadeOutTimeout = null;
                            targetElement.style.visibility = 'hidden';
                        }
                    }, speed);
                }, duration);
            }
        }
    }, speed);
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
    // showStatusText("Test 1", outputElement);
    // showStatusText("Test 2", outputElement);
    // showStatusText("Test 3", outputElement, 2000);
    // return;
    window.api.invoke('on-install')
        .then((result) => {
            console.log(result);
            showStatusText(result, outputElement, 5000);
        })
        .catch((err) => {
            console.error(err);
            setTimeout(() => {
                showStatusText("❌ Failed to flash firmware.", outputElement, 5000);
            }, 1000);
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