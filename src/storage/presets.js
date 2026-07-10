import { DEFAULT_PRESETS } from "../presets/defaultPresets.js";

const PRESETS_KEY = "presets";

export class Presets {
    static async getAll() {
        const data = await chrome.storage.local.get(PRESETS_KEY);

        if (
            !Array.isArray(data[PRESETS_KEY]) ||
            data[PRESETS_KEY].length === 0
        ) {
            const defaults = structuredClone(DEFAULT_PRESETS);

            await chrome.storage.local.set({
                [PRESETS_KEY]: defaults
            });

            return defaults;
        }

        return data[PRESETS_KEY];
    }

    static async saveAll(presets) {
        if (!Array.isArray(presets)) {
            throw new Error("Presets must be an array.");
        }

        const cleanedPresets = presets.map((preset, index) => {
            const id = String(
                preset.id || `preset-${Date.now()}-${index}`
            ).trim();

            const name = String(preset.name || "").trim();
            const icon = String(preset.icon || "").trim();
            const label = String(preset.label || "").trim();
            const downloadLocation = String(
                preset.downloadLocation || ""
            ).trim();

            if (!name) {
                throw new Error(
                    `Preset ${index + 1} requires a name.`
                );
            }

            return {
                id,
                name,
                icon,
                label,
                downloadLocation,
                enabled: preset.enabled !== false
            };
        });

        await chrome.storage.local.set({
            [PRESETS_KEY]: cleanedPresets
        });

        return cleanedPresets;
    }

    static async resetToDefaults() {
        const defaults = structuredClone(DEFAULT_PRESETS);

        await chrome.storage.local.set({
            [PRESETS_KEY]: defaults
        });

        return defaults;
    }
}