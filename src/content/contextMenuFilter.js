function getLinkFromEvent(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
        return null;
    }

    return target.closest("a[href]");
}

function isTorrentOrMagnetLink(linkUrl) {
    const url = String(linkUrl || "").trim();

    if (url.toLowerCase().startsWith("magnet:")) {
        return true;
    }

    try {
        const parsedUrl = new URL(url, window.location.href);

        if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
        ) {
            return false;
        }

        return parsedUrl.pathname
            .toLowerCase()
            .endsWith(".torrent");
    } catch {
        return false;
    }
}

function updateContextMenu(event) {
    const link = getLinkFromEvent(event);

    const linkUrl = link?.href || "";

    chrome.runtime.sendMessage({
        type: "DELUGE_CONTEXT_MENU_VISIBILITY",
        visible: isTorrentOrMagnetLink(linkUrl)
    }).catch(() => {
        // The service worker may be restarting.
    });
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