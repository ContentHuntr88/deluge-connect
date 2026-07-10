import { Settings } from "../storage/settings.js";
import { login } from "./auth.js";
import { callRpc } from "./rpc.js";

/**
 * Tests the saved Deluge server connection.
 *
 * The supplied password is validated even when Deluge already has an
 * authenticated browser session.
 *
 * @returns {Promise<{
 *     connected: boolean,
 *     apiVersion: string | null
 * }>}
 */
export async function testConnection() {
    const { serverUrl, password } = await getConnectionSettings();

    await login(serverUrl, password);

    const authenticated = await callRpc(
        serverUrl,
        "auth.check_session",
        []
    );

    if (authenticated !== true) {
        throw new Error(
            "Deluge did not create an authenticated session."
        );
    }

    const apiVersion = await getWebUiVersion(serverUrl);

    return {
        connected: true,
        apiVersion
    };
}

/**
 * Calls a Deluge JSON-RPC method using the saved connection settings.
 *
 * The password is validated before every operation so an existing Deluge
 * session cannot bypass an incorrect saved password.
 *
 * @param {string} method Deluge RPC method name.
 * @param {unknown[]} params RPC method parameters.
 * @returns {Promise<unknown>} Resolves with the RPC result.
 */
export async function callDeluge(method, params = []) {
    const { serverUrl, password } = await getConnectionSettings();

    await login(serverUrl, password);

    return callRpc(
        serverUrl,
        method,
        params
    );
}

/**
 * Loads and normalizes the saved Deluge connection settings.
 *
 * @returns {Promise<{
 *     serverUrl: string,
 *     password: string
 * }>}
 */
async function getConnectionSettings() {
    const settings = await Settings.get();

    return {
        serverUrl: String(settings.serverUrl || "").trim(),
        password: String(settings.password || "")
    };
}

/**
 * Retrieves the Deluge WebUI version when supported.
 *
 * Authentication has already succeeded at this point, so failure to retrieve
 * the optional version should not fail the connection test.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @returns {Promise<string | null>}
 */
async function getWebUiVersion(serverUrl) {
    try {
        const version = await callRpc(
            serverUrl,
            "web.get_webui_version",
            []
        );

        return version
            ? String(version)
            : null;
    } catch {
        return null;
    }
}