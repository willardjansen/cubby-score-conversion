// app/page.tsx - Main conversion page

'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Loader2 } from 'lucide-react';

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/convert`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Conversion failed');
      }

      // Parse JSON response with validation report
      const data = await response.json();

      if (!data.success) {
        throw new Error('Conversion failed');
      }

      // Construct full download URL
      const downloadUrl = `${apiUrl}${data.download_url}`;

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
      // Fetch the file from the backend
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

      // Clean up the blob URL
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            PDF to MusicXML Converter
          </h1>
          <p className="text-slate-600">
            Convert orchestral scores to MusicXML with prioritized accuracy
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
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
              <Upload className={`w-16 h-16 mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
              <span className="text-lg font-medium text-slate-700 mb-2">
                {isDragging ? 'Drop your file here' : file ? file.name : 'Choose a PDF or image'}
              </span>
              <span className="text-sm text-slate-500">
                Click to browse or drag and drop
              </span>
            </label>
          </div>

          {file && (
            <>
              {/* Engine Selection */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  OMR Engine
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="engine"
                      value="audiveris"
                      checked={selectedEngine === 'audiveris'}
                      onChange={(e) => setSelectedEngine(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-slate-700">
                      <strong>Audiveris</strong>
                      <span className="text-slate-500 ml-1">(recommended for orchestral)</span>
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="engine"
                      value="homr"
                      checked={selectedEngine === 'homr'}
                      onChange={(e) => setSelectedEngine(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-slate-700">
                      <strong>homr</strong>
                      <span className="text-slate-500 ml-1">(Python ML, better for scanned scores)</span>
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleConvert}
                disabled={isConverting}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Converting with {selectedEngine}... ({formatTime(elapsedTime)})
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
                  <p className="text-sm text-slate-600">
                    {selectedEngine === 'homr'
                      ? 'homr processes each page individually. Multi-page documents may take several minutes.'
                      : 'Processing your score...'}
                  </p>
                  {elapsedTime > 30 && (
                    <p className="text-xs text-slate-500 mt-1">
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Conversion Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Conversion Complete</h2>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            {/* Overall Confidence */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Overall Confidence</span>
                <span className={`text-2xl font-bold ${getConfidenceColor(result.validation.overallConfidence)}`}>
                  {result.validation.overallConfidence}%
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Processing time: {result.validation.processingTime}s
              </div>
            </div>

            {/* Validation Details */}
            <div className="space-y-4 mb-6">
              {/* Priority 1: Metadata */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900">1. Metadata</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.metadata.confidence)}`}>
                    {result.validation.metadata.confidence}%
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="text-slate-600 w-24">Title:</span>
                    <span className="text-slate-900 font-medium">
                      {result.validation.metadata.title || 'Not detected'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-24">Composer:</span>
                    <span className="text-slate-900 font-medium">
                      {result.validation.metadata.composer || 'Not detected'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="text-slate-600 w-24">Instruments:</span>
                    <span className="text-slate-900 font-medium">
                      {result.validation.metadata.instruments?.length
                        ? result.validation.metadata.instruments.join(', ')
                        : 'Not detected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority 2: Clefs */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">2. Clefs</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.clefs.confidence)}`}>
                    {result.validation.clefs.confidence}%
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Detected {result.validation.clefs.detected} clefs
                </p>
              </div>

              {/* Priority 3: Time Signatures */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">3. Time Signatures</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.timeSignatures.confidence)}`}>
                    {result.validation.timeSignatures.confidence}%
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {result.validation.timeSignatures.detected.length > 0
                    ? result.validation.timeSignatures.detected.join(', ')
                    : 'None detected'}
                </p>
              </div>

              {/* Priority 4: Tempos */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">4. Tempo Markings</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.tempos.confidence)}`}>
                    {result.validation.tempos.confidence}%
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {result.validation.tempos.detected.length > 0
                    ? result.validation.tempos.detected.join(', ')
                    : 'None detected'}
                </p>
              </div>

              {/* Priority 5: Notes */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">5. Notes</h3>
                  <span className={`font-bold ${getConfidenceColor(result.validation.notes.confidence)}`}>
                    {result.validation.notes.confidence}%
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  {result.validation.notes.count} notes detected
                </p>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download MusicXML
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 text-center text-sm text-slate-600">
          <p className="mb-2">Prioritized conversion: Metadata → Clefs → Time Sigs → Tempos → Notes</p>
          <p className="mb-2">For best results, use high-quality PDF scores</p>
          <p className="text-xs text-slate-500">
            Tip: For large scores (50+ pages), split into smaller sections for faster processing
          </p>
        </div>
      </div>
    </div>
  );
}
