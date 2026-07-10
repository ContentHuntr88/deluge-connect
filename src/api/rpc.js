let nextRequestId = 1;

/**
 * Sends a JSON-RPC request to the Deluge Web API.
 *
 * @param {string} serverUrl Deluge WebUI base URL.
 * @param {string} method Deluge RPC method name.
 * @param {unknown[]} params RPC method parameters.
 * @returns {Promise<unknown>} The RPC result.
 */
export async function callRpc(serverUrl, method, params = []) {
    const normalizedUrl = normalizeServerUrl(serverUrl);
    const requestId = nextRequestId++;

    let response;

    try {
        response = await fetch(`${normalizedUrl}/json`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                method,
                params,
                id: requestId
            })
        });
    } catch (error) {
        throw new Error(
            `Could not reach Deluge at ${normalizedUrl}. Check the address and confirm Deluge WebUI is running.`
        );
    }

    if (!response.ok) {
        throw new Error(
            `Deluge returned HTTP ${response.status} ${response.statusText}.`
        );
    }

    let payload;

    try {
        payload = await response.json();
    } catch {
        throw new Error("Deluge returned an invalid JSON response.");
    }

    if (payload.error) {
        const message =
            payload.error.message ||
            payload.error.exception_msg ||
            "Unknown Deluge RPC error.";

        throw new Error(message);
    }

    return payload.result;
}

function normalizeServerUrl(serverUrl) {
    const value = String(serverUrl || "").trim();

    if (!value) {
        throw new Error("The Deluge server URL is required.");
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(value);
    } catch {
        throw new Error(
            "The Deluge server URL is invalid. Example: http://10.10.10.10:8112"
        );
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("The Deluge server URL must use HTTP or HTTPS.");
    }

    return parsedUrl.toString().replace(/\/+$/, "");
}