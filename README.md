# PDF to MusicXML Converter

A full-stack application for converting orchestral music score PDFs to MusicXML format with prioritized accuracy validation.

## 🎵 Overview

This project provides a simple interface to convert PDF sheet music to MusicXML files, with intelligent validation that prioritizes the most important musical elements:

1. **Title, Composer, Instruments** (Priority 1)
2. **Clefs** (Priority 2)
3. **Time Signatures** (Priority 3)
4. **Tempo Markings** (Priority 4)
5. **Notes** (Priority 5)

## 🏗️ Architecture

- **Backend**: FastAPI (Python) with OMR engine (Audiveris or oemer)
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Deployment**: Docker containers on Linux VPS

## 📁 Project Structure

```
pdf-to-musicxml/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   ├── app/
│   │   ├── page.tsx        # Main conversion page
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── package.json
│   └── next.config.js
├── PROGRESS.md             # Track development progress
├── PROJECT_GUIDE.md        # Instructions for Claude Code
├── BACKEND_TODO.md         # Backend task list
├── FRONTEND_TODO.md        # Frontend task list
└── README.md               # This file
```

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   python main.py
   ```

   The API will be available at `http://localhost:8000`

5. **Test the health endpoint:**
   ```bash
   curl http://localhost:8000/health
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.local.example .env.local
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## 🐳 Docker Deployment

### Backend

```bash
cd backend
docker-compose up -d
```

### Frontend

```bash
cd frontend
docker build -t pdf-to-musicxml-frontend .
docker run -p 3000:3000 pdf-to-musicxml-frontend
```

## 🔧 Development Workflow

This project is designed to work with Claude Code in VS Code. Follow this workflow:

1. **Read PROJECT_GUIDE.md** - Essential instructions for development
2. **Update PROGRESS.md** - After every significant step
3. **Follow TODO lists** - Work through BACKEND_TODO.md and FRONTEND_TODO.md
4. **Test frequently** - Don't build everything before testing
5. **Commit regularly** - With descriptive commit messages

### Testing the Conversion

1. Start both backend and frontend servers
2. Open http://localhost:3000 in your browser
3. Upload a test PDF score
4. Check the validation report
5. Download the MusicXML file

## 📝 API Endpoints

### Backend API

- **GET /** - API status
- **POST /convert** - Convert PDF to MusicXML
  - Request: multipart/form-data with PDF file
  - Response: MusicXML file with validation report
- **GET /health** - Health check with system status

## 🎯 Success Criteria

The MVP is complete when:

- ✅ Can upload any orchestral PDF
- ✅ Returns valid MusicXML file
- ✅ Shows validation report with all 5 priorities
- ✅ Confidence scores display correctly
- ✅ Can download MusicXML file
- ✅ Deployed to VPS and accessible online

## 📊 Accuracy Goals

- Metadata: 95%+
- Clefs: 98%+
- Time Signatures: 95%+
- Tempo Markings: 90%+
- Notes: 85%+ (clean PDFs), 70%+ (scanned)

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **music21** - Music notation parsing
- **pdf2image** - PDF to image conversion
- **Audiveris/oemer** - Optical Music Recognition
- **Docker** - Containerization

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## 📖 Documentation

- **PROJECT_GUIDE.md** - Detailed development instructions for Claude Code
- **PROGRESS.md** - Track what's been done and what's next
- **BACKEND_TODO.md** - Comprehensive backend task list
- **FRONTEND_TODO.md** - Comprehensive frontend task list

## 🤝 Contributing

This project is designed to be developed with Claude Code. To contribute:

1. Read PROJECT_GUIDE.md thoroughly
2. Choose a task from BACKEND_TODO.md or FRONTEND_TODO.md
3. Update PROGRESS.md as you work
4. Test your changes
5. Commit with descriptive messages
6. Update documentation

## 📄 License

[Add your license here]

## 👤 Author

Willard - Developer at UWV

## 🔮 Future Enhancements

- Real-time MusicXML preview
- Manual correction interface
- Batch processing
- Integration with Cubby Remote
- Support for handwritten scores
- Export to other formats (MIDI, Sibelius, Finale)

## 🐛 Known Issues

- OMR processing not yet implemented (placeholder only)
- Validation report currently uses mock data
- No drag-and-drop support yet

## 📞 Support

For questions or issues:
1. Check PROGRESS.md for current status
2. Review PROJECT_GUIDE.md for troubleshooting
3. Check the TODO files for planned features

---

**Remember:** This is an iterative project. Build incrementally, test frequently, and update PROGRESS.md after every step!
