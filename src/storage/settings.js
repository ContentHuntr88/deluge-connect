const DEFAULT_SETTINGS = {
    serverUrl: "http://10.14.88.11:8112",
    password: "",
    rememberPassword: true
};

export class Settings {

    static async get() {

        const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

        return settings;

    }

    static async save(settings) {

        await chrome.storage.local.set(settings);

    }

    static async clear() {

        await chrome.storage.local.clear();

    }

}