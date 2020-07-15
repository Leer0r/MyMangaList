const electron = require("electron");
const {
    ipcRenderer
} = electron;

const form = document.querySelector('form');
form.addEventListener('submit', submitForm);

function submitForm(e) {
    e.preventDefault();
    //Add a verification function (not negative number, ...)

    const item = {
        "manga_name": document.querySelector('#manga_name').value,
        "scan": document.querySelector('#manga_scan').value === "" ? 0 : document.querySelector('#manga_scan').value,
        "link": document.querySelector('#web_reader').value,
        "appreciation": document.querySelector('#appreciation').value,
        "comment": document.querySelector('#additionnal-commentary').value
    }
    ipcRenderer.send('manga:add', item)
}