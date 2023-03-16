const button = document.querySelector('#install-button');
const outputElement = document.querySelector('#output');

button.addEventListener('click', () => {
    window.api.invoke('on-install', [1, 2, 3])
        .then(function (res) {
            console.log(res); // will print "This worked!" to the browser console
            outputElement.innerText = res;
        })
        .catch(function (err) {
            console.error(err); // will print "This didn't work!" to the browser console.
            outputElement.innerText = err;
        });
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();

    let pathArr = [];
    for (const f of event.dataTransfer.files) {
        // Using the path attribute to get absolute file path
        console.log('File Path of dragged files: ', f.path)
        pathArr.push(f.path); // assemble array for main.js
    }
    console.log(pathArr);
    const ret = ipcRenderer.sendSync('dropped-file', pathArr);
    console.log(ret);
});