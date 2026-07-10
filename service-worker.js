import "./src/menus/contextMenus.js";

chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

console.log("Deluge Connect started.");