import { addTorrent } from "../services/delugeService.js";
import { DEFAULT_PRESETS } from "../presets/defaultPresets.js";

const ROOT_MENU = "deluge-connect";
const ADD_DEFAULT = "dc-default";
const SETTINGS = "dc-settings";

createMenus();

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

async function createMenus() {
    await chrome.contextMenus.removeAll();

    chrome.contextMenus.create({
        id: ROOT_MENU,
        title: "Deluge Connect",
        contexts: ["link"]
    });

    chrome.contextMenus.create({
        id: ADD_DEFAULT,
        parentId: ROOT_MENU,
        title: "⬇ Add to Deluge",
        contexts: ["link"]
    });

    chrome.contextMenus.create({
        type: "separator",
        parentId: ROOT_MENU,
        contexts: ["link"]
    });

    for (const preset of DEFAULT_PRESETS) {
        chrome.contextMenus.create({
            id: `preset-${preset.id}`,
            parentId: ROOT_MENU,
            title: `${preset.icon} ${preset.name}`,
            contexts: ["link"]
        });
    }

    chrome.contextMenus.create({
        type: "separator",
        parentId: ROOT_MENU,
        contexts: ["link"]
    });

    chrome.contextMenus.create({
        id: SETTINGS,
        parentId: ROOT_MENU,
        title: "⚙ Settings",
        contexts: ["link"]
    });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
    if (!info.linkUrl) {
        return;
    }

    if (info.menuItemId === SETTINGS) {
        await chrome.runtime.openOptionsPage();
        return;
    }

    try {
        if (info.menuItemId === ADD_DEFAULT) {
            await addTorrent(info.linkUrl);
            console.log("Torrent added with default settings.");
            return;
        }

        const menuItemId = String(info.menuItemId);

        if (!menuItemId.startsWith("preset-")) {
            return;
        }

        const presetId = menuItemId.replace("preset-", "");

        const preset = DEFAULT_PRESETS.find(
            item => item.id === presetId
        );

        if (!preset) {
            throw new Error(
                `Could not find preset "${presetId}".`
            );
        }

        await addTorrent(info.linkUrl, preset);

        console.log(
            `Torrent added using preset: ${preset.name}`
        );
    } catch (error) {
        console.error("Failed to add torrent:", error);
    }
});