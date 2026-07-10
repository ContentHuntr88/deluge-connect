import { Settings } from "../storage/settings.js";
import { callRpc } from "./rpc.js";
import {
    ensureAuthenticated,
    login
} from "./auth.js";

/**
 * Tests the exact server URL and password currently saved.
 *
 * This deliberately performs a fresh login instead of reusing an
 * existing Deluge browser session. That ensures an incorrect password
 * cannot produce a false successful connection test.
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
     * Force Deluge to validate the supplied password.
     * Do not use ensureAuthenticated() here because an existing valid
     * session cookie could hide an incorrect password.
     */
    await login(
        serverUrl,
        password
    );

    /*
     * Confirm the new session is genuinely authenticated.
     */
    const authenticated = await callRpc(
        serverUrl,
        "auth.check_session",
        []
    );

    if (authenticated !== true) {
        throw new Error(
            "Deluge accepted the request but did not create an authenticated session."
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
         * Login and session validation succeeded.
         * A missing version method should not fail the test.
         */
    }

    return {
        connected: true,
        apiVersion
    };
}

/**
 * Calls a Deluge JSON-RPC method after ensuring authentication.
 *
 * Normal torrent operations may reuse an existing authenticated
 * session. If the session has expired, ensureAuthenticated() logs in
 * again using the saved password.
 *
 * @param {string} method Deluge RPC method name.
 * @param {unknown[]} params RPC parameters.
 * @returns {Promise<unknown>}
 */
export async function callDeluge(method, params = []) {
    const settings = await Settings.get();

    await ensureAuthenticated(
        settings.serverUrl,
        settings.password
    );

    return callRpc(
        settings.serverUrl,
        method,
        params
    );
}