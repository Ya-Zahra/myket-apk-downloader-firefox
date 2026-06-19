/* ---------- State & DOM References ---------- */

/* Stores the API level that was last loaded from storage (to detect changes) */
let previousApiLevel;

/* ---------- Save Handler ---------- */

/**
 * Handles the form submission.
 * If the API level has changed, it saves the new value, removes the saved
 * auth token (forcing re-authentication with the new API level), and
 * updates the UI accordingly.
 *
 * @param {Event} e - The form submit event.
 */
async function saveOptions(e) {
    e.preventDefault();

    /* Grab the newly selected API level */
    const newApiLevel = document.querySelector('#apiLevel').value;

    /* If no change, do nothing */
    if (previousApiLevel === newApiLevel) return;

    /* Persist the new API level */
    await browser.storage.local.set({ apiLevel: newApiLevel });

    /* Update the in-memory reference */
    previousApiLevel = newApiLevel;

    /* Clear any stored auth token – it was obtained with the old API level */
    await browser.storage.local.remove('MyketAuth');
    document.querySelector('#saved-auth').textContent = 'No (cleared)';

    /* Show a brief success message */
    const notifyEl = document.querySelector('#notify');
    notifyEl.textContent = '✓ Saved';
    setTimeout(() => {
        notifyEl.textContent = '';
    }, 1500);
}

/* ---------- Initialization ---------- */

/**
 * Loads stored settings and populates the form.
 * It reads the API level and the existence of an auth token,
 * then updates the UI accordingly.
 */
async function restoreOptions() {
    const defaults = {
        MyketAuth: '',
        apiLevel: '17'
    };

    const stored = await browser.storage.local.get(defaults);

    /* Remember the current API level so we can detect changes later */
    previousApiLevel = stored.apiLevel;

    /* Display whether an auth token exists */
    document.querySelector('#saved-auth').textContent = stored.MyketAuth ? 'Yes' : 'No';

    /* Set the dropdown to the saved API level */
    document.querySelector('#apiLevel').value = previousApiLevel;
}

/* ---------- Event Binding ---------- */
document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);