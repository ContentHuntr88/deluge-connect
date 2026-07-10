import {
    addTorrent,
    LabelWarning
} from "../services/delugeService.js";

import { Presets } from "../storage/presets.js";

const ROOT_MENU_ID = "deluge-connect";
const PRESET_MENU_PREFIX = "deluge-connect-preset-";
const MINIMUM_LOADING_TIME = 600;

let isSendingTorrent = false;
let menuBuildQueue = Promise.resolve();

scheduleMenuRebuild();

chrome.runtime.onInstalled.addListener(() => {
    scheduleMenuRebuild();
});

chrome.runtime.onStartup.addListener(() => {
    scheduleMenuRebuild();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.presets) {
        scheduleMenuRebuild();
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

    if (isSendingTorrent) {
        await showBrowserToast(tab, {
            status: "warning",
            title: "Already sending",
            message:
                "Please wait for the current torrent to finish sending."
        });

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

    isSendingTorrent = true;

    const loadingStartedAt = Date.now();

    await showBrowserToast(tab, {
        status: "loading",
        title: "Sending to Deluge",
        message: getTorrentName(info.linkUrl)
    });

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
        await waitForMinimumLoadingTime(loadingStartedAt);

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
        await waitForMinimumLoadingTime(loadingStartedAt);

        console.error(
            "Failed to add torrent to Deluge:",
            error
        );

        if (error instanceof LabelWarning) {
            await showBrowserToast(tab, {
                status: "warning",
                title: "Label not applied",
                message: error.message
            });

            return;
        }

        await showBrowserToast(tab, {
            status: "error",
            title: "Failed to add torrent",
            message: getErrorMessage(error)
        });
    } finally {
        isSendingTorrent = false;
    }
}

async function waitForMinimumLoadingTime(startedAt) {
    const elapsedTime = Date.now() - startedAt;

    const remainingTime =
        MINIMUM_LOADING_TIME - elapsedTime;

    if (remainingTime <= 0) {
        return;
    }

    await new Promise(resolve => {
        setTimeout(resolve, remainingTime);
    });
}

function scheduleMenuRebuild() {
    menuBuildQueue = menuBuildQueue
        .catch(() => {
            // Keep the queue usable after a failed rebuild.
        })
        .then(() => createMenus());

    return menuBuildQueue;
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
            await createPresetMenuItem(enabledPresets[0]);

            console.log(
                "Created one-click Deluge Connect menu."
            );

            return;
        }

        await createContextMenuItem({
            id: ROOT_MENU_ID,
            title: "Add to Deluge",
            contexts: ["link"]
        });

        for (const preset of enabledPresets) {
            await createPresetMenuItem(
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

async function createPresetMenuItem(
    preset,
    parentId = null
) {
    const properties = {
        id: `${PRESET_MENU_PREFIX}${preset.id}`,
        title: buildPresetTitle(preset),
        contexts: ["link"]
    };

    if (parentId) {
        properties.parentId = parentId;
    }

    await createContextMenuItem(properties);
}

function createContextMenuItem(properties) {
    return new Promise((resolve, reject) => {
        chrome.contextMenus.create(properties, () => {
            const error = chrome.runtime.lastError;

            if (error) {
                reject(new Error(error.message));
                return;
            }

            resolve();
        });
    });
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
        lowerMessage.includes("duplicate") ||
        lowerMessage.includes("in session")
    ) {
        return "This torrent is already in Deluge.";
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
    const DISPLAY_DURATION = 5000;
    const ANIMATION_DURATION = 260;

    const toastStyles = {
        loading: {
            accentColor: "#2563eb",
            statusSymbol: ""
        },
        success: {
            accentColor: "#15803d",
            statusSymbol: "✓"
        },
        warning: {
            accentColor: "#d97706",
            statusSymbol: "!"
        },
        error: {
            accentColor: "#dc2626",
            statusSymbol: "✕"
        }
    };

    const selectedStyle =
        toastStyles[status] || toastStyles.error;

    function resetToastAnimations(toast) {
        window.clearTimeout(
            toast._delugeRemovalTimer
        );

        toast._delugeProgressAnimation?.cancel();
        toast._delugeSpinnerAnimation?.cancel();

        toast._delugeRemovalTimer = null;
        toast._delugeProgressAnimation = null;
        toast._delugeSpinnerAnimation = null;
    }

    function dismissToast(toast) {
        resetToastAnimations(toast);

        toast.style.opacity = "0";
        toast.style.transform =
            "translateX(32px) scale(0.98)";

        window.setTimeout(() => {
            toast.remove();
        }, ANIMATION_DURATION);
    }

    let toast = document.getElementById(TOAST_ID);

    if (!toast) {
        toast = document.createElement("div");
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
            transform:
                "translateX(32px) scale(0.98)",

            transition:
                `opacity ${ANIMATION_DURATION}ms ease, ` +
                `transform ${ANIMATION_DURATION}ms ` +
                "cubic-bezier(0.2, 0.8, 0.2, 1)"
        });

        const logo = document.createElement("img");
        logo.src = iconUrl;
        logo.alt = "";

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

        const statusIcon =
            document.createElement("span");

        statusIcon.dataset.role = "status-icon";

        Object.assign(statusIcon.style, {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            flex: "0 0 20px",
            color: "#ffffff",
            borderRadius: "50%",
            fontSize: "13px",
            fontWeight: "800"
        });

        const titleElement =
            document.createElement("strong");

        titleElement.dataset.role = "title";

        const messageElement =
            document.createElement("div");

        messageElement.dataset.role = "message";

        Object.assign(messageElement.style, {
            overflowWrap: "anywhere",
            color: "#667085",
            fontSize: "13px",
            lineHeight: "1.45"
        });

        const progressTrack =
            document.createElement("div");

        Object.assign(progressTrack.style, {
            position: "absolute",
            right: "0",
            bottom: "0",
            left: "0",
            height: "4px",
            background: "rgba(15, 23, 42, 0.08)"
        });

        const progressBar =
            document.createElement("div");

        progressBar.dataset.role = "progress-bar";

        Object.assign(progressBar.style, {
            width: "100%",
            height: "100%",
            transformOrigin: "left center"
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

        toast.addEventListener("click", () => {
            dismissToast(toast);
        });

        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform =
                "translateX(0) scale(1)";
        });
    }

    resetToastAnimations(toast);

    const statusIcon = toast.querySelector(
        '[data-role="status-icon"]'
    );

    const titleElement = toast.querySelector(
        '[data-role="title"]'
    );

    const messageElement = toast.querySelector(
        '[data-role="message"]'
    );

    const progressBar = toast.querySelector(
        '[data-role="progress-bar"]'
    );

    toast.style.borderLeft =
        `5px solid ${selectedStyle.accentColor}`;

    statusIcon.textContent =
        selectedStyle.statusSymbol;

    statusIcon.style.background =
        selectedStyle.accentColor;

    statusIcon.style.border = "none";
    statusIcon.style.boxSizing = "content-box";
    statusIcon.style.transform = "rotate(0deg)";

    titleElement.textContent = title;
    messageElement.textContent = message;

    progressBar.style.background =
        selectedStyle.accentColor;

    progressBar.style.transform = "scaleX(1)";

    if (status === "loading") {
        statusIcon.style.background = "transparent";

        statusIcon.style.border =
            `3px solid ${selectedStyle.accentColor}33`;

        statusIcon.style.borderTopColor =
            selectedStyle.accentColor;

        statusIcon.style.boxSizing = "border-box";

        toast._delugeSpinnerAnimation =
            statusIcon.animate(
                [
                    {
                        transform: "rotate(0deg)"
                    },
                    {
                        transform: "rotate(360deg)"
                    }
                ],
                {
                    duration: 800,
                    iterations: Infinity,
                    easing: "linear"
                }
            );

        toast._delugeProgressAnimation =
            progressBar.animate(
                [
                    {
                        transform:
                            "translateX(-100%) scaleX(0.35)"
                    },
                    {
                        transform:
                            "translateX(290%) scaleX(0.35)"
                    }
                ],
                {
                    duration: 1100,
                    iterations: Infinity,
                    easing: "ease-in-out"
                }
            );

        return;
    }

    toast._delugeProgressAnimation =
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

    toast._delugeRemovalTimer = window.setTimeout(
        () => {
            dismissToast(toast);
        },
        DISPLAY_DURATION
    );
}