import { addTorrent } from "../services/delugeService.js";

const MENU_ID = "deluge-connect-add";

createContextMenu();

chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

async function createContextMenu() {
    try {
        await chrome.contextMenus.removeAll();

        chrome.contextMenus.create(
            {
                id: MENU_ID,
                title: "Add to Deluge",
                contexts: ["link"]
            },
            () => {
                if (chrome.runtime.lastError) {
                    console.error(
                        "Context menu error:",
                        chrome.runtime.lastError.message
                    );

                    return;
                }

                console.log("Deluge Connect context menu created.");
            }
        );
    } catch (error) {
        console.error("Failed to create context menu:", error);
    }
}

chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== MENU_ID) {
        return;
    }

    const linkUrl = String(info.linkUrl || "").trim();

    console.log("Selected link:", linkUrl);

    try {
        await addTorrent(linkUrl);

        console.log("Torrent added successfully.");
    } catch (error) {
        console.error("Failed to add torrent:", error);
    }
});