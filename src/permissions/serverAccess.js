/**
 * Converts a Deluge WebUI address into the exact host permission pattern
 * Chrome needs for cross-origin requests.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @returns {string} Chrome host permission pattern.
 */
export function getServerOriginPattern(serverUrl) {
    const value = String(serverUrl || "").trim();

    if (!value) {
        throw new Error("The Deluge server URL is required.");
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(value);
    } catch {
        throw new Error(
            "The Deluge server URL is invalid. Example: http://192.168.1.6:8112"
        );
    }

    if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
    ) {
        throw new Error(
            "The Deluge server URL must use HTTP or HTTPS."
        );
    }

    return `${parsedUrl.protocol}//${parsedUrl.host}/*`;
}

/**
 * Requests access only to the Deluge server entered by the user.
 * This must be called directly from a user action such as Save or Test.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @returns {Promise<string>} The granted origin pattern.
 */
export async function requestServerAccess(serverUrl) {
    const origin = getServerOriginPattern(serverUrl);

    const alreadyGranted = await chrome.permissions.contains({
        origins: [origin]
    });

    if (alreadyGranted) {
        return origin;
    }

    const granted = await chrome.permissions.request({
        origins: [origin]
    });

    if (!granted) {
        throw new Error(
            `Permission is required to connect to ${new URL(serverUrl).host}.`
        );
    }

    return origin;
}