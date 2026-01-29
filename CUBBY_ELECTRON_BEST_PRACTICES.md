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

## Splash Screen

For apps that take time to start (starting servers, loading resources), add a splash screen to improve UX and show connection info.

### Required Files

**electron/splash.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>App Name</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: white;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      -webkit-app-region: drag;
      user-select: none;
    }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .status { color: #888; margin-bottom: 32px; }
    .spinner {
      width: 24px; height: 24px;
      border: 3px solid rgba(233, 69, 96, 0.2);
      border-top-color: #e94560;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .connection-info {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px 32px;
      text-align: center;
      display: none;
    }
    .connection-url { font-size: 20px; color: #4ade80; font-family: monospace; }
    .continue-btn {
      margin-top: 24px;
      padding: 14px 32px;
      font-size: 16px;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      -webkit-app-region: no-drag;
      display: none;
    }
    .continue-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4); }
  </style>
</head>
<body>
  <h1>App Name</h1>
  <p class="status" id="status">Starting...</p>
  <div class="spinner" id="spinner"></div>
  <div class="connection-info" id="connection-info">
    <div>Connect your device to</div>
    <div class="connection-url" id="connection-url">-</div>
  </div>
  <button class="continue-btn" id="continue-btn">Open in Browser</button>
  <script>
    window.electronAPI?.onConnectionInfo((info) => {
      document.getElementById('status').textContent = 'Ready!';
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('connection-info').style.display = 'block';
      document.getElementById('connection-url').textContent = info.url;
      document.getElementById('continue-btn').style.display = 'block';
    });
    window.electronAPI?.onStatus((status) => {
      document.getElementById('status').textContent = status;
    });
    document.getElementById('continue-btn').addEventListener('click', () => {
      window.electronAPI?.continue();
    });
  </script>
</body>
</html>
```

**electron/splash-preload.js:**
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onConnectionInfo: (callback) => ipcRenderer.on('connection-info', (_, info) => callback(info)),
  onStatus: (callback) => ipcRenderer.on('status', (_, status) => callback(status)),
  continue: () => ipcRenderer.send('splash-continue'),
});
```

### Main Process Integration

```javascript
const { BrowserWindow } = require('electron');

let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

function updateSplashStatus(status) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('status', status);
  }
}

function sendConnectionInfo(url) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('connection-info', { url });
  }
}

// In app.whenReady():
app.whenReady().then(async () => {
  createSplashWindow();
  updateSplashStatus('Starting servers...');

  // ... start servers ...

  const connectionUrl = `http://${getLocalIP()}:${PORT}`;
  updateSplashStatus('Ready!');
  sendConnectionInfo(connectionUrl);

  // Wait for user to click "Continue" button (don't auto-dismiss)
  ipcMain.once('splash-continue', () => {
    shell.openExternal(`http://localhost:${PORT}`);
    setTimeout(() => {
      if (splashWindow) splashWindow.close();
      if (process.platform === 'darwin') app.dock.hide();
    }, 500);
  });
});
```

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

## GitHub Actions for Cross-Platform Builds

Building Windows apps on macOS requires Wine, which can be tricky to install. GitHub Actions provides a better solution with native Windows runners.

### Workflow File

Create `.github/workflows/build.yml`:

```yaml
name: Build Electron App

on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build for'
        required: true
        default: 'windows'
        type: choice
        options:
          - windows
          - mac
          - all
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    if: github.event_name == 'push' || github.event.inputs.platform == 'windows' || github.event.inputs.platform == 'all'
    runs-on: windows-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js
        run: npm run build

      - name: Build Electron (Windows)
        run: npx electron-builder --win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload Windows artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-build
          path: |
            dist/*.exe
            dist/*.msi

  build-mac:
    if: github.event_name == 'push' || github.event.inputs.platform == 'mac' || github.event.inputs.platform == 'all'
    runs-on: macos-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Apple certificate
        env:
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        run: |
          # Create temporary keychain
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db
          KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

          # Decode certificate
          echo "$CSC_LINK" | base64 --decode > $RUNNER_TEMP/certificate.p12

          # Create and configure keychain
          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

          # Import certificate
          security import $RUNNER_TEMP/certificate.p12 -P "$CSC_KEY_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security set-key-partition-list -S apple-tool:,apple: -k "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js
        run: npm run build

      - name: Build Electron (Mac)
        run: npx electron-builder --mac --x64 --arm64
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - name: Upload Mac artifacts
        uses: actions/upload-artifact@v4
        with:
          name: mac-build
          path: |
            dist/*.dmg
            dist/*.zip

      - name: Cleanup keychain
        if: always()
        run: security delete-keychain $RUNNER_TEMP/app-signing.keychain-db || true
```

### Mac Code Signing Secrets Setup

To enable Mac code signing in GitHub Actions:

1. **Export certificate from Keychain Access:**
   - Open Keychain Access → login keychain → My Certificates
   - Find "Developer ID Application: Your Name"
   - Expand to verify private key is attached
   - Right-click → Export → Save as `.p12` (password optional)

2. **Upload secrets to GitHub:**
   ```bash
   # Certificate (base64 encoded)
   base64 -i ~/Downloads/Certificate.p12 | gh secret set CSC_LINK

   # Certificate password (empty string if no password)
   echo "" | gh secret set CSC_KEY_PASSWORD

   # Apple notarization credentials
   echo "your@email.com" | gh secret set APPLE_ID
   echo "xxxx-xxxx-xxxx-xxxx" | gh secret set APPLE_APP_SPECIFIC_PASSWORD
   echo "YOURTEAMID" | gh secret set APPLE_TEAM_ID
   ```

3. **Update notarize.js to support both local and CI:**
   ```javascript
   // Use environment variables (GitHub Actions) or keychain profile (local)
   if (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD) {
     await notarize({
       appPath,
       appleId: process.env.APPLE_ID,
       appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
       teamId: process.env.APPLE_TEAM_ID,
     });
   } else {
     await notarize({
       appPath,
       keychainProfile: 'your-keychain-profile',
     });
   }
   ```

### Triggering Builds

```bash
# Manually trigger Windows build
gh workflow run build.yml --field platform=windows

# Manually trigger all platforms
gh workflow run build.yml --field platform=all

# Watch build progress
gh run watch

# Download artifacts after build completes
gh run download <run-id> --name windows-build --dir ./dist/github-artifacts
```

### Automatic Releases

To automatically create releases when pushing version tags:

```yaml
  release:
    needs: [build-windows, build-mac]
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: artifacts/**/*
          draft: true
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Then push a tag to trigger a release:
```bash
git tag v1.2.1
git push origin v1.2.1
```
