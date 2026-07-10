import { callDeluge } from "../api/deluge.js";

const DUPLICATE_TORRENT_ERROR =
    "This torrent is already in Deluge.";

export class LabelWarning extends Error {
    constructor(message) {
        super(message);
        this.name = "LabelWarning";
    }
}

export async function addTorrent(torrentUrl, preset = {}) {
    const url = String(torrentUrl || "").trim();

    if (!url) {
        throw new Error(
            "No torrent or magnet link was provided."
        );
    }

    let result;

    if (url.toLowerCase().startsWith("magnet:")) {
        result = await addMagnet(url);
    } else if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {
        result = await addTorrentFromUrl(url);
    } else {
        throw new Error(
            "Unsupported link. Deluge Connect accepts magnet, HTTP and HTTPS links."
        );
    }

    const torrentIds = extractTorrentIds(result);
    const label = String(preset.label || "").trim();

    if (label && torrentIds.length > 0) {
        await applyLabel(torrentIds, label);
    }

    return result;
}

async function addMagnet(magnetUrl) {
    const torrentId = await callDeluge(
        "core.add_torrent_magnet",
        [magnetUrl, {}]
    );

    if (!torrentId) {
        throw new Error(DUPLICATE_TORRENT_ERROR);
    }

    return torrentId;
}

async function addTorrentFromUrl(torrentUrl) {
    const temporaryPath = await callDeluge(
        "web.download_torrent_from_url",
        [torrentUrl, null]
    );

    if (!temporaryPath) {
        throw new Error(
            "Deluge could not download the torrent file."
        );
    }

    const result = await callDeluge(
        "web.add_torrents",
        [[
            {
                path: temporaryPath,
                options: {}
            }
        ]]
    );

    validateTorrentFileResult(result);

    return result;
}

function validateTorrentFileResult(result) {
    if (result === false || result === null) {
        throw new Error(DUPLICATE_TORRENT_ERROR);
    }

    if (!Array.isArray(result)) {
        return;
    }

    if (result.length === 0) {
        throw new Error(
            "Deluge did not return a result for the torrent."
        );
    }

    const torrentIds = extractTorrentIds(result);

    if (torrentIds.length > 0) {
        return;
    }

    const resultText = JSON.stringify(result)
        .toLowerCase();

    if (
        resultText.includes("already") ||
        resultText.includes("duplicate") ||
        resultText.includes("exists") ||
        resultText.includes("in session")
    ) {
        throw new Error(DUPLICATE_TORRENT_ERROR);
    }

    const failedResult = result.find(
        item => isFailedTorrentResult(item)
    );

    if (failedResult) {
        const failureMessage =
            extractFailureMessage(failedResult);

        throw new Error(
            failureMessage ||
            "Deluge could not add the torrent file."
        );
    }
}

function isFailedTorrentResult(result) {
    if (result === false || result === null) {
        return true;
    }

    if (Array.isArray(result)) {
        return result[0] === false;
    }

    if (
        typeof result === "object" &&
        result !== null
    ) {
        return (
            result.success === false ||
            Boolean(result.error) ||
            Boolean(result.error_msg)
        );
    }

    return false;
}

function extractFailureMessage(result) {
    if (Array.isArray(result)) {
        const message = result.find(
            item =>
                typeof item === "string" &&
                item.trim()
        );

        return normalizeFailureMessage(message);
    }

    if (
        typeof result === "object" &&
        result !== null
    ) {
        const message =
            result.error_msg ||
            result.error ||
            result.message;

        return normalizeFailureMessage(message);
    }

    return "";
}

function normalizeFailureMessage(message) {
    const value = String(message || "").trim();

    if (!value) {
        return "";
    }

    const lowerValue = value.toLowerCase();

    if (
        lowerValue.includes("already") ||
        lowerValue.includes("duplicate") ||
        lowerValue.includes("exists") ||
        lowerValue.includes("in session")
    ) {
        return DUPLICATE_TORRENT_ERROR;
    }

    return value;
}

async function applyLabel(torrentIds, label) {
    for (const torrentId of torrentIds) {
        try {
            const result = await callDeluge(
                "label.set_torrent",
                [torrentId, label]
            );

            if (!isSuccessfulLabelResult(result)) {
                throw new LabelWarning(
                    getLabelWarningMessage(
                        result,
                        label
                    )
                );
            }
        } catch (error) {
            if (error instanceof LabelWarning) {
                throw error;
            }

            throw new LabelWarning(
                getLabelWarningMessage(
                    error,
                    label
                )
            );
        }
    }
}

function isSuccessfulLabelResult(result) {
    if (result === true) {
        return true;
    }

    if (
        typeof result === "object" &&
        result !== null &&
        result.success === true
    ) {
        return true;
    }

    return false;
}

function getLabelWarningMessage(error, label) {
    const rawMessage = extractLabelErrorText(error);
    const message = rawMessage.toLowerCase();

    if (
        !rawMessage ||
        message.includes("unknown method") ||
        message.includes("not registered") ||
        message.includes("label.set_torrent") ||
        message.includes("plugin") ||
        message.includes("method not found")
    ) {
        return (
            "Torrent added successfully, but the Label plugin " +
            "is not installed or enabled in Deluge."
        );
    }

    if (
        message.includes("does not exist") ||
        message.includes("not found") ||
        message.includes("invalid label") ||
        message.includes("unknown label")
    ) {
        return (
            `Torrent added successfully, but the label "${label}" ` +
            "doesn't exist in Deluge."
        );
    }

    return (
        `Torrent added successfully, but the label "${label}" ` +
        "could not be applied."
    );
}

function extractLabelErrorText(value) {
    if (value instanceof Error) {
        return String(value.message || "").trim();
    }

    if (typeof value === "string") {
        return value.trim();
    }

    if (Array.isArray(value)) {
        return value
            .map(item => extractLabelErrorText(item))
            .filter(Boolean)
            .join(" ");
    }

    if (
        typeof value === "object" &&
        value !== null
    ) {
        return String(
            value.error_msg ||
            value.error ||
            value.message ||
            ""
        ).trim();
    }

    return "";
}

function extractTorrentIds(result) {
    const torrentIds = [];

    collectTorrentIds(result, torrentIds);

    return [...new Set(torrentIds)];
}

function collectTorrentIds(value, torrentIds) {
    if (typeof value === "string") {
        if (looksLikeTorrentId(value)) {
            torrentIds.push(value);
        }

        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectTorrentIds(item, torrentIds);
        }

        return;
    }

    if (
        typeof value === "object" &&
        value !== null
    ) {
        const possibleTorrentIds = [
            value.torrent_id,
            value.torrentId,
            value.info_hash,
            value.hash
        ];

        for (const torrentId of possibleTorrentIds) {
            if (
                typeof torrentId === "string" &&
                looksLikeTorrentId(torrentId)
            ) {
                torrentIds.push(torrentId);
            }
        }
    }
}

function looksLikeTorrentId(value) {
    return /^[a-f0-9]{40}$/i.test(
        String(value || "").trim()
    );
}