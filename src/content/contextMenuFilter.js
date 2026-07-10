/**
 * Finds the nearest link associated with a pointer event.
 *
 * @param {PointerEvent | MouseEvent} event Browser pointer or context-menu event.
 * @returns {HTMLAnchorElement | null}
 */
function getLinkFromEvent(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
        return null;
    }

    return target.closest("a[href]");
}

/**
 * Determines whether a URL points to a magnet or torrent link.
 *
 * @param {string} linkUrl Link URL to inspect.
 * @returns {boolean}
 */
function isTorrentOrMagnetLink(linkUrl) {
    const url = String(linkUrl || "").trim();

    if (url.toLowerCase().startsWith("magnet:")) {
        return true;
    }

    try {
        const parsedUrl = new URL(
            url,
            window.location.href
        );

        const isWebUrl =
            parsedUrl.protocol === "http:" ||
            parsedUrl.protocol === "https:";

        if (!isWebUrl) {
            return false;
        }

        return parsedUrl.pathname
            .toLowerCase()
            .endsWith(".torrent");
    } catch {
        return false;
    }
}

/**
 * Tells the service worker whether the Deluge context menu should be visible.
 *
 * @param {PointerEvent | MouseEvent} event Browser pointer or context-menu event.
 * @returns {void}
 */
function updateContextMenu(event) {
    const link = getLinkFromEvent(event);
    const linkUrl = link?.href || "";

    try {
        const messagePromise = chrome.runtime.sendMessage({
            type: "DELUGE_CONTEXT_MENU_VISIBILITY",
            visible: isTorrentOrMagnetLink(linkUrl)
        });

        if (
            messagePromise &&
            typeof messagePromise.catch === "function"
        ) {
            messagePromise.catch(() => {
                // Ignore messages lost while the extension reloads.
            });
        }
    } catch {
        // Ignore calls from an old content script after extension reload.
    }
}

document.addEventListener(
    "pointerdown",
    event => {
        if (event.button === 2) {
            updateContextMenu(event);
        }
    },
    true
);

document.addEventListener(
    "contextmenu",
    updateContextMenu,
    true
);