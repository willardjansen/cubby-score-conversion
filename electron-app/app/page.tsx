'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Loader2, Music } from 'lucide-react';

interface ValidationReport {
  metadata: {
    title?: string;
    composer?: string;
    instruments?: string[];
    confidence: number;
  };
  clefs: {
    detected: number;
    confidence: number;
  };
  timeSignatures: {
    detected: string[];
    confidence: number;
  };
  tempos: {
    detected: string[];
    confidence: number;
  };
  notes: {
    count: number;
    confidence: number;
  };
  overallConfidence: number;
  processingTime: number;
}

interface ConversionResult {
  musicxmlUrl: string;
  validation: ValidationReport;
  filename: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<string>('audiveris');
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Backend runs locally on port 8002
  const API_URL = 'http://localhost:8002';

  // Timer effect for elapsed time during conversion
  useEffect(() => {
    if (isConverting) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConverting]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleFileSelect = (selectedFile: File | null) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (selectedFile && (validTypes.includes(selectedFile.type) || selectedFile.name.match(/\.(pdf|png|jpg|jpeg)$/i))) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else if (selectedFile) {
      setError('Please select a PDF or image file (PNG, JPG)');
      setFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    handleFileSelect(droppedFile || null);
  };

  const handleConvert = async () => {
    if (!file) return;

    setIsConverting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('engine', selectedEngine);

    // Create abort controller with 30 minute timeout for large files
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000);

    try {
      const response = await fetch(`${API_URL}/convert`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Conversion failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Conversion failed');
      }

      const downloadUrl = `${API_URL}${data.download_url}`;

      setResult({
        musicxmlUrl: downloadUrl,
        validation: data.validation,
        filename: data.filename
      });

    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Conversion timed out after 30 minutes. Try a smaller file or use Audiveris for faster processing.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred during conversion');
      }
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    try {
      const response = await fetch(result.musicxmlUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download file');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'confidence-high';
    if (confidence >= 75) return 'confidence-medium';
    return 'confidence-low';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Title bar drag area */}
      <div className="h-8 titlebar-drag" />

      <div className="container mx-auto px-6 py-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Music className="w-10 h-10 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">
              CubbyScore Converter
            </h1>
          </div>
          <p className="text-muted">
            Convert PDF scores to MusicXML with OMR technology
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-surface rounded-xl border border-border p-6 mb-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors titlebar-no-drag ${
              isDragging
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-muted'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className={`w-12 h-12 mb-3 ${isDragging ? 'text-accent' : 'text-muted'}`} />
              <span className="text-lg font-medium text-foreground mb-1">
                {isDragging ? 'Drop your file here' : file ? file.name : 'Choose a PDF or image'}
              </span>
              <span className="text-sm text-muted">
                Click to browse or drag and drop
              </span>
            </label>
          </div>

          {file && (
            <>
              {/* Engine Selection */}
              <div className="mt-5 p-4 bg-surface-alt rounded-lg">
                <label className="block text-sm font-medium text-foreground mb-2">
                  OMR Engine
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="engine"
                      value="audiveris"
                      checked={selectedEngine === 'audiveris'}
                      onChange={(e) => setSelectedEngine(e.target.value)}
                      className="w-4 h-4 text-accent border-border focus:ring-accent"
                    />
                    <span className="ml-2 text-sm text-foreground">
                      <strong>Audiveris</strong>
                      <span className="text-muted ml-1">(faster, digital scores)</span>
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="engine"
                      value="homr"
                      checked={selectedEngine === 'homr'}
                      onChange={(e) => setSelectedEngine(e.target.value)}
                      className="w-4 h-4 text-accent border-border focus:ring-accent"
                    />
                    <span className="ml-2 text-sm text-foreground">
                      <strong>homr</strong>
                      <span className="text-muted ml-1">(ML, better for scanned)</span>
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleConvert}
                disabled={isConverting}
                className="w-full mt-4 bg-accent hover:bg-accent-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Converting... ({formatTime(elapsedTime)})
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Convert to MusicXML
                  </>
                )}
              </button>

              {isConverting && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-muted">
                    {selectedEngine === 'homr'
                      ? 'homr processes each page individually. Multi-page documents may take several minutes.'
                      : 'Processing your score...'}
                  </p>
                  {elapsedTime > 30 && (
                    <p className="text-xs text-muted mt-1">
                      Still working... Large scores can take a while.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-error mb-1">Conversion Error</h3>
              <p className="text-error/80 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">Conversion Complete</h2>
              <CheckCircle className="w-7 h-7 text-success" />
            </div>

            {/* Overall Confidence */}
            <div className="bg-surface-alt rounded-lg p-4 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">Overall Confidence</span>
                <span className={`text-2xl font-bold ${getConfidenceColor(result.validation.overallConfidence)}`}>
                  {result.validation.overallConfidence}%
                </span>
              </div>
              <div className="mt-2 text-sm text-muted">
                Processing time: {result.validation.processingTime}s
              </div>
            </div>

            {/* Validation Details */}
            <div className="space-y-3 mb-5">
              {/* Priority 1: Metadata */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">1. Metadata</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.metadata.confidence)}`}>
                    {result.validation.metadata.confidence}%
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex">
                    <span className="text-muted w-24">Title:</span>
                    <span className="text-foreground">
                      {result.validation.metadata.title || 'Not detected'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="text-muted w-24">Composer:</span>
                    <span className="text-foreground">
                      {result.validation.metadata.composer || 'Not detected'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="text-muted w-24">Instruments:</span>
                    <span className="text-foreground">
                      {result.validation.metadata.instruments?.length
                        ? result.validation.metadata.instruments.join(', ')
                        : 'Not detected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority 2: Clefs */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">2. Clefs</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.clefs.confidence)}`}>
                    {result.validation.clefs.confidence}%
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">
                  Detected {result.validation.clefs.detected} clefs
                </p>
              </div>

              {/* Priority 3: Time Signatures */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground">3. Time Signatures</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.timeSignatures.confidence)}`}>
                    {result.validation.timeSignatures.confidence}%
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {result.validation.timeSignatures.detected.length > 0
                    ? result.validation.timeSignatures.detected.join(', ')
                    : 'None detected'}
                </p>
              </div>

              {/* Priority 4: Tempos */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground">4. Tempo Markings</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.tempos.confidence)}`}>
                    {result.validation.tempos.confidence}%
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {result.validation.tempos.detected.length > 0
                    ? result.validation.tempos.detected.join(', ')
                    : 'None detected'}
                </p>
              </div>

              {/* Priority 5: Notes */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">5. Notes</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.notes.confidence)}`}>
                    {result.validation.notes.confidence}%
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">
                  {result.validation.notes.count} notes detected
                </p>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="w-full bg-success hover:bg-success/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download MusicXML
            </button>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-8 text-center text-sm text-muted">
          <p className="mb-1">Prioritized: Metadata, Clefs, Time Sigs, Tempos, Notes</p>
          <p>For large scores (50+ pages), split into smaller sections</p>
        </div>
      </div>
    </div>
  );
}
