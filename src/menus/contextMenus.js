import { addTorrent } from "../services/delugeService.js";
import { Presets } from "../storage/presets.js";

const ROOT_MENU_ID = "deluge-connect";
const PRESET_MENU_PREFIX = "deluge-connect-preset-";

createMenus();

chrome.runtime.onInstalled.addListener(() => {
    createMenus();
});

chrome.runtime.onStartup.addListener(() => {
    createMenus();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.presets) {
        createMenus();
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    handleMenuClick(info, tab);
});

async function handleMenuClick(info, tab) {
    const menuItemId = String(info.menuItemId);

    if (!menuItemId.startsWith(PRESET_MENU_PREFIX)) {
        return;
    }

    if (!info.linkUrl) {
        await showBrowserToast(tab, {
            status: "error",
            title: "Failed to add torrent",
            message: "No torrent or magnet link was detected."
        });

        return;
    }

    const presetId = menuItemId.slice(
        PRESET_MENU_PREFIX.length
    );

    try {
        const presets = await Presets.getAll();

        const preset = presets.find(
            item => item.id === presetId
        );

        if (!preset) {
            throw new Error(
                `Preset "${presetId}" could not be found.`
            );
        }

        await addTorrent(info.linkUrl, preset);

        await showBrowserToast(tab, {
            status: "success",
            title: "Added to Deluge",
            message: buildSuccessMessage(
                info.linkUrl,
                preset
            )
        });

        console.log(
            `Added to Deluge using preset "${preset.name}".`
        );
    } catch (error) {
        const message = getErrorMessage(error);

        console.error(
            "Failed to add torrent to Deluge:",
            error
        );

        await showBrowserToast(tab, {
            status: "error",
            title: "Failed to add torrent",
            message
        });
    }
}

async function createMenus() {
    try {
        await chrome.contextMenus.removeAll();

        const presets = await Presets.getAll();

        const enabledPresets = presets.filter(
            preset => preset.enabled !== false
        );

        if (enabledPresets.length === 0) {
            console.log(
                "No Deluge Connect presets are enabled."
            );

            return;
        }

        if (enabledPresets.length === 1) {
            createPresetMenuItem(enabledPresets[0]);

            console.log(
                "Created one-click Deluge Connect menu."
            );

            return;
        }

        chrome.contextMenus.create({
            id: ROOT_MENU_ID,
            title: "Add to Deluge",
            contexts: ["link"]
        });

        for (const preset of enabledPresets) {
            createPresetMenuItem(
                preset,
                ROOT_MENU_ID
            );
        }

        console.log(
            `Created Deluge Connect menu with ` +
            `${enabledPresets.length} presets.`
        );
    } catch (error) {
        console.error(
            "Could not create Deluge Connect menus:",
            error
        );
    }
}

function createPresetMenuItem(preset, parentId = null) {
    const properties = {
        id: `${PRESET_MENU_PREFIX}${preset.id}`,
        title: buildPresetTitle(preset),
        contexts: ["link"]
    };

    if (parentId) {
        properties.parentId = parentId;
    }

    chrome.contextMenus.create(properties);
}

function buildPresetTitle(preset) {
    const icon = String(preset.icon || "").trim();

    const name = String(
        preset.name || "Unnamed preset"
    ).trim();

    return icon
        ? `${icon} ${name}`
        : name;
}

function buildSuccessMessage(linkUrl, preset) {
    const torrentName = getTorrentName(linkUrl);
    const presetName = String(preset.name || "").trim();

    if (
        preset.label &&
        presetName &&
        presetName !== "Add to Deluge"
    ) {
        return `${torrentName} — ${presetName}`;
    }

    return torrentName;
}

function getTorrentName(linkUrl) {
    if (linkUrl.startsWith("magnet:")) {
        try {
            const queryStart = linkUrl.indexOf("?");

            if (queryStart === -1) {
                return "Magnet link";
            }

            const parameters = new URLSearchParams(
                linkUrl.slice(queryStart + 1)
            );

            const displayName = parameters.get("dn");

            return displayName
                ? decodeURIComponent(displayName)
                : "Magnet link";
        } catch {
            return "Magnet link";
        }
    }

    try {
        const url = new URL(linkUrl);

        const filename = decodeURIComponent(
            url.pathname.split("/").pop() || ""
        );

        return filename || url.hostname;
    } catch {
        return "Torrent link";
    }
}

function getErrorMessage(error) {
    const message = String(
        error?.message || "An unknown error occurred."
    );

    const lowerMessage = message.toLowerCase();

    if (
        lowerMessage.includes("password") ||
        lowerMessage.includes("authentication") ||
        lowerMessage.includes("login") ||
        lowerMessage.includes("rejected")
    ) {
        return "Authentication failed. Check your Deluge password.";
    }

    if (
        lowerMessage.includes("failed to fetch") ||
        lowerMessage.includes("network") ||
        lowerMessage.includes("unreachable") ||
        lowerMessage.includes("connection")
    ) {
        return "Could not connect to the Deluge server.";
    }

    if (
        lowerMessage.includes("already exist") ||
        lowerMessage.includes("duplicate")
    ) {
        return "This torrent already exists in Deluge.";
    }

    return message;
}

