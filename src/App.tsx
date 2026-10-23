import React, { useEffect, useRef, useState } from 'react';
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
import { formatFieldNotebookSummary } from './utils/summaryFormatter';
import { RefreshCw, Clock, Check, X } from 'lucide-react';

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

  // Auto-retry state for temporary/recoverable service disruptions
  const [autoRetryState, setAutoRetryState] = useState<{
    isActive: boolean;
    attempt: number;
    countdown: number;
    delaySeconds: number;
    isFallbackActive: boolean;
  }>({
    isActive: false,
    attempt: 0,
    countdown: 0,
    delaySeconds: 0,
    isFallbackActive: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRequestInProgressRef = useRef<boolean>(false);
  const countdownIntervalRef = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);

  // Sync refs to avoid stale closures in asynchronous retries
  const imageDataUrlRef = useRef<string | null>(imageDataUrl);
  const selectedCategoryRef = useRef<ObservationCategory>(selectedCategory);
  const userNotesRef = useRef<string>(userNotes);
  const mimeTypeRef = useRef<string>(mimeType);

  useEffect(() => {
    imageDataUrlRef.current = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    userNotesRef.current = userNotes;
  }, [userNotes]);

  useEffect(() => {
    mimeTypeRef.current = mimeType;
  }, [mimeType]);

  // Cancel any active auto-retry countdown and clear timers
  const cancelPendingRetry = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setAutoRetryState({
      isActive: false,
      attempt: 0,
      countdown: 0,
      delaySeconds: 0,
      isFallbackActive: false,
    });
  };

  // Complete reset of all retry and request locking state (Requirements 2, 6, 8)
  const resetAllRetryAndRequestState = (options?: { preserveError?: boolean }) => {
    cancelPendingRetry();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isRequestInProgressRef.current = false;
    setIsLoading(false);
    setIsAutoRetrying(false);
    if (!options?.preserveError) {
      setApiError(null);
    }
  };

  // Clean up all timers and in-flight controllers on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Progressive retry backoff delays: 3s -> 5s -> 10s -> 15s -> cap at 20s
  const getBackoffDelay = (attemptNumber: number): number => {
    const delays = [3, 5, 10, 15, 20];
    const idx = Math.min(Math.max(0, attemptNumber - 1), delays.length - 1);
    return delays[idx];
  };

  // Schedule background auto-retry with progressive countdown
  const scheduleAutoRetry = (nextAttempt: number) => {
    // Release active request lock while waiting for countdown delay
    isRequestInProgressRef.current = false;
    setIsLoading(false);
    setIsAutoRetrying(false);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const delay = getBackoffDelay(nextAttempt);
    const isFallback = nextAttempt > 3;

    setAutoRetryState({
      isActive: true,
      attempt: nextAttempt,
      countdown: delay,
      delaySeconds: delay,
      isFallbackActive: isFallback,
    });

    let remaining = delay;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setAutoRetryState((prev) => ({
          ...prev,
          countdown: remaining,
        }));
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        handleStartAnalysis(nextAttempt);
      }
    }, 1000);
  };

  // Immediate retry trigger from button
  const handleRetryNow = () => {
    const nextAttempt = autoRetryState.attempt || 1;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    handleStartAnalysis(nextAttempt);
  };

  // User cancel retry button (Requirement 2: completely reset retry state)
  const handleCancelRetry = () => {
    resetAllRetryAndRequestState({ preserveError: true });
    setApiError({
      title: 'AI service temporarily busy',
      message: 'Automatic retry paused. Your photo, category, and field notes are preserved. Select "Retry Analysis" whenever you are ready.',
      isTemporary: true,
    });
  };

  // Select image from file input or camera (Requirement 2: reset retry/request state)
  const handleSelectImage = (full: string, mime: string, thumb: string) => {
    resetAllRetryAndRequestState();
    setImageDataUrl(full);
    setMimeType(mime);
    setThumbnailDataUrl(thumb);
    setCameraError(null);
  };

  const handleClearImage = () => {
    resetAllRetryAndRequestState();
    setImageDataUrl(null);
    setThumbnailDataUrl(null);
    setAnalysisResult(null);
    setCurrentRecordId(null);
    setIsSaved(false);
    setCompletedTests({});
  };

  // Reset to initial observation state (Requirement 2)
  const handleReset = () => {
    resetAllRetryAndRequestState();
    setImageDataUrl(null);
    setThumbnailDataUrl(null);
    setAnalysisResult(null);
    setCurrentRecordId(null);
    setIsSaved(false);
    setCompletedTests({});
    setUserNotes('');
  };

  const handleRetakeWithCamera = () => {
    resetAllRetryAndRequestState();
    handleReset();
    setCameraError(null);
    setIsCameraStreamOpen(true);
  };

  const handleUploadFromGallery = () => {
    resetAllRetryAndRequestState();
    handleReset();
    setGalleryTriggerSignal((prev) => prev + 1);
  };

  // Perform Gemini AI Multimodal Analysis
  const handleStartAnalysis = async (retryAttempt = 0) => {
    // Requirements 1, 3, 5: When the user manually clicks "Analyze Observation" (retryAttempt === 0):
    // Cancel obsolete retry timers, abort any stale request, and reset locks
    if (retryAttempt === 0) {
      cancelPendingRetry();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isRequestInProgressRef.current = false;
      setApiError(null);
    } else {
      // Automatic background retry: prevent duplicate simultaneous background requests
      if (isRequestInProgressRef.current) {
        return;
      }
    }

    const currentImage = imageDataUrlRef.current || imageDataUrl;
    if (!currentImage) {
      resetAllRetryAndRequestState({ preserveError: true });
      setApiError({
        title: 'No photo selected',
        message: 'Take or upload a photo before starting the analysis.',
        isTemporary: false,
      });
      return;
    }

    // Clear any active countdown timer when request begins
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Requirements 1 & 2: Keep gemini-3.8-flash as primary.
    // If primary model continues returning temporary errors after 3 automatic retry attempts,
    // switch to lighter fallback model: gemini-3.5-flash-lite.
    const isFallbackModel = retryAttempt > 3;
    const modelToUse = isFallbackModel ? 'gemini-3.5-flash-lite' : 'gemini-3.8-flash';

    // Set active request locks and immediately update loading state
    isRequestInProgressRef.current = true;
    setIsLoading(true);
    setIsAutoRetrying(retryAttempt > 0);
    setApiError(null);

    if (retryAttempt > 0) {
      setAutoRetryState((prev) => ({
        ...prev,
        isActive: true,
        attempt: retryAttempt,
        isFallbackActive: isFallbackModel,
      }));
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/analyze-observation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: currentImage,
          mimeType: mimeTypeRef.current || mimeType,
          category: selectedCategoryRef.current || selectedCategory,
          userNotes: userNotesRef.current || userNotes,
          retryAttempt,
          model: modelToUse,
        }),
        signal: controller.signal,
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // If aborted by user action in the meantime, discard result cleanly
      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok || !data?.success) {
        // Requirement 2: Do NOT auto-retry permanent errors
        const isPermanent =
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403 ||
          data?.errorType === 'NO_IMAGE' ||
          data?.errorType === 'INVALID_REQUEST' ||
          data?.errorType === 'MISSING_CONFIG' ||
          data?.errorType === 'AUTH_ERROR';

        if (isPermanent) {
          resetAllRetryAndRequestState({ preserveError: true });
          setApiError({
            title: data?.title || 'Unable to analyze photo',
            message: data?.message || 'Please check your photo and observation settings.',
            isTemporary: false,
          });
          return;
        }

        // Recoverable failure -> schedule progressive background auto-retry
        const nextAttempt = (retryAttempt || 0) + 1;
        scheduleAutoRetry(nextAttempt);
        return;
      }

      // Requirements 2 & 8: Success -> complete reset of retry/request state and render results
      resetAllRetryAndRequestState({ preserveError: false });
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
      if (err.name === 'AbortError' || controller.signal.aborted) {
        // Clean cancellation - do not schedule auto-retry
        return;
      }

      console.error('Field analysis error:', err);

      // Requirement 7: Network / timeout / connection failure is recoverable
      const nextAttempt = (retryAttempt || 0) + 1;
      scheduleAutoRetry(nextAttempt);
    } finally {
      // Requirement 8: Defensive finally block guarantees request lock is always released
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        isRequestInProgressRef.current = false;
        setIsLoading(false);
        setIsAutoRetrying(false);
      }
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
      fieldNoteSummary: formatFieldNotebookSummary(
        analysisResult.fieldNoteSummary ||
          (analysisResult as any).fieldNotebookSummary ||
          (analysisResult as any).summary ||
          '',
        {
          category: selectedCategory,
          visibleEvidence: analysisResult.visibleEvidence,
          possibleInterpretation: analysisResult.possibleInterpretation,
          inPersonChecks:
            analysisResult.inPersonInvestigateQuestions ||
            (analysisResult as any).inPersonVerificationChecks ||
            (analysisResult as any).verificationChecks,
        }
      ),
    };

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
    resetAllRetryAndRequestState();
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
    resetAllRetryAndRequestState();
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
        {/* Automatic Background Retry Status Card (Replaces the failure card during auto-retry) */}
        {autoRetryState.isActive ? (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
              sunlightMode
                ? 'bg-white border-slate-950 text-slate-950 ring-2 ring-amber-400'
                : 'bg-slate-900 border-amber-500/40 text-slate-100 shadow-amber-500/10'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${
                  sunlightMode
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base leading-snug">
                      {autoRetryState.isFallbackActive
                        ? 'Primary AI model is busy. Trying backup model…'
                        : 'AI service temporarily busy'}
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        sunlightMode
                          ? 'bg-amber-200 text-slate-950 border border-amber-400'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      Attempt #{autoRetryState.attempt}
                      {autoRetryState.isFallbackActive ? ' · Backup model' : ''}
                    </span>
                  </div>
                  <p
                    className={`text-xs sm:text-sm leading-relaxed mt-1 ${
                      sunlightMode ? 'text-slate-800' : 'text-slate-300'
                    }`}
                  >
                    {autoRetryState.isFallbackActive
                      ? 'Your photo is safe. Automatically switching to lighter backup model for faster recovery.'
                      : 'Your photo is safe. FieldLens will automatically try again.'}
                  </p>
                </div>

                {/* Countdown & State Preservation Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      sunlightMode
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
                        : 'bg-amber-950/60 text-amber-300 border border-amber-700/60'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {isLoading
                        ? autoRetryState.isFallbackActive
                          ? 'Connecting to backup model...'
                          : 'Connecting to AI service...'
                        : `Retrying in ${autoRetryState.countdown}s...`}
                    </span>
                  </div>

                  {imageDataUrl && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        sunlightMode
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : 'bg-emerald-950/50 text-emerald-300 border border-emerald-700/60'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Photo & notes preserved</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Retry Now & Cancel Retry */}
                <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRetryNow}
                    disabled={isLoading}
                    className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] border ${
                      sunlightMode
                        ? 'bg-amber-400 text-slate-950 border-slate-950 hover:bg-amber-300 shadow-amber-400/20'
                        : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-amber-500/20'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Retry Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelRetry}
                    className={`min-h-[44px] px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border ${
                      sunlightMode
                        ? 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Retry</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : apiError ? (
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
                {apiError.isTemporary && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleStartAnalysis(0)}
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
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Dynamic View: Loading vs. Results vs. Capture */}
        {isLoading ? (
          <AnalysisLoading
            sunlightMode={sunlightMode}
            categoryLabel={categoryMeta.label}
            isAutoRetrying={isAutoRetrying}
            isFallbackModel={autoRetryState.isFallbackActive}
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
