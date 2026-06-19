// MAD : Myket Apk Downloader
// APK Downloader for Myket.ir (Firefox Extension)
// https://github.com/Ya-Zahra/myket-apk-downloader-firefox
// MPL-2.0 license

(async () => {
  'use strict';

  /* ---------- Constants & Configuration ---------- */

  /* Enable/disable verbose debug logs. Set to false for production. */
  const DEV_MODE = true;

  /* Base URL for Myket REST API */
  const API_BASE = 'https://apiserver.myket.ir';

  /* Text appended to the download button's title (tooltip) */
  const DOWNLOAD_BTN_TITLE = '\n*** شادی روح امام، رهبر شهید و شهدا صلوات ***';

  /* Maximum number of attempts to obtain a fresh auth token */
  const MAX_AUTH_RETRIES = 2;

  /*
   * Default headers for all API requests.
   * Mimics an Android device using Myket app version 914.
   * The Authorization header will be filled dynamically after login.
   */
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Myket-Version': '914',
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android x.x; xxxx Build/xxxxxx)',
    Host: 'apiserver.myket.ir',
    Connection: 'Keep-Alive',
    'Accept-Encoding': 'gzip',
  };

  /*
   * Static device fingerprint used for device authorisation.
   * These values are required by the Myket API to simulate an Android device.
   * They can be adjusted if the API changes or if a different fingerprint is desired.
   */
  const authorizeBody = {
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
  };

  const ANDROID_VERSION_MAP = {
    '15': '4.0.3',
    '16': '4.1',
    '17': '4.2',
    '18': '4.3',
    '19': '4.4',
    '20': '4.4W',
    '21': '5.0',
    '22': '5.1',
    '23': '6.0',
    '24': '7.0',
    '25': '7.1',
    '26': '8.0',
    '27': '8.1',
    '28': '9',
    '29': '10',
    '30': '11',
    '31': '12',
    '32': '12L',
    '33': '13',
    '34': '14',
  };
  /* ---------- Logging Helpers ---------- */

  /* Standard info log, always shown. */
  const log = (...args) => console.log('[MAD]', ...args);

  /* Debug log, controlled by DEV_MODE flag. */
  const logDebug = (...args) => {
    if (DEV_MODE) console.log('[MAD:DEBUG]', ...args);
  };

  /* Error log, always shown. */
  const logError = (...args) => console.error('[MAD:ERROR]', ...args);

  /* ---------- Storage Helpers ---------- */

  /**
   * Retrieves stored settings from browser.storage.local.
   * Returns an object with:
   *   MyketAuth (string)  – the saved auth token (empty if none)
   *   apiLevel  (string)  – Android API level used in device authorisation (default '17')
   */
  async function getSettings() {
    return browser.storage.local.get({ MyketAuth: '', apiLevel: '17' });
  }

  /* ---------- Authentication ---------- */

  /**
   * Ensures a valid Authorization header is present in defaultHeaders.
   * If forceNew is false and a token already exists, reuse it.
   * Otherwise, request a new token from the API, retrying up to MAX_AUTH_RETRIES times.
   *
   * @param {boolean} forceNew   - if true, discard any existing token and fetch a new one
   * @param {number}  retryCount - current retry attempt (used internally)
   * @throws {Error} If maximum retries are exceeded or the API returns an error.
   */
  async function getAuthToken(forceNew = false, retryCount = 0) {
    log('Getting auth token... (forceNew:', forceNew, 'retry:', retryCount, ')');

    const settings = await getSettings();
    /* If we're not forced to renew and a token exists, just apply it and exit */
    if (!forceNew && settings.MyketAuth) {
      log('Using existing token');
      defaultHeaders.Authorization = settings.MyketAuth;
      return;
    }

    if (retryCount >= MAX_AUTH_RETRIES) {
      throw new Error('Max authentication retries reached');
    }

    /* Build the authorisation payload, using the user-chosen API level (default 17) */
    const body = { ...authorizeBody, api: settings.apiLevel };
    logDebug('Authorize request body:', body);

    const response = await fetch(`${API_BASE}/v1/devices/authorize/`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body),
      mode: 'cors',
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.translatedMessage || `Authentication failed (${response.status})`);
    }

    const { token } = await response.json();
    log('New token obtained successfully');

    /* Persist the token and set it in the shared headers object */
    await browser.storage.local.set({ MyketAuth: token });
    defaultHeaders.Authorization = token;
  }

  /* ---------- Package Information ---------- */

  /**
   * Fetches package metadata from Myket API.
   * On a 401 Unauthorized response the token is refreshed and the request is retried
   * (up to MAX_AUTH_RETRIES total attempts).
   *
   * @param {string} packageName - Android package name (e.g. "com.example.app")
   * @param {number} retryCount  - current retry attempt (internal)
   * @returns {Promise<Object>}  - the JSON response containing app details
   * @throws {Error} If the request fails after all retries or with a non‑recoverable error.
   */
  async function fetchPackageInfo(packageName, retryCount = 0) {
    const url = `${API_BASE}/v2/applications/${packageName}/`;
    log(`Fetching package info for "${packageName}"...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders,
      mode: 'cors',
    });

    /* Token expired – renew and retry the same request */
    if (response.status === 401 && retryCount < MAX_AUTH_RETRIES) {
      log('Token expired, renewing...');
      await getAuthToken(true, retryCount);
      return fetchPackageInfo(packageName, retryCount + 1);
    }

    if (!response.ok) {
      throw new Error(`Package info request failed: ${response.status}`);
    }

    const data = await response.json();
    log('Package info received successfully');
    logDebug('Package data:', data);
    return data;
  }

  /* ---------- Download Link ---------- */

  /**
   * Obtains a direct download link for a specific version of an app.
   * The API returns a relative path and a list of mirror servers;
   * we randomly select one server to balance load.
   *
   * @param {string} requestedVersion - version code (e.g. "12345")
   * @param {string} packageName      - Android package name
   * @returns {Promise<string>}       - full download URL
   * @throws {Error} If the API call fails or the response lacks a valid link.
   */
  async function getDownloadLink(requestedVersion, packageName) {
    log(`Requesting download link for version "${requestedVersion}"`);
    const params = new URLSearchParams({
      action: 'start',
      requestedVersion,
      fileType: 'App',
      lang: 'fa',
    });
    const url = `${API_BASE}/v1/applications/${packageName}/uri/?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders,
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Download link request failed: ${response.status}`);
    }

    const { uriPath, uriServers: servers } = await response.json();
    if (!uriPath) throw new Error('No download link returned from API');

    /* Pick a random mirror server to distribute traffic */
    const server = servers[Math.floor(Math.random() * servers.length)];
    const fullLink = server + uriPath;
    log('Download link generated successfully');
    return fullLink;
  }

  /* ---------- DOM Utilities ---------- */

  /**
   * Waits for an element matching the given selector to appear in the DOM.
   * Uses a MutationObserver to detect changes efficiently.
   *
   * @param {string} selector - CSS selector
   * @returns {Promise<Element>} - the found element
   */
  function waitForElement(selector) {
    return new Promise(resolve => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const target = document.querySelector(selector);
        if (target) {
          observer.disconnect();
          resolve(target);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      log(`Waiting for element: "${selector}"`);
    });
  }

  /* ---------- Main Logic ---------- */

  /**
   * Core function: locates the download button(s), fetches package data and a direct
   * download link, and rewrites the button(s) accordingly.
   *
   * On any error the original button attributes (href, onclick, title) are restored,
   * so the page remains fully functional as if the extension never touched it.
   */
  async function updateDownloadButtons() {
    /* Locate the main download button */
    const downloadBtn = document.querySelector('a.btn-download');
    if (!downloadBtn) {
      log('Download button not found – nothing to do');
      return;
    }

    /* Additional UI elements that may be present */
    const baseBtn    = document.getElementById('basebtn');
    const baseBtnMob = document.getElementById('basebtnmob');
    const installBtn = document.getElementById('install');

    /* ---------- Preserve original state for rollback ---------- */

    const originalDownloadHref    = downloadBtn.getAttribute('href');
    const originalDownloadOnclick = downloadBtn.getAttribute('onclick');
    const originalDownloadTitle   = downloadBtn.getAttribute('title') || '';

    const originalInstallHref     = installBtn ? installBtn.getAttribute('href') : null;
    const originalInstallOnclick  = installBtn ? installBtn.getAttribute('onclick') : null;
    const originalInstallTitle    = installBtn ? (installBtn.getAttribute('title') || '') : '';

    try {
      /* 1. Authenticate with the API (token reused or freshly obtained) */
      await getAuthToken();

      /* 2. Extract the package name from the download button's href.
       *    Use the full page URL as base to handle relative links correctly. */
      const href = downloadBtn.getAttribute('href');
      if (!href) throw new Error('Download button has no href');
      const url = new URL(href, window.location.href);
      const packageName = url.searchParams.get('packageName');
      if (!packageName) throw new Error('Package name missing in href');

      /* 3. Fetch metadata (price, version, size, etc.) */
      const pkgInfo = await fetchPackageInfo(packageName);

      /* 4. If the app is not free, do nothing and leave the original button. */
      if (!pkgInfo.price.isFree) {
        log('Application is not free – displaying price notification');
        if (baseBtn) baseBtn.textContent = 'برنامه پولی';
        return;
      }
      if (pkgInfo.version.isIncompatible) {
        log('This app is incompatible with the current API level');

        const settings = await getSettings();          // دریافت apiLevel ذخیره‌شده
        const apiLevel = settings.apiLevel || '17';
        const androidVersion = ANDROID_VERSION_MAP[apiLevel] || `API ${apiLevel}`;
        const incompatMsg = `ناسازگار با اندروید ${androidVersion}`;

        if (baseBtn)    baseBtn.textContent = incompatMsg;
        if (baseBtnMob) baseBtnMob.textContent = incompatMsg;   // آپدیت دکمه موبایل هم
        return;
      }
      /* 5. Obtain the direct download URL for the current version */
      const downloadUrl = await getDownloadLink(pkgInfo.version.code, packageName);

      /* 6. Apply changes to the UI – atomic, only if all steps succeed */

      /* Update the smaller "install" button if present */
      if (installBtn) {
        installBtn.removeAttribute('onclick');
        installBtn.setAttribute('href', downloadUrl);
        installBtn.setAttribute(
          'title',
          (originalInstallTitle ? originalInstallTitle + ' ' : '') + DOWNLOAD_BTN_TITLE
        );
      }

      /* Update the main download button */
      downloadBtn.removeAttribute('onclick');
      downloadBtn.setAttribute('href', downloadUrl);
      downloadBtn.setAttribute(
        'title',
        (originalDownloadTitle ? originalDownloadTitle + ' ' : '') + DOWNLOAD_BTN_TITLE
      );

      /* Update button labels with human‑readable size if available */
      const sizeText = pkgInfo.size?.actual ? `دانلود (${pkgInfo.size.actual})` : 'دانلود';
      if (baseBtn)    baseBtn.textContent = sizeText;
      if (baseBtnMob) baseBtnMob.textContent = 'دانلود';

      log('Download buttons updated successfully');

    } catch (error) {
      logError('Failed to update download buttons:', error);

      /* Restore every modified attribute to its original value.
       * This guarantees the page behaves exactly as it did before the extension ran. */

      if (downloadBtn) {
        if (originalDownloadHref !== null) {
          downloadBtn.setAttribute('href', originalDownloadHref);
        } else {
          downloadBtn.removeAttribute('href');
        }
        if (originalDownloadOnclick !== null) {
          downloadBtn.setAttribute('onclick', originalDownloadOnclick);
        } else {
          downloadBtn.removeAttribute('onclick');
        }
        downloadBtn.setAttribute('title', originalDownloadTitle);
      }

      if (installBtn) {
        if (originalInstallHref !== null) {
          installBtn.setAttribute('href', originalInstallHref);
        } else {
          installBtn.removeAttribute('href');
        }
        if (originalInstallOnclick !== null) {
          installBtn.setAttribute('onclick', originalInstallOnclick);
        } else {
          installBtn.removeAttribute('onclick');
        }
        installBtn.setAttribute('title', originalInstallTitle);
      }

      /* The base buttons’ text is left unchanged – they are not critical */
    }
  }

  /* ---------- Entry Point ---------- */

  log('Extension started, waiting for download button...');

  try {
    /* Wait until the download button appears in the DOM (page may still be loading) */
    await waitForElement('a.btn-download');
    log('Download button appeared, starting update process');
    await updateDownloadButtons();
  } catch (error) {
    logError('Initialization failed:', error);
  }
})();