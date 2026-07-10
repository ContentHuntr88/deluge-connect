chrome.runtime.onInstalled.addListener(() => {

    chrome.contextMenus.create({
        id: "addToDeluge",
        title: "Add to Deluge",
        contexts: ["link"],
        targetUrlPatterns: [
            "magnet:*",
            "*.torrent"
        ]
    });

});

chrome.contextMenus.onClicked.addListener((info) => {

    if (info.menuItemId === "addToDeluge") {

        console.log(info.linkUrl);

        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Deluge Connect",
            message: "Torrent captured!"
        });

    }

});