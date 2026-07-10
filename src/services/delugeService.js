import { callDeluge } from "../api/deluge.js";

/**
 * Adds a torrent or magnet URL to Deluge.
 *
 * @param {string} torrentUrl Magnet URI or HTTP(S) torrent URL.
 * @param {Record<string, unknown>} options Deluge torrent options.
 * @returns {Promise<unknown>}
 */
export async function addTorrent(torrentUrl, options = {}) {
    const url = String(torrentUrl || "").trim();

    if (!url) {
        throw new Error("No torrent or magnet link was provided.");
    }

    if (url.startsWith("magnet:")) {
        return addMagnet(url, options);
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return addTorrentFromUrl(url, options);
    }

    throw new Error(
        "Unsupported link. Deluge Connect currently accepts magnet, HTTP, and HTTPS links."
    );
}

async function addMagnet(magnetUrl, options) {
    const torrentId = await callDeluge(
        "core.add_torrent_magnet",
        [magnetUrl, options]
    );

    if (!torrentId) {
        throw new Error(
            "Deluge did not add the magnet. It may already exist in the torrent list."
        );
    }

    return torrentId;
}

async function addTorrentFromUrl(torrentUrl, options) {
    const temporaryPath = await callDeluge(
        "web.download_torrent_from_url",
        [torrentUrl, null]
    );

    if (!temporaryPath) {
        throw new Error(
            "Deluge could not download the torrent file from that URL."
        );
    }

    const addedTorrents = await callDeluge(
        "web.add_torrents",
        [[
            {
                path: temporaryPath,
                options
            }
        ]]
    );

    if (addedTorrents === false || addedTorrents === null) {
        throw new Error(
            "Deluge downloaded the torrent file but could not add it."
        );
    }

    return addedTorrents;
}