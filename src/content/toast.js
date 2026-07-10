const TOAST_ID = "deluge-connect-toast";
const TOAST_DURATION = 4000;

chrome.runtime.onMessage.addListener(message => {
    if (message?.type !== "DELUGE_CONNECT_TOAST") {
        return;
    }

    showToast({
        status: message.status,
        title: message.title,
        message: message.message
    });
});

function showToast({
    status = "success",
    title = "Deluge Connect",
    message = ""
}) {
    removeExistingToast();

    const toast = document.createElement("div");

    toast.id = TOAST_ID;
    toast.dataset.status = status;

    const icon = document.createElement("img");

    icon.src = chrome.runtime.getURL(
        "icons/icon48.png"
    );

    icon.alt = "";
    icon.width = 40;
    icon.height = 40;

    const content = document.createElement("div");
    content.className = "deluge-connect-toast-content";

    const titleRow = document.createElement("div");
    titleRow.className = "deluge-connect-toast-title-row";

    const statusIcon = document.createElement("span");
    statusIcon.className = "deluge-connect-toast-status-icon";
    statusIcon.textContent =
        status === "error"
            ? "✕"
            : "✓";

    const titleElement = document.createElement("strong");
    titleElement.textContent = title;

    titleRow.append(
        statusIcon,
        titleElement
    );

    const messageElement = document.createElement("div");
    messageElement.className = "deluge-connect-toast-message";
    messageElement.textContent = message;

    content.append(
        titleRow,
        messageElement
    );

    toast.append(
        icon,
        content
    );

    applyToastStyles(toast);

    document.documentElement.appendChild(toast);

    requestAnimationFrame(() => {
        toast.dataset.visible = "true";
    });

    window.setTimeout(() => {
        toast.dataset.visible = "false";

        window.setTimeout(() => {
            toast.remove();
        }, 250);
    }, TOAST_DURATION);
}

function removeExistingToast() {
    document.getElementById(TOAST_ID)?.remove();
}

function applyToastStyles(toast) {
    const style = document.createElement("style");

    style.textContent = `
        #${TOAST_ID} {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;

            display: grid;
            grid-template-columns: 40px minmax(0, 1fr);
            gap: 12px;
            align-items: center;

            width: min(360px, calc(100vw - 40px));
            padding: 14px 16px;

            color: #172033;
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid #d8dee8;
            border-left: 5px solid #15803d;
            border-radius: 12px;
            box-shadow:
                0 18px 50px rgba(15, 23, 42, 0.20),
                0 6px 16px rgba(15, 23, 42, 0.10);

            font-family:
                Inter,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;

            opacity: 0;
            transform: translateY(-12px) scale(0.98);

            transition:
                opacity 0.22s ease,
                transform 0.22s ease;

            pointer-events: none;
        }

        #${TOAST_ID}[data-visible="true"] {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        #${TOAST_ID}[data-status="error"] {
            border-left-color: #dc2626;
        }

        #${TOAST_ID} img {
            display: block;
            width: 40px;
            height: 40px;
            object-fit: contain;
        }

        #${TOAST_ID} .deluge-connect-toast-content {
            min-width: 0;
        }

        #${TOAST_ID} .deluge-connect-toast-title-row {
            display: flex;
            align-items: center;
            gap: 7px;

            margin-bottom: 4px;

            font-size: 14px;
            line-height: 1.3;
        }

        #${TOAST_ID} .deluge-connect-toast-status-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;

            width: 20px;
            height: 20px;

            color: #ffffff;
            background: #15803d;
            border-radius: 50%;

            font-size: 13px;
            font-weight: 800;
        }

        #${TOAST_ID}[data-status="error"]
        .deluge-connect-toast-status-icon {
            background: #dc2626;
        }

        #${TOAST_ID} .deluge-connect-toast-message {
            overflow-wrap: anywhere;

            color: #667085;
            font-size: 13px;
            line-height: 1.45;
        }

        @media (prefers-color-scheme: dark) {
            #${TOAST_ID} {
                color: #f8fafc;
                background: rgba(23, 32, 51, 0.98);
                border-color: #344158;
                box-shadow:
                    0 18px 50px rgba(0, 0, 0, 0.35),
                    0 6px 16px rgba(0, 0, 0, 0.25);
            }

            #${TOAST_ID} .deluge-connect-toast-message {
                color: #a7b0c0;
            }
        }
    `;

    toast.appendChild(style);
}