async function showBrowserToast(tab, {
    status,
    title,
    message
}) {
    if (!tab?.id) {
        console.error(
            "Could not display toast because no browser tab was available."
        );

        return;
    }

    try {
        await chrome.scripting.executeScript({
            target: {
                tabId: tab.id
            },
            func: renderDelugeToast,
            args: [
                {
                    status,
                    title,
                    message,
                    iconUrl: chrome.runtime.getURL(
                        "icons/icon48.png"
                    )
                }
            ]
        });
    } catch (error) {
        console.error(
            "Could not inject Deluge Connect toast:",
            error
        );
    }
}

function renderDelugeToast({
    status,
    title,
    message,
    iconUrl
}) {
    const TOAST_ID = "deluge-connect-toast";
    const DISPLAY_DURATION = 4000;
    const ANIMATION_DURATION = 260;

    document.getElementById(TOAST_ID)?.remove();

    const accentColor =
        status === "error"
            ? "#dc2626"
            : "#15803d";

    const statusSymbol =
        status === "error"
            ? "✕"
            : "✓";

    const toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.title = "Click to dismiss";

    Object.assign(toast.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "2147483647",

        display: "grid",
        gridTemplateColumns: "42px minmax(0, 1fr)",
        gap: "12px",
        alignItems: "center",

        width: "min(370px, calc(100vw - 40px))",
        padding: "14px 16px 17px",

        color: "#172033",
        background: "rgba(255, 255, 255, 0.98)",
        border: "1px solid #d8dee8",
        borderLeft: `5px solid ${accentColor}`,
        borderRadius: "12px",

        boxShadow:
            "0 18px 50px rgba(15, 23, 42, 0.22), " +
            "0 6px 16px rgba(15, 23, 42, 0.10)",

        fontFamily:
            "Inter, system-ui, -apple-system, " +
            "BlinkMacSystemFont, Segoe UI, sans-serif",

        overflow: "hidden",
        cursor: "pointer",
        opacity: "0",
        transform: "translateX(32px) scale(0.98)",

        transition:
            `opacity ${ANIMATION_DURATION}ms ease, ` +
            `transform ${ANIMATION_DURATION}ms ` +
            "cubic-bezier(0.2, 0.8, 0.2, 1)"
    });

    const logo = document.createElement("img");
    logo.src = iconUrl;
    logo.alt = "";
    logo.width = 42;
    logo.height = 42;

    Object.assign(logo.style, {
        display: "block",
        width: "42px",
        height: "42px",
        objectFit: "contain"
    });

    const content = document.createElement("div");
    content.style.minWidth = "0";

    const titleRow = document.createElement("div");

    Object.assign(titleRow.style, {
        display: "flex",
        alignItems: "center",
        gap: "7px",
        marginBottom: "4px",
        fontSize: "14px",
        lineHeight: "1.3"
    });

    const statusIcon = document.createElement("span");
    statusIcon.textContent = statusSymbol;

    Object.assign(statusIcon.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "20px",
        height: "20px",
        flex: "0 0 20px",
        color: "#ffffff",
        background: accentColor,
        borderRadius: "50%",
        fontSize: "13px",
        fontWeight: "800"
    });

    const titleElement = document.createElement("strong");
    titleElement.textContent = title;

    const messageElement = document.createElement("div");
    messageElement.textContent = message;

    Object.assign(messageElement.style, {
        overflowWrap: "anywhere",
        color: "#667085",
        fontSize: "13px",
        lineHeight: "1.45"
    });

    const progressTrack = document.createElement("div");

    Object.assign(progressTrack.style, {
        position: "absolute",
        right: "0",
        bottom: "0",
        left: "0",
        height: "4px",
        background: "rgba(15, 23, 42, 0.08)"
    });

    const progressBar = document.createElement("div");

    Object.assign(progressBar.style, {
        width: "100%",
        height: "100%",
        background: accentColor,
        transformOrigin: "left center",
        transform: "scaleX(1)"
    });

    progressTrack.appendChild(progressBar);

    titleRow.append(
        statusIcon,
        titleElement
    );

    content.append(
        titleRow,
        messageElement
    );

    toast.append(
        logo,
        content,
        progressTrack
    );

    document.documentElement.appendChild(toast);

    let dismissed = false;
    let removalTimer;

    function dismissToast() {
        if (dismissed) {
            return;
        }

        dismissed = true;

        window.clearTimeout(removalTimer);

        toast.style.opacity = "0";
        toast.style.transform =
            "translateX(32px) scale(0.98)";

        window.setTimeout(() => {
            toast.remove();
        }, ANIMATION_DURATION);
    }

    toast.addEventListener("click", dismissToast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform =
            "translateX(0) scale(1)";

        progressBar.animate(
            [
                {
                    transform: "scaleX(1)"
                },
                {
                    transform: "scaleX(0)"
                }
            ],
            {
                duration: DISPLAY_DURATION,
                easing: "linear",
                fill: "forwards"
            }
        );
    });

    removalTimer = window.setTimeout(
        dismissToast,
        DISPLAY_DURATION
    );
}