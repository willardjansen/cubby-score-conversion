# CubbyScore Converter

Convert PDF music scores to MusicXML format using optical music recognition (OMR).

![CubbyScore Converter](electron-app/build/icon.png)

## Download

| Platform | Architecture | Download |
|----------|-------------|----------|
| macOS | Apple Silicon (M1/M2/M3) | [CubbyScore Converter-1.0.0-arm64.dmg](https://cubbyscore.com/download/mac-arm64) |
| macOS | Intel | [CubbyScore Converter-1.0.0.dmg](https://cubbyscore.com/download/mac-x64) |
| Windows | x64 | [CubbyScore Converter Setup 1.0.0.exe](https://cubbyscore.com/download/win) |

## Features

- **PDF to MusicXML conversion** - Convert any PDF music score to editable MusicXML
- **Intelligent validation** - Prioritized accuracy reporting for:
  1. Metadata (Title, Composer, Instruments)
  2. Clefs
  3. Time Signatures
  4. Tempo Markings
  5. Notes
- **Confidence scoring** - See how accurately each element was detected
- **No installation hassles** - Everything bundled (Python backend, Audiveris OMR, Java runtime)
- **Runs locally** - Your scores never leave your computer

## Screenshots

*Coming soon*

## System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Windows**: Windows 10 or later (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for installation

## How It Works

CubbyScore Converter uses [Audiveris](https://github.com/Audiveris/audiveris), a powerful open-source OMR engine, to analyze PDF scores and extract musical notation. The results are validated using [music21](https://web.mit.edu/music21/) and presented with confidence scores.

### Conversion Process

1. **Upload** - Select a PDF music score
2. **Process** - Audiveris analyzes the score (typically 30-60 seconds per page)
3. **Validate** - music21 extracts and validates musical elements
4. **Download** - Get your MusicXML file ready for use in notation software

## Tips for Best Results

- **Clean PDFs work best** - Digital/vector PDFs give better results than scanned images
- **Split large scores** - For scores over 50 pages, consider splitting into sections
- **Check the confidence scores** - Lower scores indicate areas that may need manual correction

## Technology

- **Electron** - Cross-platform desktop app framework
- **Audiveris** - Optical Music Recognition engine
- **FastAPI** - Python backend for processing
- **music21** - Music notation analysis
- **Next.js** - Frontend UI

## Development

See [PROGRESS.md](PROGRESS.md) for development status and build instructions.

### Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/cubby-score-conversion.git
cd cubby-score-conversion

# Build Python backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pyinstaller cubbyscore-backend.spec

# Build Electron app
cd ../electron-app
npm install
npm run electron:build:mac  # or electron:build:win
```

## License

MIT License - See [LICENSE](LICENSE) for details.

## Author

**Willard Jansen** - [Cubby](https://cubby.audio)

## Acknowledgments

- [Audiveris](https://github.com/Audiveris/audiveris) - Open source OMR engine
- [music21](https://web.mit.edu/music21/) - Music analysis toolkit
- [Electron](https://www.electronjs.org/) - Desktop app framework
