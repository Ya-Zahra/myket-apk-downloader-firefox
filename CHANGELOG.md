# CHANGELOG

APK Downloader for Myket.ir
[https://github.com/Ya-Zahra/myket-apk-downloader-firefox](https://github.com/Ya-Zahra/myket-apk-downloader-firefox)

---

## 0.0.7

- **Redesigned options page** – modern, responsive UI with better typography, spacing, and a clean card layout.
- **Improved feedback** – "Saved" notification now appears briefly after saving; auth token status is shown with clear Yes/No labels.
- **Background script hardening** – added error handling for `openOptionsPage()` to prevent unhandled promise rejections.
- **Code quality** – all JavaScript files now include comprehensive block comments (`/* */`) explaining each function and logic block.
- **Maintainability** – consistent logging prefixes (`[MAD]`, `[MAD:Background]`, etc.) for easier debugging.

## 0.0.6

- Users can now choose the Android API Level used during device authorization.
- The selected API level is persisted, and changing it automatically clears any cached auth token to ensure a fresh login with the new fingerprint.

## 0.0.5

- Initial support for Firefox Nightly for Developers (Android) and Firefox Desktop.
- First stable release capable of bypassing Myket’s download restrictions by providing direct APK links.