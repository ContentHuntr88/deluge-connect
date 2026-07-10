import { DEFAULT_PRESETS } from "../presets/defaultPresets.js";

const PRESETS_KEY = "presets";

const BUILT_IN_IDS = new Set(
    DEFAULT_PRESETS.map(preset => preset.id)
);

export class Presets {
    static async getAll() {
        const data = await chrome.storage.local.get(PRESETS_KEY);
        const savedPresets = data[PRESETS_KEY];

        const migratedPresets = migratePresets(savedPresets);

        await chrome.storage.local.set({
            [PRESETS_KEY]: migratedPresets
        });

        return migratedPresets;
    }

    static async saveAll(presets) {
        if (!Array.isArray(presets)) {
            throw new Error("Presets must be an array.");
        }

        const cleanedPresets = presets.map((preset, index) => {
            const id = String(
                preset.id || createPresetId(index)
            ).trim();

            const name = String(preset.name || "").trim();
            const icon = String(preset.icon || "").trim();
            const label = String(preset.label || "").trim();

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
                enabled: preset.enabled !== false,
                builtIn: BUILT_IN_IDS.has(id)
            };
        });

        const completePresets = addMissingBuiltInPresets(
            cleanedPresets
        );

        await chrome.storage.local.set({
            [PRESETS_KEY]: completePresets
        });

        return completePresets;
    }

    static async resetToDefaults() {
        const defaults = cloneDefaults();

        await chrome.storage.local.set({
            [PRESETS_KEY]: defaults
        });

        return defaults;
    }
}

function migratePresets(savedPresets) {
    if (!Array.isArray(savedPresets)) {
        return cloneDefaults();
    }

    const migratedSavedPresets = savedPresets
        .filter(preset => preset && typeof preset === "object")
        .map((preset, index) => {
            const id = String(
                preset.id || createPresetId(index)
            ).trim();

            return {
                id,
                name: String(preset.name || "").trim(),
                icon: String(preset.icon || "").trim(),
                label: String(preset.label || "").trim(),
                enabled: preset.enabled !== false,
                builtIn: BUILT_IN_IDS.has(id)
            };
        })
        .filter(preset => preset.name);

    return addMissingBuiltInPresets(migratedSavedPresets);
}

function addMissingBuiltInPresets(presets) {
    const presetsById = new Map(
        presets.map(preset => [preset.id, preset])
    );

    const builtInPresets = DEFAULT_PRESETS.map(defaultPreset => {
        const savedPreset = presetsById.get(defaultPreset.id);

        if (!savedPreset) {
            return { ...defaultPreset };
        }

        presetsById.delete(defaultPreset.id);

        return {
            ...defaultPreset,
            ...savedPreset,
            builtIn: true
        };
    });

    const customPresets = Array.from(presetsById.values()).map(
        preset => ({
            ...preset,
            builtIn: false
        })
    );

    return [
        ...builtInPresets,
        ...customPresets
    ];
}

function cloneDefaults() {
    return DEFAULT_PRESETS.map(preset => ({
        ...preset
    }));
}

function createPresetId(index) {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `preset-${Date.now()}-${index}`;
}