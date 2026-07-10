import { callRpc } from "./rpc.js";

/**
 * Logs into the Deluge WebUI.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @param {string} password Deluge WebUI password.
 * @returns {Promise<boolean>} True when authentication succeeds.
 */
export async function login(serverUrl, password) {
    const normalizedPassword = String(password || "");

    if (!normalizedPassword) {
        throw new Error("The Deluge password is required.");
    }

    const authenticated = await callRpc(
        serverUrl,
        "auth.login",
        [normalizedPassword]
    );

    if (authenticated !== true) {
        throw new Error("Deluge rejected the password.");
    }

    return true;
}

/**
 * Checks whether the current browser session is authenticated.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated(serverUrl) {
    return Boolean(
        await callRpc(
            serverUrl,
            "auth.check_session",
            []
        )
    );
}

/**
 * Logs in only when the existing Deluge session is no longer valid.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @param {string} password Deluge WebUI password.
 * @returns {Promise<boolean>}
 */
export async function ensureAuthenticated(serverUrl, password) {
    try {
        if (await isAuthenticated(serverUrl)) {
            return true;
        }
    } catch {
        // Continue to login if there is no valid existing session.
    }

    return login(serverUrl, password);
}