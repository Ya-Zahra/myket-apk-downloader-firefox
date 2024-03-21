/* global browser */

var _oldApi;
const _authItem = 'MyketAuthApi',
    _defSett = {
        apiLevel: '17'
    };

function isApiSaved() {
    let selectedApi = document.querySelector('#apiLevel').value;
    let selectedItem = _authItem + selectedApi;
    let storageItem = browser.storage.local.get(selectedItem);
    storageItem.then((res) => {
        document.querySelector("#saved-auth").innerText = 'API ' + selectedApi + ' ' + (res[selectedItem] ? 'yes' : 'no');
    });
}

function saveOptions(e) {
    e.preventDefault();
    var _newApi = document.querySelector("#apiLevel").value;
    if (_oldApi !== _newApi) {
        browser.storage.local.set({
            apiLevel: _newApi
        });
        _oldApi = _newApi;
        let _notify = document.querySelector('#notify');
        _notify.innerText = 'Saved';
        setTimeout(() => {
            _notify.innerText = '';
            return void (0);
        }, 1500);
    }
}

function restoreOptions() {
    let storageItem = browser.storage.local.get(_defSett);
    storageItem.then((res) => {
        _oldApi = res.apiLevel;
        document.querySelector('#apiLevel').value = _oldApi;
        isApiSaved();
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("#apiLevel").addEventListener("change", isApiSaved);
