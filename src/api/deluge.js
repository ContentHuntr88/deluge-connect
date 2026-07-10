import { Settings } from "../storage/settings.js";
import { callRpc } from "./rpc.js";
import { login } from "./auth.js";

/**
 * Tests the exact saved server URL and password.
 *
 * @returns {Promise<{
 *   connected: boolean,
 *   apiVersion: string | null
 * }>}
 */
export async function testConnection() {
    const settings = await Settings.get();

    const serverUrl = String(
        settings.serverUrl || ""
    ).trim();

    const password = String(
        settings.password || ""
    );

    /*
     * Always validate the supplied password.
     * Do not trust an existing Deluge session cookie.
     */
    await login(
        serverUrl,
        password
    );

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

    let apiVersion = null;

    try {
        const version = await callRpc(
            serverUrl,
            "web.get_webui_version",
            []
        );

        apiVersion = version
            ? String(version)
            : null;
    } catch {
        /*
         * Login succeeded. A missing version method should not
         * cause the connection test to fail.
         */
    }

    return {
        connected: true,
        apiVersion
    };
}

/**
 * Calls a Deluge JSON-RPC method.
 *
 * The saved password is validated before every operation so an old
 * authenticated browser session cannot bypass an incorrect password.
 *
 * @param {string} method Deluge RPC method name.
 * @param {unknown[]} params RPC parameters.
 * @returns {Promise<unknown>}
 */
export async function callDeluge(method, params = []) {
    const settings = await Settings.get();

    const serverUrl = String(
        settings.serverUrl || ""
    ).trim();

    const password = String(
        settings.password || ""
    );

    /*
     * Force password validation before sending anything to Deluge.
     */
    await login(
        serverUrl,
        password
    );

    return callRpc(
        serverUrl,
        method,
        params
    );
}