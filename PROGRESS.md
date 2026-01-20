# CubbyScore Converter - Progress Tracker

**Project Start Date:** 2026-01-20
**Last Updated:** 2026-01-20
**Current Status:** ✅ Electron App MVP Complete - macOS notarized, Windows building

---

## Executive Summary

The project has **pivoted from web deployment to a desktop Electron application**. This decision was made because:
- OMR (Optical Music Recognition) processing is computationally intensive
- Running on a shared VPS would be slow/expensive for multiple concurrent users
- Target users (composers/DAW users) have powerful machines and prefer local processing
- Avoids dependency installation issues for end users

---

## Build Outputs

### macOS (Complete & Notarized)
| File | Size | Architecture | Status |
|------|------|-------------|--------|
| `CubbyScore Converter-1.0.0-arm64.dmg` | 297 MB | Apple Silicon | ✅ Notarized & Stapled |
| `CubbyScore Converter-1.0.0.dmg` | 304 MB | Intel x64 | ✅ Notarized & Stapled |

### Windows (Building)
| File | Size | Architecture | Status |
|------|------|-------------|--------|
| `CubbyScore Converter Setup 1.0.0.exe` | ~300 MB | x64 | 🚧 Building |

---

## Completed Phases

### Phase 1: Backend Development ✅
- [x] FastAPI backend with Audiveris integration
- [x] PDF to MusicXML conversion endpoint
- [x] Health check endpoint
- [x] Music21 for MusicXML validation and metadata extraction
- [x] Support for both Audiveris and homr OMR engines
- [x] Validation report with 5 priority elements (metadata, clefs, time signatures, tempo, notes)

### Phase 2: Frontend Development ✅
- [x] Next.js frontend with file upload
- [x] Cubby pink/purple dark theme
- [x] Real-time conversion status display
- [x] MusicXML download functionality
- [x] Elapsed time counter during processing

### Phase 3: Electron App Setup ✅
- [x] Electron project structure with electron-builder
- [x] Next.js static export for Electron
- [x] Python backend bundled with PyInstaller (single-file mode, 55MB)
- [x] Audiveris bundled with embedded JRE (131MB)
- [x] Custom launcher script for Audiveris
- [x] Backend process management (spawn on app start, health check, cleanup on quit)

### Phase 4: macOS Build & Signing ✅
- [x] Code signing with Developer ID certificate
- [x] Hardened runtime enabled
- [x] Entitlements configured (JIT, unsigned memory, file access)
- [x] Native libraries inside JARs signed (leptonica, tesseract dylibs)
- [x] Tesseract executable inside JAR signed
- [x] Apple notarization passed
- [x] Notarization tickets stapled to DMGs
- [x] Verified as "Notarized Developer ID" by spctl

### Phase 5: Windows Build 🚧
- [x] Cross-compilation configured from macOS
- [x] NSIS installer configured
- [ ] Build completion
- [ ] Testing on Windows machine
- [ ] Code signing (requires Windows certificate - optional for now)

---

## Key Technical Challenges Solved

### 1. Python.framework Signing Issue
**Problem:** PyInstaller's default folder mode created a Python.framework that caused "bundle format is ambiguous" errors during code signing.

**Solution:** Changed PyInstaller spec to use single-file mode (`a.binaries` included in EXE), reducing size from 160MB to 55MB and eliminating the framework structure.

### 2. JAR Native Library Signing
**Problem:** Audiveris uses bytedeco JARs containing native dylibs (leptonica, tesseract). Apple notarization requires ALL executable code to be signed.

**Solution:** Created `scripts/sign-audiveris-jars.sh` that:
1. Extracts JAR files
2. Signs all dylibs with Developer ID + hardened runtime + timestamp
3. Signs the tesseract executable binary
4. Repacks the JARs

### 3. Tesseract Executable in JAR
**Problem:** The tesseract binary (not just dylibs) inside the JAR needed signing, but the script initially only looked for files with execute permission.

**Solution:** Updated the script to use `file` command to detect Mach-O binaries regardless of permission bits.

---

## Project Structure

