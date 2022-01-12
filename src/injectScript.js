function waitForElement(selector) {
    return new Promise(function(resolve, reject) {
        let element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        const interval = setInterval(() => {
            let element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
                return;
            }
        }, 100)
    });
}

let pkg, vercode, dbtn, basebtn, downloadLink, sizeStr;

const au = 'eyJhY2MiOiIzZTY1MjEzNi1iYTQyLTQ1OWEtYjQ5MS00MzI0NzcyYjAxOTQiL' +
    'CJhcGkiOiIxNiIsImNwdSI6Ing4Njthcm1lYWJpLXY3YSIsImR0IjoxODgwMjE2OTUsI' +
    'mgiOiI2NmI3NGVlNC05ZTIzLTRlMDQtYWQxMC0xZWFkYzJmMmQwMGQiLCJhbmRJZCI6I' +
    'mZmZmZmZmZmZmZmZmZmZmYiLCJhZElkIjoiIiwidiI6MSwiaHNoIjoiUm1zNDlMcUJqN' +
    'jUrR05aYktaMnI2bHNXVFprPSIsInNjciI6IjMwMF8yNTAiLCJ1IjoiYjMxZjA3ZjEtN' +
    'jBmZC00ODliLTlkMTQtNjYxODc4MzRhMTMxIn0';

const cheaders = {
    'Accept': 'application/json',
    'Myket-Version': '673',
    'Authorization': au,
    'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android x.x; xxxx Build/xxxxxx)',
    'Host': 'apiserver.myket.ir',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'json'
};

waitForElement('a.btn-download').then(btn => {
    dbtn = btn;
    basebtn = document.getElementById('basebtn');
    let url = dbtn.getAttribute('href');
    pkg = new URL(url).searchParams.get('packageName');
    fetch('https://apiserver.myket.ir/v2/applications/'+ pkg +'/', {
        mode: 'cors',
        method: 'GET',
        headers: cheaders
    }).then(async response => {
        let res = await response.json()
        vercode = res.version.code;
        sizeStr = res.size.actual;
        let iconUrl = res.icon.url;
        dbtn.removeAttribute('onclick');
        fetch('https://apiserver.myket.ir/v1/applications/' + pkg +
            '/uri/?action=start&requestedVersion=' + vercode +
            '&fileType=App&lang=fa', {
                mode: 'cors',
                method: 'GET',
                headers: cheaders
            }).then(async response => {
            let res = await response.json()
            if (typeof res.uri !== 'undefined') {
                downloadLink = res.uri;
            } else {
                downloadLink = 'undefined';
            }
            if (downloadLink == 'undefined') {
                basebtn.textContent = 'ناسازگار';
                dbtn.setAttribute('href', '#');
            } else {
                dbtn.setAttribute('href', downloadLink);
                basebtn.textContent = 'دانلود (' + sizeStr + ')';
            }
        }).catch(err => {
            console.log('Request failed', err);
        })
    }).catch(err => {
        console.log('Request failed', err);
    })
})