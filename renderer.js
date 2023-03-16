const button = document.querySelector('#install-button');
const outputElement = document.querySelector('#output');
const fileDropElement = document.querySelector('#file-drop-area');

window.api.on('on-output', (message) => {
    console.log(message);
    outputElement.innerText = message;
});

button.addEventListener('click', () => {
    window.api.invoke('on-install')
        .then(function (res) {
            console.log(res);
            // outputElement.innerText = res;
        })
        .catch(function (err) {
            console.error(err);
            // outputElement.innerText = err;
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

    console.log(filePaths);
    window.api.invoke('on-file-dropped', filePaths[0]);       
});