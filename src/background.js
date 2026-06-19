/* background.js — Handles browser action (toolbar icon) click */

/**
 * Opens the extension's options page when the toolbar icon is clicked.
 * This is the primary entry point for users to configure settings.
 */
function handleClick() {
  /*
   * browser.runtime.openOptionsPage() returns a Promise.
   * If the options page is already open, the existing tab is focused.
   * Any runtime error (e.g., missing options page) will be caught and logged.
   */
  browser.runtime.openOptionsPage().catch((error) => {
    console.error('[MAD:Background] Failed to open options page:', error);
  });
}

/* Register the click listener on the browser action button */
browser.browserAction.onClicked.addListener(handleClick);