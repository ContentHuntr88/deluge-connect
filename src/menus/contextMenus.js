import { addTorrent } from "../services/delugeService.js";
import { Presets } from "../storage/presets.js";

const ROOT_MENU = "deluge-connect";
const ADD_DEFAULT = "dc-default";
const SETTINGS = "dc-settings";
const PRESET_PREFIX = "preset-";

createMenus();

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.presets) {
        createMenus();
    }
});

async function createMenus() {
    try {
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

        const presets = await Presets.getAll();
        const enabledPresets = presets.filter(
            preset => preset.enabled !== false
        );

        if (enabledPresets.length > 0) {
            chrome.contextMenus.create({
                type: "separator",
                parentId: ROOT_MENU,
                contexts: ["link"]
            });

            for (const preset of enabledPresets) {
                chrome.contextMenus.create({
                    id: `${PRESET_PREFIX}${preset.id}`,
                    parentId: ROOT_MENU,
                    title: buildPresetTitle(preset),
                    contexts: ["link"]
                });
            }
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

        console.log("Deluge Connect context menus created.");
    } catch (error) {
        console.error("Could not create context menus:", error);
    }
}

chrome.contextMenus.onClicked.addListener(async info => {
    if (info.menuItemId === SETTINGS) {
        await chrome.runtime.openOptionsPage();
        return;
    }

    if (!info.linkUrl) {
        return;
    }

    try {
        if (info.menuItemId === ADD_DEFAULT) {
            await addTorrent(info.linkUrl);

            console.log(
                "Torrent added using Deluge's default settings."
            );

            return;
        }

        const menuItemId = String(info.menuItemId);

        if (!menuItemId.startsWith(PRESET_PREFIX)) {
            return;
        }

        const presetId = menuItemId.slice(PRESET_PREFIX.length);
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

        console.log(
            `Torrent added using preset "${preset.name}".`
        );
    } catch (error) {
        console.error("Failed to add torrent:", error);
    }
});

function buildPresetTitle(preset) {
    const icon = String(preset.icon || "").trim();
    const name = String(preset.name || "Unnamed preset").trim();

    return icon
        ? `${icon} ${name}`
        : name;
}