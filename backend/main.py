# main.py - FastAPI backend for PDF to MusicXML conversion

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from enum import Enum
import os
import subprocess
from pathlib import Path
import tempfile
import shutil
from datetime import datetime
import logging
import glob
import json
import zipfile

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Audiveris path - from environment or default macOS location
AUDIVERIS_PATH = os.environ.get("AUDIVERIS_PATH", "/Applications/Audiveris.app/Contents/MacOS/Audiveris")


class OMREngine(str, Enum):
    AUDIVERIS = "audiveris"
    HOMR = "homr"


app = FastAPI(title="PDF to MusicXML Converter API")

# CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {"status": "PDF to MusicXML API is running"}

@app.get("/engines")
async def get_available_engines():
    """Return list of available OMR engines."""
    return {
        "engines": [
            {"id": "audiveris", "name": "Audiveris", "description": "Java-based OMR, good for clean digital scores"},
            {"id": "homr", "name": "homr", "description": "Python ML-based OMR, better for scanned/older scores"}
        ],
        "default": "audiveris"
    }


@app.post("/convert")
async def convert_pdf_to_musicxml(
    file: UploadFile = File(...),
    engine: str = Form(default="audiveris")
):
    """
    Convert uploaded PDF or image score to MusicXML
    Priority order: title, composer, instruments > clefs > time sigs > tempos > notes

    Parameters:
    - file: PDF or image file (PNG, JPG) to convert
    - engine: OMR engine to use ("audiveris" or "homr")

    Returns a JSON response with:
    - musicxml_url: URL to download the converted file
    - validation: Validation report with confidence scores
    - engine: Which engine was used
    """
    import time

    # Check file type
    filename_lower = file.filename.lower()
    is_pdf = filename_lower.endswith('.pdf')
    is_image = filename_lower.endswith(('.png', '.jpg', '.jpeg'))

    if not is_pdf and not is_image:
        raise HTTPException(status_code=400, detail="Only PDF and image files (PNG, JPG) are accepted")

    # Audiveris only supports PDF
    if engine == OMREngine.AUDIVERIS.value and is_image:
        raise HTTPException(status_code=400, detail="Audiveris only supports PDF files. Use homr for images.")

    # Validate engine choice
    if engine not in [e.value for e in OMREngine]:
        raise HTTPException(status_code=400, detail=f"Invalid engine. Choose from: {[e.value for e in OMREngine]}")

    # Create unique temporary directory for this conversion
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_dir = UPLOAD_DIR / timestamp
    temp_dir.mkdir(exist_ok=True)
    start_time = time.time()

    try:
        # Save uploaded file
        file_path = temp_dir / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process with selected OMR engine
        if engine == OMREngine.HOMR.value:
            if is_image:
                musicxml_path = await process_image_with_homr(file_path, temp_dir)
            else:
                musicxml_path = await process_pdf_with_homr(file_path, temp_dir)
        else:
            musicxml_path = await process_pdf_with_audiveris(file_path, temp_dir)

        # Post-process MusicXML
        enhanced_musicxml_path = await enhance_musicxml(musicxml_path)

        # Calculate processing time
        processing_time = time.time() - start_time

        # Generate validation report
        validation_report = generate_validation_report(enhanced_musicxml_path, processing_time)

        # Save the final MusicXML file
        output_filename = f"{Path(file.filename).stem}.musicxml"
        final_path = OUTPUT_DIR / f"{timestamp}_{output_filename}"
        shutil.copy(enhanced_musicxml_path, final_path)

        # Return JSON with validation report and download URL
        return JSONResponse(content={
            "success": True,
            "filename": output_filename,
            "download_url": f"/download/{timestamp}_{output_filename}",
            "validation": validation_report,
            "engine": engine
        })

    except Exception as e:
        logger.error(f"Conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

    finally:
        # Cleanup temporary files (but keep the output)
        if temp_dir.exists():
            shutil.rmtree(temp_dir)


@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download a converted MusicXML file."""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type="application/vnd.recordare.musicxml+xml",
        filename=filename.split("_", 1)[-1] if "_" in filename else filename
    )

async def process_pdf_with_audiveris(pdf_path: Path, work_dir: Path) -> Path:
    """
    Process PDF using Audiveris OMR engine
    Returns path to generated MusicXML file
    """
    logger.info(f"Processing PDF with Audiveris: {pdf_path}")

    # Create output directory for Audiveris
    output_dir = work_dir / "audiveris_output"
    output_dir.mkdir(exist_ok=True)

    # Check if Audiveris is available
    if not Path(AUDIVERIS_PATH).exists():
        raise FileNotFoundError(f"Audiveris not found at {AUDIVERIS_PATH}")

    # Run Audiveris in batch mode
    cmd = [
        AUDIVERIS_PATH,
        "-batch",
        "-export",
        "-output", str(output_dir),
        str(pdf_path)
    ]

    logger.debug(f"Running command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        logger.debug(f"Audiveris stdout: {result.stdout}")
        if result.stderr:
            logger.warning(f"Audiveris stderr: {result.stderr}")

        if result.returncode != 0:
            logger.error(f"Audiveris failed with return code {result.returncode}")
            raise RuntimeError(f"Audiveris processing failed: {result.stderr}")

    except subprocess.TimeoutExpired:
        raise RuntimeError("Audiveris processing timed out (5 minutes)")

    # Find the generated MusicXML file
    # Audiveris creates files with pattern: <filename>/<filename>.mxl or .musicxml
    pdf_stem = pdf_path.stem

    # Look for MusicXML files in the output directory
    musicxml_patterns = [
        output_dir / f"{pdf_stem}" / f"{pdf_stem}.mxl",
        output_dir / f"{pdf_stem}" / f"{pdf_stem}.musicxml",
        output_dir / f"{pdf_stem}.mxl",
        output_dir / f"{pdf_stem}.musicxml",
    ]

    # Also search recursively
    all_musicxml = list(output_dir.glob("**/*.mxl")) + list(output_dir.glob("**/*.musicxml"))

    logger.debug(f"Looking for MusicXML in: {output_dir}")
    logger.debug(f"Found MusicXML files: {all_musicxml}")

    musicxml_path = None
    for pattern in musicxml_patterns:
        if pattern.exists():
            musicxml_path = pattern
            break

    if not musicxml_path and all_musicxml:
        musicxml_path = all_musicxml[0]

    if not musicxml_path:
        # List all files in output directory for debugging
        all_files = list(output_dir.rglob("*"))
        logger.error(f"No MusicXML found. Files in output: {all_files}")
        raise FileNotFoundError(f"No MusicXML file generated by Audiveris. Output dir contents: {all_files}")

    logger.info(f"MusicXML generated: {musicxml_path}")

    # If it's an .mxl file (compressed), extract the actual MusicXML
    if musicxml_path.suffix == '.mxl':
        musicxml_path = extract_mxl(musicxml_path, work_dir)

    return musicxml_path


def extract_mxl(mxl_path: Path, work_dir: Path) -> Path:
    """
    Extract MusicXML from a compressed .mxl file
    """
    logger.debug(f"Extracting MXL file: {mxl_path}")
    extract_dir = work_dir / "mxl_extracted"
    extract_dir.mkdir(exist_ok=True)

    with zipfile.ZipFile(mxl_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    # Find the .xml file inside (usually named the same as the mxl or 'score.xml')
    xml_files = list(extract_dir.glob("**/*.xml"))
    # Filter out container.xml and META-INF files
    xml_files = [f for f in xml_files if 'META-INF' not in str(f) and f.name != 'container.xml']

    if not xml_files:
        raise FileNotFoundError(f"No XML file found in MXL archive: {mxl_path}")

    logger.debug(f"Extracted MusicXML: {xml_files[0]}")
    return xml_files[0]


def get_homr_env():
    """Get environment variables needed for homr (SSL certificates)."""
    env = os.environ.copy()
    try:
        import certifi
        cert_path = certifi.where()
        env['SSL_CERT_FILE'] = cert_path
        env['REQUESTS_CA_BUNDLE'] = cert_path
    except ImportError:
        pass
    return env


async def process_pdf_with_homr(pdf_path: Path, work_dir: Path) -> Path:
    """
    Process PDF using homr (Python ML-based OMR engine) via CLI.
    Returns path to generated MusicXML file.

    Note: homr processes one image at a time. For multi-page PDFs,
    we process each page and combine results using music21.
    """
    logger.info(f"Processing PDF with homr: {pdf_path}")

    try:
        from pdf2image import convert_from_path
    except ImportError as e:
        logger.error(f"pdf2image import failed: {e}")
        raise RuntimeError("pdf2image is not installed. Please install with: pip install pdf2image")

    # Create output directory
    output_dir = work_dir / "homr_output"
    output_dir.mkdir(exist_ok=True)

    try:
        # Convert PDF to images
        logger.debug("Converting PDF to images...")
        images = convert_from_path(str(pdf_path), dpi=300)

        if not images:
            raise RuntimeError("Failed to convert PDF to images")

        logger.info(f"PDF has {len(images)} page(s)")

        # Process each page with homr CLI
        musicxml_files = []
        env = get_homr_env()

        for i, img in enumerate(images):
            logger.debug(f"Processing page {i+1}/{len(images)} with homr...")

            # Save image temporarily for homr
            img_path = output_dir / f"page_{i}.png"
            img.save(str(img_path), "PNG")

            # Run homr CLI - output goes to same directory as input
            cmd = ["homr", str(img_path)]

            logger.debug(f"Running command: {' '.join(cmd)}")

            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 minute timeout per page
                    env=env
                )

                logger.debug(f"homr stdout: {result.stdout}")
                if result.stderr:
                    logger.warning(f"homr stderr: {result.stderr}")

                # homr outputs to same directory with .musicxml extension
                expected_output = output_dir / f"page_{i}.musicxml"
                if expected_output.exists():
                    musicxml_files.append(expected_output)
                    logger.info(f"Page {i+1} processed successfully: {expected_output}")
                else:
                    # Check for any musicxml files created
                    mxml_files = list(output_dir.glob("*.musicxml"))
                    new_files = [f for f in mxml_files if f not in musicxml_files]
                    if new_files:
                        musicxml_files.append(new_files[0])
                        logger.info(f"Page {i+1} processed: {new_files[0]}")
                    else:
                        logger.warning(f"homr did not produce output for page {i+1}")

            except subprocess.TimeoutExpired:
                logger.warning(f"homr timed out on page {i+1}")
                continue
            except Exception as e:
                logger.warning(f"homr failed on page {i+1}: {e}")
                continue

        if not musicxml_files:
            raise RuntimeError("homr did not detect any musical content in the PDF")

        # If single page, just return that file
        if len(musicxml_files) == 1:
            final_path = output_dir / f"{pdf_path.stem}.musicxml"
            shutil.copy(musicxml_files[0], final_path)
            return final_path

        # For multiple pages, combine using music21
        logger.debug("Combining multiple pages with music21...")
        from music21 import converter, stream

        combined_score = stream.Score()
        for mxml_file in musicxml_files:
            try:
                page_score = converter.parse(str(mxml_file))
                for part in page_score.parts:
                    combined_score.append(part)
            except Exception as e:
                logger.warning(f"Could not parse {mxml_file}: {e}")

        final_path = output_dir / f"{pdf_path.stem}.musicxml"
        combined_score.write('musicxml', fp=str(final_path))

        logger.info(f"homr MusicXML generated: {final_path}")
        return final_path

    except Exception as e:
        logger.error(f"homr processing failed: {e}")
        raise RuntimeError(f"homr processing failed: {str(e)}")


async def process_image_with_homr(img_path: Path, work_dir: Path) -> Path:
    """
    Process a single image directly with homr CLI.
    Returns path to generated MusicXML file.
    """
    logger.info(f"Processing image with homr: {img_path}")

    # Create output directory and copy image there
    output_dir = work_dir / "homr_output"
    output_dir.mkdir(exist_ok=True)

    # Copy image to output dir so homr outputs there
    work_img_path = output_dir / img_path.name
    shutil.copy(img_path, work_img_path)

    # Run homr CLI - output goes to same directory as input
    cmd = ["homr", str(work_img_path)]

    logger.debug(f"Running command: {' '.join(cmd)}")
    env = get_homr_env()

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            env=env
        )

        logger.debug(f"homr stdout: {result.stdout}")
        if result.stderr:
            logger.warning(f"homr stderr: {result.stderr}")

        # Find the generated MusicXML file (homr outputs with .musicxml extension)
        expected_output = work_img_path.with_suffix('.musicxml')
        if expected_output.exists():
            final_path = output_dir / f"{img_path.stem}.musicxml"
            if expected_output != final_path:
                shutil.copy(expected_output, final_path)
            logger.info(f"homr MusicXML generated: {final_path}")
            return final_path

        # Check for any musicxml files
        mxml_files = list(output_dir.glob("*.musicxml"))
        if mxml_files:
            final_path = output_dir / f"{img_path.stem}.musicxml"
            shutil.copy(mxml_files[0], final_path)
            logger.info(f"homr MusicXML generated: {final_path}")
            return final_path

        # No output found
        all_files = list(output_dir.rglob("*"))
        logger.error(f"No MusicXML found. Files in output: {all_files}")
        raise RuntimeError(f"homr did not produce MusicXML output. Generated files: {[f.name for f in all_files]}")

    except subprocess.TimeoutExpired:
        raise RuntimeError("homr processing timed out (5 minutes)")
    except Exception as e:
        logger.error(f"homr processing failed: {e}")
        raise RuntimeError(f"homr processing failed: {str(e)}")


async def enhance_musicxml(musicxml_path: Path) -> Path:
    """
    Post-process MusicXML - currently just returns the path.
    Future: could modify/enhance the MusicXML if needed.
    """
    return musicxml_path


def generate_validation_report(musicxml_path: Path, processing_time: float) -> dict:
    """
    Generate a validation report by parsing the MusicXML with music21.
    Extracts all 5 priority elements and calculates confidence scores.
    """
    import music21
    from music21 import converter, metadata, clef, meter, tempo

    logger.info(f"Generating validation report for: {musicxml_path}")

    try:
        # Parse the MusicXML
        score = converter.parse(str(musicxml_path))

        # Priority 1: Metadata (title, composer, instruments)
        metadata_info = extract_metadata(score)

        # Priority 2: Clefs
        clefs_info = extract_clefs(score)

        # Priority 3: Time Signatures
        time_sigs_info = extract_time_signatures(score)

        # Priority 4: Tempos
        tempos_info = extract_tempos(score)

        # Priority 5: Notes
        notes_info = extract_notes(score)

        # Calculate overall confidence
        confidences = [
            metadata_info['confidence'],
            clefs_info['confidence'],
            time_sigs_info['confidence'],
            tempos_info['confidence'],
            notes_info['confidence']
        ]
        overall_confidence = sum(confidences) / len(confidences)

        report = {
            "metadata": metadata_info,
            "clefs": clefs_info,
            "timeSignatures": time_sigs_info,
            "tempos": tempos_info,
            "notes": notes_info,
            "overallConfidence": round(overall_confidence, 1),
            "processingTime": round(processing_time, 2)
        }

        logger.info(f"Validation report generated: overall confidence {overall_confidence}%")
        return report

    except Exception as e:
        logger.error(f"Error generating validation report: {e}")
        # Return a minimal report on error
        return {
            "metadata": {"title": None, "composer": None, "instruments": [], "confidence": 0},
            "clefs": {"detected": 0, "confidence": 0},
            "timeSignatures": {"detected": [], "confidence": 0},
            "tempos": {"detected": [], "confidence": 0},
            "notes": {"count": 0, "confidence": 0},
            "overallConfidence": 0,
            "processingTime": round(processing_time, 2),
            "error": str(e)
        }


def extract_metadata(score) -> dict:
    """Extract title, composer, and instrument names from the score."""
    from music21 import metadata

    title = None
    composer = None
    instruments = []

    # Extract metadata
    if score.metadata:
        title = score.metadata.title
        if score.metadata.composers:
            composer = score.metadata.composers[0]
        elif hasattr(score.metadata, 'composer'):
            composer = score.metadata.composer

    # Extract instrument names from parts
    for part in score.parts:
        part_name = part.partName or part.id
        if part_name and part_name not in instruments:
            instruments.append(part_name)

    # Calculate confidence based on what was found
    confidence = 0
    if title:
        confidence += 40
    if composer:
        confidence += 30
    if instruments:
        confidence += 30

    return {
        "title": title,
        "composer": composer,
        "instruments": instruments,
        "confidence": min(confidence, 100)
    }


def extract_clefs(score) -> dict:
    """Extract and count clefs from the score."""
    from music21 import clef

    clef_count = 0
    clef_types = set()

    for part in score.parts:
        for c in part.recurse().getElementsByClass(clef.Clef):
            clef_count += 1
            clef_types.add(c.sign if hasattr(c, 'sign') else str(type(c).__name__))

    # Confidence based on presence of clefs
    confidence = 98 if clef_count > 0 else 0

    return {
        "detected": clef_count,
        "types": list(clef_types),
        "confidence": confidence
    }


def extract_time_signatures(score) -> dict:
    """Extract time signatures from the score."""
    from music21 import meter

    time_sigs = []

    for part in score.parts:
        for ts in part.recurse().getElementsByClass(meter.TimeSignature):
            ts_str = ts.ratioString
            if ts_str not in time_sigs:
                time_sigs.append(ts_str)

    # Confidence based on presence of time signatures
    confidence = 95 if time_sigs else 0

    return {
        "detected": time_sigs,
        "confidence": confidence
    }


def extract_tempos(score) -> dict:
    """Extract tempo markings from the score."""
    from music21 import tempo

    tempos = []

    for el in score.recurse().getElementsByClass(tempo.MetronomeMark):
        if el.text:
            tempos.append(el.text)
        elif el.number:
            tempos.append(f"♩={int(el.number)}")

    for el in score.recurse().getElementsByClass(tempo.TempoIndication):
        if hasattr(el, 'text') and el.text:
            if el.text not in tempos:
                tempos.append(el.text)

    # Confidence based on presence of tempos
    confidence = 90 if tempos else 50  # Some scores don't have tempo markings

    return {
        "detected": tempos,
        "confidence": confidence
    }


def extract_notes(score) -> dict:
    """Count notes and calculate confidence for note extraction."""
    from music21 import note

    note_count = 0
    rest_count = 0

    for n in score.recurse().getElementsByClass(note.Note):
        note_count += 1

    for r in score.recurse().getElementsByClass(note.Rest):
        rest_count += 1

    # Confidence is based on whether we found notes
    # Higher confidence for more notes (indicates successful OMR)
    if note_count > 100:
        confidence = 85
    elif note_count > 50:
        confidence = 80
    elif note_count > 10:
        confidence = 70
    elif note_count > 0:
        confidence = 60
    else:
        confidence = 0

    return {
        "count": note_count,
        "rests": rest_count,
        "confidence": confidence
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "upload_dir": str(UPLOAD_DIR),
        "output_dir": str(OUTPUT_DIR)
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
