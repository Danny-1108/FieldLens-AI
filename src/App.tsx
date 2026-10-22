import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { CaptureSection } from './components/CaptureSection';
import { AnalysisLoading } from './components/AnalysisLoading';
import { ResultsSection } from './components/ResultsSection';
import { CameraStreamModal } from './components/CameraStreamModal';
import { FieldJournalModal } from './components/FieldJournalModal';
import { ObservationCategory, FieldAnalysisResult, ObservationRecord } from './types';
import { getCategoryMeta } from './utils/categories';
import { SAMPLE_SPECIMENS } from './utils/sampleObservations';
import {
  getSavedObservations,
  saveObservationToStorage,
  deleteObservationFromStorage,
  clearAllObservationsFromStorage,
  updateObservationTestsInStorage,
} from './utils/storage';
import { getFieldCoordinates } from './utils/imageUtils';
import { RefreshCw, Clock, Check } from 'lucide-react';

export default function App() {
  // Sunlight Mode (Outdoor high-contrast view)
  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem('fieldlens_sunlight_mode') === 'true';
  });

  // Observation state
  const [selectedCategory, setSelectedCategory] = useState<ObservationCategory>('geology');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [userNotes, setUserNotes] = useState<string>('');

  // Analysis result state
  const [analysisResult, setAnalysisResult] = useState<FieldAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutoRetrying, setIsAutoRetrying] = useState<boolean>(false);
  const [apiError, setApiError] = useState<{ title: string; message: string; isTemporary?: boolean } | null>(null);

  // Camera permission / accessibility notice
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [galleryTriggerSignal, setGalleryTriggerSignal] = useState<number>(0);

  // Completed physical in-situ tests
  const [completedTests, setCompletedTests] = useState<Record<string, boolean>>({});
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isExpanding, setIsExpanding] = useState<boolean>(false);

  // Modals
  const [isCameraStreamOpen, setIsCameraStreamOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [savedObservations, setSavedObservations] = useState<ObservationRecord[]>([]);

  // Load saved observations on mount
  useEffect(() => {
    setSavedObservations(getSavedObservations());
  }, []);

  // Save sunlight mode preference
  const toggleSunlightMode = () => {
    setSunlightMode((prev) => {
      const next = !prev;
      localStorage.setItem('fieldlens_sunlight_mode', String(next));
      return next;
    });
  };

  // Select image from file input or camera
  const handleSelectImage = (full: string, mime: string, thumb: string) => {
    setImageDataUrl(full);
    setMimeType(mime);
    setThumbnailDataUrl(thumb);
    setApiError(null);
    setCameraError(null);
  };

  const handleClearImage = () => {
    setImageDataUrl(null);
    setThumbnailDataUrl(null);
    setAnalysisResult(null);
    setCurrentRecordId(null);
    setIsSaved(false);
    setCompletedTests({});
    setApiError(null);
  };

  // Reset to initial observation state
  const handleReset = () => {
    setImageDataUrl(null);
    setThumbnailDataUrl(null);
    setAnalysisResult(null);
    setCurrentRecordId(null);
    setIsSaved(false);
    setCompletedTests({});
    setUserNotes('');
    setApiError(null);
  };

  const handleRetakeWithCamera = () => {
    handleReset();
    setCameraError(null);
    setIsCameraStreamOpen(true);
  };

  const handleUploadFromGallery = () => {
    handleReset();
    setGalleryTriggerSignal((prev) => prev + 1);
  };

  // Perform Gemini AI Multimodal Analysis
  const handleStartAnalysis = async (retryAttempt = 0) => {
    if (!imageDataUrl) {
      setApiError({
        title: 'No photo selected',
        message: 'Take or upload a photo before starting the analysis.',
        isTemporary: false,
      });
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/analyze-observation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType,
          category: selectedCategory,
          userNotes,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.success) {
        const isTemporary =
          response.status === 503 ||
          response.status === 429 ||
          data?.errorType === 'TEMPORARILY_UNAVAILABLE';

        // Automatically retry once after a short delay for temporary server errors
        if (retryAttempt === 0 && isTemporary) {
          setIsAutoRetrying(true);
          await new Promise((resolve) => setTimeout(resolve, 1800));
          setIsAutoRetrying(false);
          return handleStartAnalysis(1);
        }

        const title = data?.title || 'Analysis temporarily unavailable';
        const message =
          data?.message ||
          'The AI service is experiencing high demand right now. Your photo has been preserved. Please wait a few seconds and try again.';

        setApiError({
          title,
          message,
          isTemporary: true,
        });
        return;
      }

      const result: FieldAnalysisResult = data.analysis;
      setAnalysisResult(result);
      setCompletedTests({});
      setIsSaved(false);

      // Create an observation record ID
      const recordId = `obs-${Date.now()}`;
      setCurrentRecordId(recordId);

      // Attempt to capture GPS coordinates silently in background
      getFieldCoordinates().then((coords) => {
        if (coords) {
          console.log('GPS coordinates attached:', coords);
        }
      });
    } catch (err: any) {
      console.error('Field analysis error:', err);

      // Automatically retry once after a short delay for network drops
      if (retryAttempt === 0) {
        setIsAutoRetrying(true);
        await new Promise((resolve) => setTimeout(resolve, 1800));
        setIsAutoRetrying(false);
        return handleStartAnalysis(1);
      }

      const isNetworkError =
        err?.name === 'TypeError' ||
        String(err?.message || '').toLowerCase().includes('network') ||
        String(err?.message || '').toLowerCase().includes('fetch');

      if (isNetworkError) {
        setApiError({
          title: 'Connection Unavailable',
          message: "We couldn't reach the AI service. Check your connection and try again.",
          isTemporary: true,
        });
      } else {
        setApiError({
          title: 'Analysis temporarily unavailable',
          message:
            'The AI service is experiencing high demand right now. Your photo has been preserved. Please wait a few seconds and try again.',
          isTemporary: true,
        });
      }
    } finally {
      setIsLoading(false);
      setIsAutoRetrying(false);
    }
  };

  // Save current observation to local journal (for valid field observations)
  const handleSaveToJournal = async () => {
    if (!analysisResult || !imageDataUrl || analysisResult.isOutOfScope) return;

    const recordId = currentRecordId || `obs-${Date.now()}`;
    const location = await getFieldCoordinates();

    const populatedAnalysis: FieldAnalysisResult = {
      ...analysisResult,
      possibleInterpretation:
        analysisResult.possibleInterpretation?.trim() ||
        (analysisResult as any).interpretation?.trim() ||
        '',
      visibleEvidence:
        analysisResult.visibleEvidence && analysisResult.visibleEvidence.length > 0
          ? analysisResult.visibleEvidence
          : (analysisResult as any).visible_evidence || [],
      inPersonInvestigateQuestions:
        analysisResult.inPersonInvestigateQuestions && analysisResult.inPersonInvestigateQuestions.length > 0
          ? analysisResult.inPersonInvestigateQuestions
          : (analysisResult as any).inPersonVerificationChecks ||
            (analysisResult as any).verificationChecks ||
            (analysisResult as any).inPersonChecks ||
            (analysisResult.fieldTestsChecklist || []).map((t) => `${t.testName}: ${t.instruction}`),
      fieldNoteSummary:
        analysisResult.fieldNoteSummary?.trim() ||
        (analysisResult as any).fieldNotebookSummary?.trim() ||
        (analysisResult as any).summary?.trim() ||
        '',
    };

    if (!populatedAnalysis.fieldNoteSummary) {
      const firstInterp = populatedAnalysis.possibleInterpretation?.split(/(?<=[.?!])\s+/)[0] || '';
      const firstEvid = populatedAnalysis.visibleEvidence?.[0]?.replace(/\.$/, '') || 'characteristic field features';
      const firstCheck = populatedAnalysis.inPersonInvestigateQuestions?.[0]?.split(/[.:]/)[0] || 'physical verification';
      populatedAnalysis.fieldNoteSummary = `Observed field specimen exhibiting ${firstEvid.toLowerCase()}. Visual characteristics appear consistent with ${firstInterp.toLowerCase().replace(/^the specimen appears consistent with /, '')}. In-person verification via ${firstCheck.toLowerCase()} is recommended to support identification.`;
    }

    const record: ObservationRecord = {
      id: recordId,
      timestamp: Date.now(),
      category: selectedCategory,
      imageDataUrl,
      thumbnailDataUrl: thumbnailDataUrl || imageDataUrl,
      analysis: populatedAnalysis,
      completedTests,
      studentNotes: userNotes,
      location,
    };

    const ok = saveObservationToStorage(record);
    if (ok) {
      setIsSaved(true);
      setCurrentRecordId(recordId);
      setSavedObservations(getSavedObservations());
    } else {
      alert('Unable to save observation due to local storage limits. Try clearing old observations.');
    }
  };

  // Expand analysis on demand
  const handleExpandAnalysis = async () => {
    if (!analysisResult || analysisResult.isOutOfScope) return;
    setIsExpanding(true);

    try {
      const response = await fetch('/api/expand-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType,
          category: selectedCategory,
          initialAnalysis: analysisResult,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to expand analysis at this time.');
      }

      const updatedAnalysis: FieldAnalysisResult = {
        ...analysisResult,
        expandedAnalysis: data.expandedAnalysis,
      };

      setAnalysisResult(updatedAnalysis);

      // If already saved in journal, update the saved entry with expanded analysis
      if (currentRecordId && isSaved) {
        const record: ObservationRecord = {
          id: currentRecordId,
          timestamp: Date.now(),
          category: selectedCategory,
          imageDataUrl: imageDataUrl || '',
          thumbnailDataUrl: thumbnailDataUrl || imageDataUrl || '',
          analysis: updatedAnalysis,
          completedTests,
          studentNotes: userNotes,
        };
        saveObservationToStorage(record);
        setSavedObservations(getSavedObservations());
      }
    } catch (err: any) {
      console.error('Expand analysis error:', err);
      alert('The AI service is experiencing high demand right now. Please wait a few seconds and try again.');
    } finally {
      setIsExpanding(false);
    }
  };

  // Toggle in-situ physical test checkmark
  const handleToggleTest = (testName: string) => {
    setCompletedTests((prev) => {
      const next = { ...prev, [testName]: !prev[testName] };
      if (currentRecordId && isSaved) {
        updateObservationTestsInStorage(currentRecordId, next);
        setSavedObservations(getSavedObservations());
      }
      return next;
    });
  };

  // Load a pre-configured sample specimen
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_SPECIMENS.find((s) => s.id === sampleId);
    if (!sample) return;

    setSelectedCategory(sample.category);
    setImageDataUrl(sample.thumbnailSvg);
    setThumbnailDataUrl(sample.thumbnailSvg);
    setAnalysisResult(sample.analysis);
    setCompletedTests({});
    setCurrentRecordId(`sample-${Date.now()}`);
    setIsSaved(false);
    setUserNotes(`Observed demo ${sample.name}`);
    setApiError(null);
    setCameraError(null);
  };

  // Restore past observation from journal
  const handleSelectPastObservation = (record: ObservationRecord) => {
    setSelectedCategory(record.category);
    setImageDataUrl(record.imageDataUrl);
    setThumbnailDataUrl(record.thumbnailDataUrl);
    setAnalysisResult(record.analysis);
    setCompletedTests(record.completedTests || {});
    setCurrentRecordId(record.id);
    setIsSaved(true);
    setUserNotes(record.studentNotes || '');
    setApiError(null);
    setCameraError(null);
  };

  const handleDeleteObservation = (id: string) => {
    const updated = deleteObservationFromStorage(id);
    setSavedObservations(updated);
    if (currentRecordId === id) {
      setIsSaved(false);
    }
  };

  const handleClearAllObservations = () => {
    clearAllObservationsFromStorage();
    setSavedObservations([]);
    setIsSaved(false);
  };

  const categoryMeta = getCategoryMeta(selectedCategory);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        sunlightMode
          ? 'bg-amber-50 text-slate-950 font-medium selection:bg-amber-400 selection:text-slate-950'
          : 'bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200'
      }`}
    >
      {/* Top Header */}
      <Header
        sunlightMode={sunlightMode}
        onToggleSunlightMode={toggleSunlightMode}
        savedCount={savedObservations.length}
        onOpenJournal={() => setIsJournalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 sm:py-6">
        {/* Clean, Friendly Error Card */}
        {apiError && (
          <div
            role="alert"
            className={`mb-4 p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
              sunlightMode
                ? 'bg-white border-slate-950 text-slate-950 ring-2 ring-amber-400'
                : 'bg-slate-900 border-amber-500/40 text-slate-100 shadow-amber-500/5'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  sunlightMode
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-snug">
                    {apiError.title}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm leading-relaxed mt-1 ${
                      sunlightMode ? 'text-slate-800' : 'text-slate-300'
                    }`}
                  >
                    {apiError.message}
                  </p>
                </div>

                {/* State preservation badge */}
                {imageDataUrl && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      sunlightMode
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        : 'bg-emerald-950/50 text-emerald-300 border border-emerald-700/60'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Your photo, category & notes are preserved</span>
                  </div>
                )}

                {/* Prominent Retry Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleStartAnalysis(1)}
                    disabled={isLoading}
                    className={`w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] border ${
                      sunlightMode
                        ? 'bg-amber-400 text-slate-950 border-slate-950 hover:bg-amber-300 shadow-amber-400/20'
                        : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-amber-500/20'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-950 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Retry Analysis</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic View: Loading vs. Results vs. Capture */}
        {isLoading ? (
          <AnalysisLoading
            sunlightMode={sunlightMode}
            categoryLabel={categoryMeta.label}
            isAutoRetrying={isAutoRetrying}
          />
        ) : analysisResult && imageDataUrl ? (
          <ResultsSection
            analysis={analysisResult}
            category={selectedCategory}
            imageDataUrl={imageDataUrl}
            sunlightMode={sunlightMode}
            onReset={handleReset}
            onSaveToJournal={handleSaveToJournal}
            isSaved={isSaved}
            completedTests={completedTests}
            onToggleTest={handleToggleTest}
            onExpandAnalysis={handleExpandAnalysis}
            isExpanding={isExpanding}
            onRetakePhoto={handleRetakeWithCamera}
            onUploadDifferent={handleUploadFromGallery}
          />
        ) : (
          <CaptureSection
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedImageDataUrl={imageDataUrl}
            onSelectImage={handleSelectImage}
            onClearImage={handleClearImage}
            userNotes={userNotes}
            onChangeUserNotes={setUserNotes}
            onStartAnalysis={() => handleStartAnalysis(0)}
            isLoading={isLoading}
            sunlightMode={sunlightMode}
            onOpenLiveCamera={() => {
              setCameraError(null);
              setIsCameraStreamOpen(true);
            }}
            onLoadSample={handleLoadSample}
            cameraErrorMessage={cameraError}
            onClearCameraError={() => setCameraError(null)}
            galleryTriggerSignal={galleryTriggerSignal}
          />
        )}
      </main>

      {/* Live Viewfinder Camera Modal (Mobile camera or desktop webcam) */}
      <CameraStreamModal
        isOpen={isCameraStreamOpen}
        onClose={() => setIsCameraStreamOpen(false)}
        onCapture={(dataUrl) => {
          setIsCameraStreamOpen(false);
          setCameraError(null);
          handleSelectImage(dataUrl, 'image/jpeg', dataUrl);
        }}
        onFallbackUpload={() => {
          setIsCameraStreamOpen(false);
          setGalleryTriggerSignal((prev) => prev + 1);
        }}
        onCameraError={(msg) => {
          setCameraError(msg);
        }}
        sunlightMode={sunlightMode}
      />

      {/* Offline Field Observations Log Sheet */}
      <FieldJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        observations={savedObservations}
        onSelectObservation={handleSelectPastObservation}
        onDeleteObservation={handleDeleteObservation}
        onClearAll={handleClearAllObservations}
        sunlightMode={sunlightMode}
      />
    </div>
  );
}
