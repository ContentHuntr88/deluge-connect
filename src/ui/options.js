import { Settings } from "../storage/settings.js";
import { Presets } from "../storage/presets.js";
import { testConnection } from "../api/deluge.js";

const settingsForm = document.getElementById("settingsForm");

const serverUrlInput = document.getElementById("serverUrl");
const passwordInput = document.getElementById("password");

const saveButton = document.getElementById("saveButton");
const testButton = document.getElementById("testButton");
const status = document.getElementById("status");

const presetList = document.getElementById("presetList");
const addPresetButton = document.getElementById("addPresetButton");
const savePresetsButton = document.getElementById(
    "savePresetsButton"
);

let presets = [];

initialize();

settingsForm.addEventListener("submit", saveSettings);
testButton.addEventListener("click", runConnectionTest);
addPresetButton.addEventListener("click", addCustomPreset);
savePresetsButton.addEventListener("click", savePresets);

async function initialize() {
    try {
        const settings = await Settings.get();

        serverUrlInput.value = settings.serverUrl || "";
        passwordInput.value = settings.password || "";

        presets = await Presets.getAll();

        renderPresets();

        addPresetButton.disabled = false;
        savePresetsButton.disabled = false;
    } catch (error) {
        showStatus(
            error.message || "Failed to load settings.",
            true
        );

        console.error(error);
    }
}

async function saveSettings(event) {
    event.preventDefault();

    saveButton.disabled = true;

    try {
        await Settings.save({
            serverUrl: serverUrlInput.value.trim(),
            password: passwordInput.value,
            rememberPassword: true
        });

        showStatus("✔ Settings saved", false);
    } catch (error) {
        showStatus(
            error.message || "Failed to save settings.",
            true
        );

        console.error(error);
    } finally {
        saveButton.disabled = false;
    }
}

async function runConnectionTest() {
    testButton.disabled = true;

    showStatus("Connecting...", false);

    try {
        await Settings.save({
            serverUrl: serverUrlInput.value.trim(),
            password: passwordInput.value,
            rememberPassword: true
        });

        const result = await testConnection();

        if (!result || result.connected !== true) {
            throw new Error(
                result?.message ||
                "Could not connect to Deluge."
            );
        }

        if (result.apiVersion) {
            showStatus(
                `✔ Connected to Deluge ${result.apiVersion}`,
                false
            );
        } else {
            showStatus("✔ Connected to Deluge", false);
        }
    } catch (error) {
        showStatus(
            `✖ ${error.message || "Connection failed."}`,
            true
        );

        console.error(error);
    } finally {
        testButton.disabled = false;
    }
}

function addCustomPreset() {
    readPresetValues();

    presets.push({
        id: createPresetId(),
        name: "Custom Preset",
        icon: "⬇️",
        label: "",
        enabled: true,
        builtIn: false
    });

    renderPresets();

    const customRows = presetList.querySelectorAll(
        '.preset-row[data-built-in="false"]'
    );

    const newestRow = customRows[
        customRows.length - 1
    ];

    const nameInput = newestRow?.querySelector(
        '[data-field="name"]'
    );

    nameInput?.focus();
    nameInput?.select();

    showStatus(
        "Custom preset added. Click Save Presets when finished.",
        false
    );
}

function deleteCustomPreset(presetId) {
    readPresetValues();

    const preset = presets.find(
        item => item.id === presetId
    );

    if (!preset || preset.builtIn) {
        return;
    }

    const confirmed = window.confirm(
        `Delete the "${preset.name}" preset?`
    );

    if (!confirmed) {
        return;
    }

    presets = presets.filter(
        item => item.id !== presetId
    );

    renderPresets();

    showStatus(
        "Preset removed. Click Save Presets to keep the change.",
        false
    );
}

