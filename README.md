# Deluge Connect

> Send torrent and magnet links directly to your Deluge server from your browser.

Deluge Connect is a lightweight Chromium extension that lets you send torrents to your self-hosted Deluge instance without opening the Deluge Web UI.

Designed for speed, simplicity and self-hosted media workflows.

---

## Features

- ✅ Right-click any magnet link
- ✅ Right-click any `.torrent` download
- ✅ One-click "Add to Deluge"
- ✅ Presets (TV, Movies, Games, etc.)
- ✅ Automatic labels (when the Label plugin is installed)
- ✅ Download locations per preset
- ✅ Browser toast notifications
- ✅ Connection testing
- ✅ Password validation
- ✅ Clean modern interface
- ✅ Works with Brave, Chrome and other Chromium browsers

---

## Screenshots

Coming soon.

---

## Installation

### Option 1 — Download Release

Download the latest release from GitHub.

Unzip the archive somewhere permanent.

Open:

```
chrome://extensions
```

or

```
brave://extensions
```

Enable **Developer Mode**.

Click:

```
Load unpacked
```

Select the extension folder.

---

### Option 2 — Clone

```bash
git clone https://github.com/ContentHuntr88/deluge-connect.git
```

Load the folder as an unpacked extension.

---

## Configuration

Open the extension options.

Enter:

- Deluge WebUI URL
- Deluge password

Example:

```
http://192.168.1.10:8112
```

Click **Test Connection**.

---

## Using Presets

Presets allow different content types to automatically use different settings.

Example:

| Preset | Label | Download Folder |
|---------|-------|-----------------|
| TV | tv-sonarr | TV Downloads |
| Movies | radarr | Movie Downloads |
| Games | games | Games |

Choose the preset from the context menu when adding a torrent.

---

## Labels

If the Deluge Label plugin is installed, Deluge Connect automatically applies labels.

If the plugin is disabled or missing, the torrent is still added normally and you'll receive a notification that the label could not be applied.

---

## Permissions

Deluge Connect requires:

- Storage
- Context Menus
- Scripting

Host access is required so the extension can communicate directly with your Deluge WebUI.

No analytics.

No tracking.

No external services.

Everything runs locally between your browser and your Deluge server.

---

## Building

Simply clone the repository and load it as an unpacked Chromium extension.

No build tools are required.

---

## Roadmap

### v1.1

- Firefox support
- Optional Add with Options dialog
- Better context menu filtering
- Import / Export presets
- Additional notification themes

---

## Contributing

Bug reports and pull requests are welcome.

If you find an issue, please open a GitHub Issue.

---

## License

MIT License

See LICENSE for details.