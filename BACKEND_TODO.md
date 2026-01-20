# PDF to MusicXML Converter - Backend Development Specification

## Project Overview
Create a backend service that converts orchestral music score PDFs to MusicXML format with prioritized accuracy on metadata and musical elements.

## Technology Stack
- **Backend**: Python 3.11+ with FastAPI
- **OMR Engine**: Audiveris (Java-based, called via subprocess) OR oemer (Python ML-based)
- **Music Processing**: music21 library
- **Image Processing**: pdf2image, Pillow
- **Deployment**: Docker on Linux VPS (alongside Next.js frontend)

## Priority Requirements (in order)
1. Title, composer name, instruments
2. Clefs
3. Time signatures
4. Tempos (text like "Adagio" and metronome marks like "♩=70")
5. Notes (pitch and duration)

---

## TODO List

### Phase 1: Setup and Infrastructure

- [ ] **Task 1.1**: Initialize Python project structure
  - Create virtual environment
  - Install dependencies from requirements.txt
  - Verify FastAPI runs locally
  - Test basic endpoints (/health, /)

- [ ] **Task 1.2**: Set up OMR engine selection
  - Research: Compare Audiveris vs oemer for orchestral scores
  - Decision: Choose primary OMR engine based on accuracy benchmarks
  - Install and configure chosen OMR engine
  - Create test script to verify OMR engine works with sample PDF

- [ ] **Task 1.3**: Docker configuration
  - Build Dockerfile with all system dependencies
  - Test Docker build locally
  - Configure docker-compose.yml
  - Verify container can process PDFs

---

### Phase 2: Core OMR Implementation

- [ ] **Task 2.1**: PDF to Image conversion
  - Implement `pdf_to_images()` function using pdf2image
  - Handle multi-page orchestral scores
  - Optimize image quality for OMR (DPI settings)
  - Add error handling for corrupted PDFs

- [ ] **Task 2.2**: OMR processing pipeline
  - If using **Audiveris**:
    - Write subprocess wrapper to call Audiveris CLI
    - Configure Audiveris output to MusicXML format
    - Handle Audiveris error codes and logging
  - If using **oemer**:
    - Implement oemer Python API integration
    - Configure ML model loading
    - Handle inference on PDF images
  - Capture raw MusicXML output

- [ ] **Task 2.3**: Basic endpoint testing
  - Test /convert endpoint with simple single-page score
  - Verify MusicXML file is generated
  - Add logging for each processing step
  - Measure processing time benchmarks

---

### Phase 3: MusicXML Post-Processing (Priority Order)

- [ ] **Task 3.1**: Extract and validate PRIORITY 1 - Metadata
  - Use music21 to parse MusicXML
  - Extract: title (work-title tag)
  - Extract: composer name (creator tag with type="composer")
  - Extract: instrument names (part-name tags for each staff)
  - Implement validation:
    - Ensure title is not empty or generic
    - Composer name format validation
    - Verify instrument count matches staff count
  - Add fallback: prompt for manual metadata if missing
  - Create `validate_metadata()` function

- [ ] **Task 3.2**: Validate PRIORITY 2 - Clefs
  - Parse clef elements for each staff (sign, line attributes)
  - Common orchestral clefs: treble, bass, alto, tenor
  - Verify clef changes within staves
  - Flag unusual or potentially incorrect clefs
  - Create `validate_clefs()` function

- [ ] **Task 3.3**: Validate PRIORITY 3 - Time Signatures
  - Extract time signature elements (beats, beat-type)
  - Verify consistency across all staves at same measure
  - Handle time signature changes mid-score
  - Detect compound time signatures (e.g., 6/8, 9/8)
  - Create `validate_time_signatures()` function

- [ ] **Task 3.4**: Extract PRIORITY 4 - Tempo Markings
  - Parse direction elements with tempo text ("Adagio", "Allegro", etc.)
  - Extract metronome marks (beat-unit, per-minute)
  - Handle multiple tempo markings in score
  - Preserve Italian/text tempo indications
  - Create `extract_tempo_markings()` function

- [ ] **Task 3.5**: Validate PRIORITY 5 - Notes
  - Basic note validation: pitch, octave, duration
  - Check for obvious OMR errors:
    - Notes outside reasonable instrument range
    - Impossible duration combinations in measure
  - Verify accidentals (sharp, flat, natural)
  - Articulation marks (staccato, accent, etc.)
  - Create `validate_notes()` function with confidence scoring

---

### Phase 4: Enhanced MusicXML Output

- [ ] **Task 4.1**: Implement priority-ordered validation pipeline
  - Create `enhance_musicxml()` master function
  - Call validation functions in priority order
  - Generate validation report with confidence scores
  - Return enhanced MusicXML + validation JSON report

