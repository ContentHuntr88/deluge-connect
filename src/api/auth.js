import { callRpc } from "./rpc.js";

/**
 * Authenticates with the Deluge WebUI.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @param {string} password Deluge WebUI password.
 * @returns {Promise<boolean>} Resolves to true when authentication succeeds.
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