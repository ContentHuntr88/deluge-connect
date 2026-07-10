import { Settings } from "../storage/settings.js";
import { callRpc } from "./rpc.js";
import { ensureAuthenticated } from "./auth.js";

/**
 * Tests whether Deluge Connect can authenticate and communicate with Deluge.
 *
 * @returns {Promise<{connected: boolean, apiVersion: string | null}>}
 */
export async function testConnection() {
    const settings = await Settings.get();

    await ensureAuthenticated(
        settings.serverUrl,
        settings.password
    );

    let apiVersion = null;

    try {
        const version = await callRpc(
            settings.serverUrl,
            "web.get_webui_version",
            []
        );

        apiVersion = version ? String(version) : null;
    } catch {
        // Authentication succeeded, so a missing version method
        // should not make the whole connection test fail.
    }

    return {
        connected: true,
        apiVersion
    };
}

/**
 * Calls a Deluge JSON-RPC method after ensuring authentication.
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