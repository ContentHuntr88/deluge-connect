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

chrome.contextMenus.onClicked.addListener(async info => {
    const menuItemId = String(info.menuItemId);

    if (!menuItemId.startsWith(PRESET_MENU_PREFIX)) {
        return;
    }

    if (!info.linkUrl) {
        return;
    }

    try {
        const presetId = menuItemId.slice(
            PRESET_MENU_PREFIX.length
        );

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
            `Added to Deluge using preset "${preset.name}".`
        );
    } catch (error) {
        console.error(
            "Failed to add torrent to Deluge:",
            error
        );
    }
});

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
    const menuProperties = {
        id: `${PRESET_MENU_PREFIX}${preset.id}`,
        title: buildPresetTitle(preset),
        contexts: ["link"]
    };

    if (parentId) {
        menuProperties.parentId = parentId;
    }

    chrome.contextMenus.create(menuProperties);
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