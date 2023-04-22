
// MAD : Myket Apk Downloader
// APK Downloader for Myket.ir
// https://github.com/Ya-Zahra/myket-apk-downloader-firefox
// MPL-2.0 license

//disable or enable devMode here
const _devMode = false;
function l(_msg) {
    if (_devMode)
        console.log('MAD:', _msg);
}
if (!_devMode)
    console.log('MAD: end-user mode');
(() => {
    l('started');
    ('use strict');
    const _authItemName = 'MyketAuth',
    _apiURL = 'https://apiserver.myket.ir',
    _downloadButtonTitle = '\n*** شادی روح امام و شهدا صلوات ***',
    _applicationsVer1URL = `${_apiURL}/v1/applications`,
    _applicationsVer2URL = `${_apiURL}/v2/applications`,
    _authorizeURL = `${_apiURL}/v1/devices/authorize/`,
    _Headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Myket-Version': '914',
        Authorization: '',
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android x.x; xxxx Build/xxxxxx)',
        Host: 'apiserver.myket.ir',
        Connection: 'Keep-Alive',
        'Accept-Encoding': 'gzip',
    },
    _authorizeRequest = {
        mode: 'cors',
        headers: _Headers,
        method: 'POST',
        body: JSON.stringify({
            acId: '',
            acKey: '',
            adId: '82d8810f-e83c-46c0-8bf5-080a83d635c6',
            andId: '82ee24cd7aad5173',
            api: '17',
            brand: 'Samsung',
            cpuAbis: ['armeabi-v7a', 'armeabi'],
            dens: 2.625,
            deviceModel: 'Samsung GnuSmas',
            deviceName: 'GnuSmas',
            deviceType: 'normal',
            dsize: '300',
            hsh: '46da699f048122ab9549ff061f8aa44aa8aae69b',
            imei: '',
            imsi: '',
            manufacturer: 'GnuSmas',
            product: 'GnuSmas_WWW',
            supportedAbis: ['arm64-v8a', 'armeabi-v7a', 'armeabi'],
            uuid: 'b31f07f1-60fd-489b-9d14-66187834a131',
        }),
    },
    _appInfoRequset = {
        mode: 'cors',
        method: 'GET',
        headers: _Headers
    };
    async function getAuthFunc(tryNewAuth = false) {
        l('get Auth func');
        var _oldAuth;
        _oldAuth = localStorage.getItem(_authItemName);
        if (_oldAuth && !tryNewAuth) {
            l('Auth already exist & tryNewAuth is false');
            l(_oldAuth);
            _Headers.Authorization = _oldAuth;
            return void(0);
        }
        l('get Auth func - fetching');
        const _authorizeResponse = await fetch(_authorizeURL, _authorizeRequest);
        if (!_authorizeResponse.ok) {
            const {
                translatedMessage: _errMsg
            } = await _authorizeResponse.json();
            l('get Auth func - fetch err ' + _errMsg ?? 'Authentication error');
            throw new Error(_errMsg ?? 'Authentication error');
        }
        const {
            token: _authorizeToken
        } = await _authorizeResponse.json();
        l('get Auth func - saving Auth ' + _authorizeToken);
        localStorage.setItem(_authItemName, _authorizeToken);
    }
    async function getPkgInfoFunc(_pkgNameLocal) {
        l('get pkg info - "package" is ' + _pkgNameLocal);
        const _getPkgInfoURL_Local = `${_applicationsVer2URL}/${_pkgNameLocal}/`;
        l('URL is ' + _getPkgInfoURL_Local);
        l('fetching:');
        l(_appInfoRequset);
        const _pkgInfoFetchResponse = await fetch(_getPkgInfoURL_Local, _appInfoRequset);
        if (!_pkgInfoFetchResponse.ok) {
            l('fetch err:' + _getPkgInfoURL_Local);
            l(_appInfoRequset);
            l('response is');
            l(pkgInfoFetchResponse);
            if (401 !== _pkgInfoFetchResponse.status) {
                l('401 !== response.status');
                throw new Error('Request failure.');
            }
            l('calling get Auth func with true - get new auth');
            await getAuthFunc(true);
            l('calling getPkgInfo again');
            return await getPkgInfoFunc(_pkgNameLocal);
        }
        let _pkgInfoJson = await _pkgInfoFetchResponse.json();
        l('response is:');
        l(_pkgInfoJson);
        return _pkgInfoJson;
    }
    var _btnSelector;
    ((_btnSelector = 'a.btn-download'), new Promise(resolveFunc => {
            l('new Promise - searching for:' + _btnSelector);
            let _btnElement = document.querySelector(_btnSelector);
            if (_btnElement) {
                l('found without wait');
                return resolveFunc(_btnElement);
            }
            l('waiting for ' + _btnSelector + ' - MutationObserver');
            const _pageBodyObserver = new MutationObserver(MutationCallback => {
                var _btnDownload;
                _btnDownload = document.querySelector(_btnSelector);
                if (_btnDownload) {
                    l('found with wait');
                    _pageBodyObserver.disconnect();
                    return resolveFunc(_btnDownload);
                }
            });
            _pageBodyObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        })).then(async function (_downloadBtn) {
        const _baseBtn = document.getElementById('basebtn'),
        _baseBtnMob = document.getElementById('basebtnmob');
        if (_baseBtn)
            try {
                await getAuthFunc();
                const _pkgName = new URL(_downloadBtn.getAttribute('href')).searchParams.get('packageName'),
                _pkgInfoData = await getPkgInfoFunc(_pkgName);
                if (!_pkgInfoData.price.isFree) {
                    l('Paid App!');
                    _baseBtn.textContent = 'برنامه پولی';
                    return;
                }
                const _downloadURL = await(async function (_requestedVer, _requestedPkg) {
                    const _getDownloadLinkStart = `${_applicationsVer1URL}/${_requestedPkg}/uri/?` +
                        new URLSearchParams({
                            action: 'start',
                            requestedVersion: _requestedVer,
                            fileType: 'App',
                            lang: 'fa',
                        }).toString(),
                    _appInfoResponse = await fetch(_getDownloadLinkStart, _appInfoRequset), {
                        uriPath: _uriPath,
                        uriServers: _serverList
                    } = await _appInfoResponse.json();
                    if (!_uriPath)
                        throw new Error('No download link.');
                    l('random server - total servers :' + _serverList.length);
                    const _fullDownloadLink = _serverList[Math.floor(Math.random() * _serverList.length)] +
                        _uriPath;
                    l(`APK Download link is: ${_fullDownloadLink}`);
                    return _fullDownloadLink;
                })(_pkgInfoData.version.code, _pkgName);
                const _installBtn = document.getElementById('install');
                if (_installBtn) {
                    _installBtn.removeAttribute('onclick');
                    _installBtn.setAttribute('href', _downloadURL);
                    _installBtn.title += _downloadButtonTitle;
                }
                _downloadBtn.removeAttribute('onclick');
                _downloadBtn.setAttribute('href', _downloadURL);
                _baseBtn.textContent = `دانلود (${_pkgInfoData.size.actual})`;
                _downloadBtn.title += _downloadButtonTitle;
                if (_baseBtnMob) {
                    _baseBtnMob.textContent = 'دانلود';
                }
            } catch (_err) {
                _downloadBtn.setAttribute('href', '#');
                _downloadBtn.removeAttribute('onclick');
                l(_err);
            }
        else
            l('download btn caption not found.');
    }).catch(_err => {
        l('download button not found.');
        l(_err);
    });
})();
