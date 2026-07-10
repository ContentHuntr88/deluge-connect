# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

---

# [1.0.3] - 2026-07-11

## Changed

- Replaced permanent broad host permissions with optional host permissions
- Deluge server access is now requested only for the server address configured by the user
- Removed the always-running content script registration
- Context-menu actions now use the temporary `activeTab` permission
- Updated Chrome Web Store permission handling
- Improved permission and connection error messages

## Fixed

- Fixed Deluge requests failing after broad host permissions were removed
- Fixed extension context invalidation errors caused by old content scripts
- Fixed server permission handling when saving settings or testing the connection
- Fixed context-menu actions when Deluge server permission had not yet been granted

---

# [1.0.0] - 2026-07-11

## Added

- Initial public release
- Send magnet links directly to Deluge
- Send `.torrent` links directly to Deluge
- Context menu integration
- Configurable server URL
- Secure password storage
- Connection testing
- Browser toast notifications
- Preset system
- Download locations per preset
- Automatic label support
- Detection of missing Label plugin
- Improved RPC error handling
- Modern options interface
- Chromium Manifest V3 support

## Changed

- Improved connection validation
- Better authentication handling
- More descriptive error messages
- Cleaner UI styling
- Improved notification system

## Fixed

- Password validation bypass
- Missing icon in browser toast
- Label plugin notification issues
- Various UI bugs
- Multiple RPC edge cases