import { Settings } from "../storage/settings.js";
import { testConnection } from "../api/deluge.js";

const serverUrl = document.getElementById("serverUrl");
const password = document.getElementById("password");

const saveButton = document.getElementById("saveButton");
const testButton = document.getElementById("testButton");

const status = document.getElementById("status");

initialize();

async function initialize() {

    const settings = await Settings.get();

    serverUrl.value = settings.serverUrl;
    password.value = settings.password;

}

document
    .getElementById("settingsForm")
    .addEventListener("submit", saveSettings);

testButton.addEventListener("click", runConnectionTest);

async function saveSettings(event) {

    event.preventDefault();

    await Settings.save({

        serverUrl: serverUrl.value.trim(),

        password: password.value.trim(),

        rememberPassword: true

    });

    showStatus("✔ Settings saved", false);

}

async function runConnectionTest() {

    showStatus("Connecting...", false);

    try {

        await Settings.save({

            serverUrl: serverUrl.value.trim(),

            password: password.value.trim(),

            rememberPassword: true

        });

        const result = await testConnection();

        if (result.connected) {

            if (result.apiVersion) {

                showStatus(
                    `✔ Connected (Deluge ${result.apiVersion})`,
                    false
                );

            } else {

                showStatus(
                    "✔ Connected",
                    false
                );

            }

        }

    }
    catch (error) {

        showStatus(error.message, true);

        console.error(error);

    }

}

function showStatus(message, isError) {

    status.textContent = message;

    status.style.color = isError
        ? "#c62828"
        : "#2e7d32";

}