async function savePresets() {
    savePresetsButton.disabled = true;
    addPresetButton.disabled = true;

    try {
        readPresetValues();

        presets = await Presets.saveAll(presets);

        renderPresets();

        showStatus("✔ Presets saved", false);
    } catch (error) {
        showStatus(
            error.message || "Failed to save presets.",
            true
        );

        console.error(error);
    } finally {
        savePresetsButton.disabled = false;
        addPresetButton.disabled = false;
    }
}

function readPresetValues() {
    const rows = presetList.querySelectorAll(
        ".preset-row"
    );

    presets = Array.from(rows).map(row => ({
        id: row.dataset.presetId,
        icon: getFieldValue(row, "icon"),
        name: getFieldValue(row, "name"),
        label: getFieldValue(row, "label"),
        enabled: getCheckboxValue(row, "enabled"),
        builtIn: row.dataset.builtIn === "true"
    }));
}

function renderPresets() {
    presetList.replaceChildren();

    const table = document.createElement("div");
    table.className = "preset-table";

    table.appendChild(createTableHeader());

    for (const preset of presets) {
        table.appendChild(createPresetRow(preset));
    }

    presetList.appendChild(table);
}

function createTableHeader() {
    const header = document.createElement("div");

    header.className = "preset-table-header";

    header.append(
        createHeaderCell("Icon"),
        createHeaderCell("Name"),
        createHeaderCell("Deluge label"),
        createHeaderCell("Show in menu"),
        createHeaderCell("")
    );

    return header;
}

function createHeaderCell(text) {
    const cell = document.createElement("div");

    cell.textContent = text;

    return cell;
}

function createPresetRow(preset) {
    const row = document.createElement("div");

    row.className = "preset-row";
    row.dataset.presetId = preset.id;
    row.dataset.builtIn = String(preset.builtIn);

    const iconInput = createInput({
        field: "icon",
        value: preset.icon,
        placeholder: "📺",
        ariaLabel: `${preset.name} icon`
    });

    const nameInput = createInput({
        field: "name",
        value: preset.name,
        placeholder: "Preset name",
        ariaLabel: `${preset.name} name`
    });

    const labelInput = createInput({
        field: "label",
        value: preset.label,
        placeholder: "Blank for normal Deluge download",
        ariaLabel: `${preset.name} Deluge label`
    });

    const enabledCell = document.createElement("div");
    enabledCell.className = "preset-enabled-cell";

    const enabledInput = document.createElement("input");
    enabledInput.type = "checkbox";
    enabledInput.dataset.field = "enabled";
    enabledInput.checked = preset.enabled !== false;
    enabledInput.setAttribute(
        "aria-label",
        `Show ${preset.name} in right-click menu`
    );

    enabledCell.appendChild(enabledInput);

    const actionCell = document.createElement("div");
    actionCell.className = "preset-action-cell";

    if (!preset.builtIn) {
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "delete-preset";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteCustomPreset(preset.id);
        });

        actionCell.appendChild(deleteButton);
    }

    row.append(
        createInputCell(iconInput, "preset-icon-cell"),
        createInputCell(nameInput),
        createInputCell(labelInput),
        enabledCell,
        actionCell
    );

    return row;
}

function createInput({
    field,
    value,
    placeholder,
    ariaLabel
}) {
    const input = document.createElement("input");

    input.type = "text";
    input.dataset.field = field;
    input.value = value || "";
    input.placeholder = placeholder || "";
    input.setAttribute("aria-label", ariaLabel);

    return input;
}

function createInputCell(input, extraClass = "") {
    const cell = document.createElement("div");

    cell.className = extraClass;

    cell.appendChild(input);

    return cell;
}

function getFieldValue(row, field) {
    const input = row.querySelector(
        `[data-field="${field}"]`
    );

    return input ? input.value.trim() : "";
}

function getCheckboxValue(row, field) {
    const input = row.querySelector(
        `[data-field="${field}"]`
    );

    return input ? input.checked : false;
}

function createPresetId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `preset-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
}

function showStatus(message, isError) {
    status.textContent = message;

    status.style.color = isError
        ? "#c62828"
        : "#2e7d32";
}