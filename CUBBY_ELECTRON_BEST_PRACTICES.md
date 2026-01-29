# Cubby Electron Apps - Development Best Practices

This document covers best practices for developing, building, and releasing Cubby Electron applications.

## Project Structure

```
project/
├── app/                    # Next.js app directory
├── build/                  # Electron build resources
│   ├── icon.icns          # macOS icon
│   ├── icon.ico           # Windows icon
│   ├── entitlements.mac.plist
│   └── notarize.js        # Notarization script
├── electron/              # Electron main process
│   └── main.js
├── electron-builder.yml   # Build configuration
├── package.json
└── ...
```

## MIDI Integration

### Use the `midi` Package, NOT JZZ

**Critical**: The JZZ library does not work reliably in packaged Electron apps. It returns empty MIDI port lists when the app is bundled.

**Solution**: Use the native `midi` package for both input and output:

```javascript
const midi = require('midi');

// For MIDI input
const midiInput = new midi.Input();
const inputCount = midiInput.getPortCount();
for (let i = 0; i < inputCount; i++) {
  console.log(`Input ${i}: ${midiInput.getPortName(i)}`);
}
midiInput.openPort(portIndex);
midiInput.on('message', (deltaTime, message) => {
  const [status, data1, data2] = message;
  // Handle MIDI message
});

// For MIDI output
const midiOutput = new midi.Output();
const outputCount = midiOutput.getPortCount();
for (let i = 0; i < outputCount; i++) {
  console.log(`Output ${i}: ${midiOutput.getPortName(i)}`);
}
midiOutput.openPort(portIndex);

// Send MIDI message - use sendMessage(), not send()
midiOutput.sendMessage([status, data1, data2]);
```

### ASAR Unpacking for Native Modules

Native modules like `midi` must be unpacked from the ASAR archive:

```yaml
# electron-builder.yml
asarUnpack:
  - "node_modules/midi/**/*"
  - "node_modules/bindings/**/*"
  - "node_modules/file-uri-to-path/**/*"
```

## Apple Notarization

### Prerequisites

1. **Apple Developer Account** with Developer ID certificate
2. **App-specific password** from appleid.apple.com
3. **Team ID** (found in Apple Developer portal)

### Store Credentials in Keychain

```bash
xcrun notarytool store-credentials "app-name" \
  --apple-id "your@email.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

### Required Files

**build/entitlements.mac.plist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <!-- Add if app needs audio input -->
    <key>com.apple.security.device.audio-input</key>
    <true/>
</dict>
</plist>
```

**build/notarize.js:**
```javascript
const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appPath}...`);

  await notarize({
    appPath,
    keychainProfile: 'your-keychain-profile-name',
  });

  console.log('Notarization complete!');
};
```

### electron-builder.yml Configuration

```yaml
mac:
  category: public.app-category.music
  icon: build/icon.icns
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize: false  # We handle this in afterSign

afterSign: build/notarize.js
```

### Install Dependencies

```bash
npm install --save-dev @electron/notarize
```

## Port Selection

Avoid macOS reserved ports:
- 3000 (commonly used, conflicts possible)
- 5000 (AirPlay Receiver)
- 7000 (AirPlay)

**Recommended ports**: 7100, 8001, 8002, etc.

```javascript
// Auto port detection
const PREFERRED_PORTS = [7100, 7101, 7102, 8001, 8002];
const AVOID_PORTS = [3000, 5000, 7000];
```

## Build Commands

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --port 7100",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:7100 && electron .\"",
    "electron:build": "next build && electron-builder",
    "electron:build:mac": "next build && electron-builder --mac"
  }
}
```

### Building for Release

```bash
# Build for macOS (both Intel and Apple Silicon)
npm run electron:build -- --mac

# Build for Windows (no code signing)
npm run electron:build -- --win
```

## GitHub Releases

```bash
# Create release with DMG files
gh release create v1.0.0 \
  "dist/App Name-1.0.0.dmg" \
  "dist/App Name-1.0.0-arm64.dmg" \
  --title "v1.0.0" \
  --notes "Release notes here"
```

## Keychain Profiles Summary

Current Cubby apps and their keychain profiles:

| App | Keychain Profile |
|-----|------------------|
| Cubby Remote | `cubby-remote` |
| Cubby Remote Reaper | `cubby-remote-reaper` |
| Cubby Logic Remote | `cubby-logic-remote` |
| Cubby Score Analyzer | `cubby-score-analyzer` |
| Cubby Score Conversion | `cubby-score-conversion` |
| Cubby Review and Approve | `cubby-review-and-approve` |

## Common Issues

### MIDI Not Working in Packaged App
- **Cause**: JZZ library doesn't work in Electron
- **Fix**: Switch to `midi` package

### ERR_SSL_PROTOCOL_ERROR on Tablet
- Self-signed certs don't work in Firefox
- Use Chrome/Safari, or disable SSL for local network

### "Cannot compute electron version"
- Use fixed electron version: `"electron": "28.3.3"` not `"^28.0.0"`

### TypeScript Map Iteration Error
Add to tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "es2015",
    "downlevelIteration": true
  }
}
```

## Windows Notes

Windows builds show a "red screen" warning without code signing. This is expected for open source apps without an EV certificate. Users can click through the warning.

To disable Windows signing:
```yaml
# electron-builder.yml
win:
  sign: null
  certificateSubjectName: null
```
