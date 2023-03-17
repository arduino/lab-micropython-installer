const button = document.querySelector('#install-button');
const outputElement = document.querySelector('#output');
const fileDropElement = document.querySelector('#file-drop-area');

const clearOutput = () => {
    setTimeout(() => {
        outputElement.textContent = '\u00a0';
    }, 10000);
}

window.api.on('on-output', (message) => {
    outputElement.textContent = message;
});

button.addEventListener('click', () => {
    window.api.invoke('on-install')
        .then(function (res) {
            console.log(res);
            clearOutput();
        })
        .catch(function (err) {
            console.error(err);
            clearOutput();
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

    window.api.invoke('on-file-dropped', filePaths[0]).then(function (res) {
        console.log(res);
        clearOutput();
    }).catch(function (err) {
        console.error(err);
        clearOutput();
    });
});