- [ ] **Task 4.2**: MusicXML cleanup and optimization
  - Remove OMR artifacts (duplicate elements, invalid tags)
  - Ensure proper XML formatting and namespaces
  - Optimize for Cubase import (test compatibility)
  - Preserve expression marks for Cubby Remote integration

- [ ] **Task 4.3**: Error handling and reporting
  - Create structured error response format
  - Generate human-readable validation report
  - Log OMR confidence scores per element
  - Add optional "strict mode" vs "permissive mode"

---

### Phase 5: API Enhancements

- [ ] **Task 5.1**: File management
  - Implement automatic cleanup of old temporary files
  - Add file size limits (max 50MB PDF)
  - Generate unique job IDs for async processing
  - Store conversion history (optional)

- [ ] **Task 5.2**: Response improvements
  - Return validation report alongside MusicXML
  - Add endpoint to retrieve just validation report
  - Include processing time in response
  - Add confidence score (0-100%) for overall accuracy

- [ ] **Task 5.3**: Additional endpoints
  - GET /status/{job_id} - for async processing
  - GET /validate - validate existing MusicXML file
  - POST /batch - handle multiple PDFs
  - GET /supported-formats - list supported input types

---

### Phase 6: Testing and Quality Assurance

- [ ] **Task 6.1**: Unit tests
  - Test metadata extraction with various scores
  - Test clef detection accuracy
  - Test time signature parsing edge cases
  - Test tempo marking extraction
  - Test note validation logic

- [ ] **Task 6.2**: Integration tests
  - End-to-end test with sample orchestral PDFs:
    - Simple piano score (baseline)
    - String quartet (4 staves)
    - Full orchestra (20+ staves)
    - Score with complex tempo changes
  - Measure accuracy against commercial OMR tools
  - Test with scanned vs native PDFs

- [ ] **Task 6.3**: Performance optimization
  - Profile memory usage with large orchestral scores
  - Optimize image processing for speed
  - Implement caching for repeated conversions
  - Add progress tracking for long conversions

---

### Phase 7: Deployment

- [ ] **Task 7.1**: VPS deployment preparation
  - Configure environment variables for production
  - Set up proper CORS for your frontend domain
  - Configure file upload size limits in nginx/caddy
  - Set up SSL certificates

- [ ] **Task 7.2**: Docker deployment
  - Push Docker image to registry
  - Deploy container to Mijn.host VPS
  - Configure docker-compose with restart policies
  - Set up volume mounts for persistent storage

- [ ] **Task 7.3**: Monitoring and logging
  - Implement structured logging (JSON format)
  - Add health check endpoint with detailed status
  - Set up error alerting
  - Monitor disk space for temp files

---

### Phase 8: Documentation

- [ ] **Task 8.1**: API documentation
  - Complete OpenAPI/Swagger docs (auto-generated by FastAPI)
  - Add usage examples for each endpoint
  - Document validation report structure
  - Create error code reference

- [ ] **Task 8.2**: Deployment documentation
  - Write VPS deployment guide
  - Document Docker commands
  - Create troubleshooting guide
  - Document OMR engine configuration options

- [ ] **Task 8.3**: User documentation
  - Create README with quick start
  - Best practices for PDF quality
  - Explain priority system
  - Known limitations and accuracy expectations

---

## Success Criteria

1. **Metadata Accuracy**: 95%+ correct title, composer, instruments
2. **Clef Accuracy**: 98%+ correct clef detection
3. **Time Signature Accuracy**: 95%+ correct
4. **Tempo Marking Extraction**: 90%+ captured
5. **Note Accuracy**: 85%+ for clean PDFs, 70%+ for scanned scores
6. **Processing Time**: < 30 seconds for typical 10-page orchestral score
7. **Output Quality**: MusicXML imports cleanly into Cubase

---

## Future Enhancements (Post-MVP)

- [ ] Web-based correction interface for validation errors
- [ ] Training custom ML model on orchestral scores
- [ ] Support for handwritten scores
- [ ] Batch processing with job queue
- [ ] Integration with Cubby Remote for direct Cubase import
- [ ] Support for other output formats (MIDI, Sibelius, Finale)

---

## Notes for Claude Code

- Start with Phase 1-2 to establish working OMR pipeline
- Prioritize getting *something* working end-to-end before perfecting accuracy
- Use small test scores initially (2-4 pages max)
- Consider using Audiveris first (more mature) before attempting ML approach
- Keep validation functions modular - each priority level is independent
- Log everything - OMR debugging requires detailed logs
- Test on your VPS environment early to catch deployment issues