```
cubby-score-conversion/
├── backend/                    # FastAPI Python backend
│   ├── main.py                # Main API server
│   ├── requirements.txt
│   └── cubbyscore-backend.spec # PyInstaller config (single-file mode)
├── frontend/                   # Original Next.js frontend (web version)
├── electron-app/              # Electron desktop app
│   ├── app/                   # Next.js pages (Cubby theme)
│   │   ├── page.tsx          # Main UI
│   │   ├── globals.css       # Cubby dark theme
│   │   └── layout.tsx
│   ├── electron/
│   │   └── main.js           # Electron main process
│   ├── resources/
│   │   ├── backend/          # Bundled Python executable (55MB)
│   │   └── audiveris/        # Audiveris + JRE bundle (131MB)
│   │       ├── app/          # JAR files (with signed native libs)
│   │       ├── jre/          # Embedded Java runtime
│   │       └── bin/          # Launcher script
│   ├── build/
│   │   └── entitlements.mac.plist
│   ├── dist/                  # Build outputs (DMGs, installers)
│   ├── electron-builder.yml
│   └── package.json
└── scripts/
    ├── bundle-audiveris.sh    # Bundle Audiveris from installed app
    ├── build-backend.sh       # Build Python with PyInstaller
    ├── sign-audiveris-jars.sh # Sign native libs in JARs (critical!)
    └── build-all.sh           # Full build script
```

---

## Build Commands Reference

```bash
# 1. Build Python backend (single-file)
cd backend && source venv/bin/activate
pyinstaller cubbyscore-backend.spec
cp dist/cubbyscore-backend ../electron-app/resources/backend/

# 2. Bundle Audiveris with JRE
./scripts/bundle-audiveris.sh

# 3. Sign native libraries in JARs (CRITICAL for notarization!)
./scripts/sign-audiveris-jars.sh

# 4. Build Electron app
cd electron-app
npm run electron:build:mac   # macOS (x64 + arm64)
npm run electron:build:win   # Windows (x64)

# 5. Manual notarization (if auto-notarize fails)
xcrun notarytool submit "dist/CubbyScore Converter-1.0.0-arm64.dmg" \
  --apple-id "your@email.com" \
  --team-id "TEAMID" \
  --password "app-specific-password" \
  --wait

# 6. Staple notarization ticket
xcrun stapler staple "dist/CubbyScore Converter-1.0.0-arm64.dmg"

# 7. Verify notarization
spctl --assess --verbose=4 --type execute "dist/mac-arm64/CubbyScore Converter.app"
```

---

## Environment

| Component | Version |
|-----------|---------|
| macOS | Sonoma 14.x |
| Node.js | 22.x |
| Python | 3.13 |
| Electron | 40.0.0 |
| electron-builder | 26.4.0 |
| Java (bundled) | 21+ |
| Signing Identity | Developer ID Application: Willard Jansen (9N27LU6UBD) |
| Team ID | 9N27LU6UBD |

---

## Pending Tasks

### High Priority
- [ ] Test Windows build on actual Windows machine
- [ ] Test full conversion workflow end-to-end on fresh macOS install
- [ ] Create app icon (currently using default Electron icon)

### Medium Priority
- [ ] Set up cubbyscore.com website with download links
- [ ] Add auto-update functionality (electron-updater)
- [ ] Error handling UI improvements

### Low Priority
- [ ] About dialog
- [ ] Progress indicators for long operations
- [ ] Windows code signing (requires certificate purchase)

---

## Original Web Development Progress (Pre-Electron)

<details>
<summary>Click to expand original web development progress</summary>

### Backend Phase 1: Setup ✅
- Python environment setup
- FastAPI verified running
- Health endpoint working

### Backend Phase 2: OMR Engine ✅
- Audiveris selected as primary engine
- CLI integration: `/Applications/Audiveris.app/Contents/MacOS/Audiveris -batch -export -output <dir> <input.pdf>`
- homr installed as alternative for scanned scores

### Backend Phase 3: Validation ✅
- Implemented metadata extraction (title, composer, instruments)
- Clef detection and counting
- Time signature extraction
- Tempo marking extraction
- Note counting and confidence scoring

### Frontend ✅
- Next.js 14 with TypeScript
- Tailwind CSS styling (Cubby theme)
- API integration complete
- Real-time conversion status

</details>

---

## Milestones

| Date | Milestone |
|------|-----------|
| 2026-01-20 | Backend Phase 1-3 complete (API, OMR, validation) |
| 2026-01-20 | Frontend API integration complete |
| 2026-01-20 | homr implemented as alternative OMR |
| 2026-01-20 | Pivoted to Electron app |
| 2026-01-20 | Electron app structure complete |
| 2026-01-20 | Python backend bundled (PyInstaller single-file) |
| 2026-01-20 | Audiveris bundled with JRE |
| 2026-01-20 | macOS code signing complete |
| 2026-01-20 | macOS notarization passed ✅ |
| 2026-01-20 | Windows cross-compilation started |

---

**Next:** Test Windows build, create app icon, set up website for distribution.
