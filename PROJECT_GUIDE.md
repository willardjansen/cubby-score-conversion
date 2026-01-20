# PROJECT_GUIDE.md - Instructions for Claude Code

## Project Overview
Building a PDF to MusicXML converter with FastAPI backend and Next.js frontend. This is a complete full-stack application for converting orchestral music scores.

---

## Working Guidelines for Claude Code

### 1. Progress Tracking (CRITICAL)

**You MUST maintain a `PROGRESS.md` file** that tracks your work:

- Update `PROGRESS.md` after completing each major task
- Mark tasks as ✅ DONE, 🚧 IN PROGRESS, or ⏳ TODO
- Add brief notes about decisions made or issues encountered
- Commit progress updates regularly

**PROGRESS.md Template:**
```markdown
# Project Progress Tracker

## Current Phase: [Phase Name]
Last Updated: [Date/Time]

### Backend Progress
- ✅ Phase 1.1: Project setup complete
- 🚧 Phase 2.1: Working on OMR integration
- ⏳ Phase 2.2: Not started

**Notes:**
- Chose Audiveris over oemer due to better orchestral score support
- Had to adjust Docker memory limits for large PDFs

### Frontend Progress
- ✅ F1.1: Next.js initialized
- ⏳ F2.1: File upload component pending

**Current Blockers:**
- None

**Next Steps:**
1. Complete Audiveris subprocess integration
2. Test with sample orchestral PDF
```

### 2. Incremental Development Strategy

**DO NOT try to build everything at once.** Follow this approach:

#### Step 1: Backend Skeleton (Day 1)
- ✅ Set up FastAPI with basic endpoints
- ✅ Test /health endpoint works
- ✅ Create file upload endpoint (no processing yet)
- ✅ Verify Docker builds successfully
- **Update PROGRESS.md**

#### Step 2: OMR Integration (Day 2-3)
- ✅ Choose OMR engine (Audiveris OR oemer)
- ✅ Install and configure chosen engine
- ✅ Create simple test: PDF → MusicXML (any quality)
- ✅ Verify output file is valid XML
- **Update PROGRESS.md**

#### Step 3: Basic Validation (Day 4)
- ✅ Install music21 library
- ✅ Parse MusicXML and extract title/composer
- ✅ Return validation as JSON alongside file
- ✅ Test end-to-end flow
- **Update PROGRESS.md**

#### Step 4: Frontend Basics (Day 5)
- ✅ Next.js app running
- ✅ File upload UI working
- ✅ Connect to backend API
- ✅ Display basic success/error messages
- **Update PROGRESS.md**

#### Step 5: Full Priority System (Day 6-7)
- ✅ Implement all 5 priority validations
- ✅ Display validation report in frontend
- ✅ Add confidence scoring
- **Update PROGRESS.md**

#### Step 6: Polish & Deploy (Day 8+)
- ✅ Error handling
- ✅ UI improvements
- ✅ VPS deployment
- **Update PROGRESS.md**

### 3. Testing Protocol

**After EVERY major change:**

1. **Backend test:**
   ```bash
   # Test health endpoint
   curl http://localhost:8000/health
   
   # Test conversion with sample PDF
   curl -X POST -F "file=@test_score.pdf" http://localhost:8000/convert --output result.musicxml
   ```

2. **Frontend test:**
   - Open browser to http://localhost:3000
   - Upload a test PDF
   - Verify no console errors
   - Check network tab for API calls

3. **Document results in PROGRESS.md**

### 4. File Organization

Maintain this structure:

```
pdf-to-musicxml/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── uploads/          (gitignore)
│   ├── outputs/          (gitignore)
│   └── tests/
│       └── test_score.pdf
├── frontend/
│   ├── app/
│   ├── package.json
│   ├── next.config.js
│   └── .env.local
├── PROGRESS.md           ⭐ CRITICAL
├── PROJECT_GUIDE.md      (this file)
├── BACKEND_TODO.md
├── FRONTEND_TODO.md
└── README.md
```

### 5. Commit Strategy

Commit after each completed task with descriptive messages:

```bash
# Good commit messages:
git commit -m "✅ Backend Phase 1.1: FastAPI basic setup complete"
git commit -m "✅ Backend Phase 2.2: Audiveris integration working"
git commit -m "🚧 Frontend F2.1: File upload UI in progress"
git commit -m "📝 Update PROGRESS.md - completed Phase 2"

# Bad commit messages:
git commit -m "updates"
git commit -m "fix"
```

### 6. Debugging Workflow

When something doesn't work:

1. **Add detailed logging:**
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   logger = logging.getLogger(__name__)
   
   logger.debug(f"Processing PDF: {pdf_path}")
   logger.error(f"OMR failed: {error}")
   ```

2. **Document the issue in PROGRESS.md:**
   ```markdown
   **Current Blockers:**
   - Audiveris returning empty MusicXML for multi-page scores
   - Investigating memory limits
   ```

3. **Test with minimal example:**
   - Use single-page, simple score first
   - Gradually increase complexity

4. **Update PROGRESS.md when resolved**

### 7. Decision Documentation

**When making technical decisions, document them:**

```markdown
## Technical Decisions

### Decision 1: OMR Engine Selection
**Date:** 2026-01-20
**Chose:** Audiveris
**Reason:** More mature, better orchestral support, active development
**Alternative:** oemer (considered but less proven for complex scores)

### Decision 2: API Response Format
**Date:** 2026-01-20
**Chose:** Return MusicXML file + validation JSON in response headers
**Reason:** Cleaner than multipart responses
**Alternative:** Separate endpoints for file and validation
```

Add this section to PROGRESS.md

### 8. Priority System Implementation

**Implement validations IN ORDER:**

1. ✅ First: Get ANY MusicXML output (even if poor quality)
2. ✅ Second: Extract title/composer/instruments
3. ✅ Third: Validate clefs
4. ✅ Fourth: Validate time signatures
5. ✅ Fifth: Extract tempos
6. ✅ Last: Validate notes

**DO NOT skip to notes validation first** - the priority order matters!

### 9. Common Pitfalls to Avoid

❌ **Don't do this:**
- Build entire backend before testing anything
- Try to achieve perfect accuracy immediately
- Implement all features at once
- Forget to update PROGRESS.md
- Skip testing after changes

✅ **Do this:**
- Test frequently with small examples
- Get basic flow working first, then improve
- Build incrementally
- Update PROGRESS.md religiously
- Commit after each working step

### 10. Sample Test Files

Create a `backend/tests/` directory with:

1. **simple_score.pdf** - Single page, piano, 4 bars
2. **quartet_score.pdf** - String quartet, 2 pages
3. **orchestra_score.pdf** - Full orchestra, 10 pages

Test in this order. Don't jump to complex scores first.

---

## Quick Start Checklist

Use this to get started:

### Backend First Steps
- [ ] cd backend
- [ ] python -m venv venv
- [ ] source venv/bin/activate  # or venv\Scripts\activate on Windows
- [ ] pip install -r requirements.txt
- [ ] python main.py  # Should start on port 8000
- [ ] Test: curl http://localhost:8000/health
- [ ] ✅ Update PROGRESS.md

### Frontend First Steps
- [ ] cd frontend
- [ ] npm install
- [ ] Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
- [ ] npm run dev  # Should start on port 3000
- [ ] Open browser to http://localhost:3000
- [ ] ✅ Update PROGRESS.md

### First Integration Test
- [ ] Backend running on :8000
- [ ] Frontend running on :3000
- [ ] Upload test PDF via frontend
- [ ] Check if API call reaches backend (check logs)
- [ ] ✅ Update PROGRESS.md even if it fails - document what happened

---

## Communication with Willard

After completing each phase:

1. Update PROGRESS.md
2. Commit all changes
3. Summarize what was accomplished
4. Note any blockers or questions
5. Suggest next steps

**Example summary:**
```
✅ Completed Backend Phase 1 & 2.1

Accomplishments:
- FastAPI running with basic endpoints
- Audiveris installed and tested
- Can convert simple 1-page PDF to MusicXML

Issues encountered:
- Audiveris needs more memory for large scores (adjusted Docker config)

Next steps:
- Implement metadata extraction (Phase 3.1)
- Test with quartet score

Updated PROGRESS.md with all details.
```

---

## Environment-Specific Notes

### Development (Local)
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Use sample PDFs from tests/ directory
- Enable verbose logging

### Production (VPS)
- Backend: https://api.yourdomain.com
- Frontend: https://yourdomain.com
- Use environment variables for API URL
- Disable debug logging
- Enable CORS only for your domain

---

## Success Criteria

You'll know you're done with MVP when:

✅ Can upload any orchestral PDF
✅ Returns valid MusicXML file
✅ Shows validation report with all 5 priorities
✅ Confidence scores display correctly
✅ Can download MusicXML file
✅ Deployed to VPS and accessible online
✅ PROGRESS.md fully updated
✅ README.md has setup instructions

---

## Final Reminder

**UPDATE PROGRESS.MD AFTER EVERY SIGNIFICANT STEP**

This is not optional. It helps you:
- Track what works and what doesn't
- Remember decisions made
- Resume work easily after breaks
- Share status with Willard
- Debug issues later

Good luck! Build incrementally, test frequently, and document everything.
