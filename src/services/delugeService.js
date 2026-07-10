import { callDeluge } from "../api/deluge.js";

/**
 * Adds a magnet or torrent-file URL to Deluge.
 *
 * @param {string} torrentUrl
 * @param {{
 *   label?: string
 * }} preset
 * @returns {Promise<unknown>}
 */
export async function addTorrent(torrentUrl, preset = {}) {
    const url = String(torrentUrl || "").trim();

    if (!url) {
        throw new Error("No torrent or magnet link was provided.");
    }

    let result;

    if (url.startsWith("magnet:")) {
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
        throw new Error(
            "Deluge did not add the magnet. It may already exist."
        );
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

    if (result === false || result === null) {
        throw new Error(
            "Deluge downloaded the torrent file but could not add it."
        );
    }

    return result;
}

async function applyLabel(torrentIds, label) {
    for (const torrentId of torrentIds) {
        try {
            await callDeluge(
                "label.set_torrent",
                [torrentId, label]
            );
        } catch (error) {
            throw new Error(
                `Torrent was added, but label "${label}" could not be applied. ` +
                "Confirm Deluge's Label plugin is enabled and that the label already exists."
            );
        }
    }
}

function extractTorrentIds(result) {
    if (typeof result === "string" && result) {
        return [result];
    }

    if (Array.isArray(result)) {
        return result.filter(
            item => typeof item === "string" && item
        );
    }

    return [];
}