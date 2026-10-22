import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Mountain,
  Sprout,
  Droplets,
  Compass,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ObservationCategory } from '../types';
import { CATEGORIES } from '../utils/categories';
import { SAMPLE_SPECIMENS } from '../utils/sampleObservations';
import { processFieldImage } from '../utils/imageUtils';

interface CaptureSectionProps {
  selectedCategory: ObservationCategory;
  onSelectCategory: (cat: ObservationCategory) => void;
  selectedImageDataUrl: string | null;
  onSelectImage: (fullDataUrl: string, mimeType: string, thumbnailDataUrl: string) => void;
  onClearImage: () => void;
  userNotes: string;
  onChangeUserNotes: (notes: string) => void;
  onStartAnalysis: () => void;
  isLoading: boolean;
  sunlightMode: boolean;
  onOpenLiveCamera: () => void;
  onLoadSample: (sampleId: string) => void;
  cameraErrorMessage?: string | null;
  onClearCameraError?: () => void;
  galleryTriggerSignal?: number;
}

export const CaptureSection: React.FC<CaptureSectionProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedImageDataUrl,
  onSelectImage,
  onClearImage,
  userNotes,
  onChangeUserNotes,
  onStartAnalysis,
  isLoading,
  sunlightMode,
  onOpenLiveCamera,
  onLoadSample,
  cameraErrorMessage,
  onClearCameraError,
  galleryTriggerSignal,
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showScaleBar, setShowScaleBar] = useState(false);
  const [showNotesField, setShowNotesField] = useState(false);

  // Trigger gallery input programmatically when signal increments (e.g. from camera fallback)
  useEffect(() => {
    if (galleryTriggerSignal && galleryTriggerSignal > 0) {
      galleryInputRef.current?.click();
    }
  }, [galleryTriggerSignal]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInputError(null);
    setProcessingImage(true);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file (JPG, PNG, HEIC, WEBP).');
      }

      const processed = await processFieldImage(file);
      onSelectImage(processed.fullBase64, processed.mimeType, processed.thumbnailBase64);
    } catch (err: any) {
      console.error('Image processing error:', err);
      setInputError(err.message || 'Failed to process selected photo.');
    } finally {
      setProcessingImage(false);
      // Reset input value so same photo can be re-selected if desired
      e.target.value = '';
    }
  };

  const getCategoryIcon = (id: ObservationCategory) => {
    switch (id) {
      case 'geology':
        return <Mountain className="w-5 h-5" />;
      case 'plant':
        return <Sprout className="w-5 h-5" />;
      case 'water':
        return <Droplets className="w-5 h-5" />;
      case 'landscape':
        return <Compass className="w-5 h-5" />;
      case 'other':
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  const currentCategoryMeta = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <div className="space-y-5 pb-6">
      {/* File input configured strictly for gallery / file selection */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* STEP 1: Photo Capture / Viewfinder Box */}
      <section aria-labelledby="photo-step-heading">
        <div className="flex items-center justify-between mb-2">
          <h2
            id="photo-step-heading"
            className={`text-xs font-bold tracking-wider uppercase ${
              sunlightMode ? 'text-slate-950 font-black' : 'text-slate-400'
            }`}
          >
            1. Field Specimen Photo
          </h2>

          {/* Quick Demo Loader Pill */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className={`text-[11px] ${sunlightMode ? 'text-slate-800' : 'text-slate-400'}`}>Demo:</span>
            {SAMPLE_SPECIMENS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onLoadSample(sample.id)}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  sample.analysis.isOutOfScope
                    ? sunlightMode
                      ? 'bg-rose-100 text-rose-950 border-rose-400 font-bold hover:bg-rose-200'
                      : 'bg-rose-950/40 text-rose-300 border-rose-800 hover:bg-rose-900/60'
                    : sunlightMode
                    ? 'bg-white text-slate-900 border-slate-400 font-semibold hover:bg-slate-100'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                }`}
                title={`Load sample: ${sample.name}`}
              >
                {sample.analysis.isOutOfScope
                  ? 'Out of Scope'
                  : sample.category === 'geology'
                  ? 'Rock'
                  : sample.category === 'plant'
                  ? 'Plant'
                  : 'Stream'}
              </button>
            ))}
          </div>
        </div>

        {/* Viewfinder Preview or Capture Triggers */}
        {selectedImageDataUrl ? (
          <div
            className={`relative rounded-2xl overflow-hidden border transition-all ${
              sunlightMode
                ? 'bg-black border-slate-950 ring-2 ring-amber-400'
                : 'bg-slate-950 border-slate-800 shadow-xl'
            }`}
          >
            <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={selectedImageDataUrl}
                alt="Captured field specimen observation"
                className="w-full h-full object-contain"
              />

              {/* Optional 5cm Field Scale Bar Overlay */}
              {showScaleBar && (
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm border border-amber-400 text-amber-300 px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-2 pointer-events-none">
                  <div className="w-12 h-1 bg-amber-400"></div>
                  <span>~5 cm estimated scale</span>
                </div>
              )}

              {/* Top overlay buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScaleBar((s) => !s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border transition-colors ${
                    showScaleBar
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900/80 text-white border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Toggle scale reference guide"
                >
                  Scale Bar
                </button>
                <button
                  type="button"
                  onClick={onClearImage}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-950/80 text-red-200 border border-red-800/80 hover:bg-red-900 backdrop-blur-md"
                  title="Remove this photo"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Bottom info bar below image */}
            <div
              className={`p-3 flex items-center justify-between text-xs border-t ${
                sunlightMode
                  ? 'bg-amber-100 text-slate-950 border-slate-900 font-medium'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Photo ready for analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenLiveCamera}
                  className="text-amber-500 hover:underline font-semibold"
                >
                  Take Another Photo
                </button>
                <span className="text-slate-500">·</span>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-slate-400 hover:underline"
                >
                  Upload from Gallery
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl border p-5 transition-all text-center ${
              sunlightMode
                ? 'bg-white border-slate-950 shadow-md'
                : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <div className="max-w-md mx-auto space-y-4">
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                  sunlightMode ? 'bg-amber-400 text-slate-950' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                <Camera className="w-7 h-7" />
              </div>

              <div>
                <h3 className={`text-base font-bold ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
                  Field Observation Photo
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
                  Open camera or webcam to frame your specimen, or upload an existing field photo.
                </p>
              </div>

              {/* Primary Camera Action + Secondary Gallery Upload */}
              <div className="space-y-2.5 pt-1">
                {/* 1. Primary Action: True In-App Live Camera Viewfinder */}
                <button
                  type="button"
                  onClick={onOpenLiveCamera}
                  disabled={processingImage}
                  className={`w-full min-h-[54px] px-4 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all border ${
                    sunlightMode
                      ? 'bg-amber-400 text-slate-950 border-slate-950 hover:bg-amber-300 shadow-amber-400/20'
                      : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-amber-500/20'
                  }`}
                >
                  <Camera className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>Take Photo with Camera</span>
                </button>

                {/* 2. Secondary Action: Gallery File Upload */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={processingImage}
                  className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border ${
                    sunlightMode
                      ? 'bg-white text-slate-900 border-slate-400 hover:bg-slate-100'
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Upload from Gallery</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera Permission / Availability Notice */}
        {cameraErrorMessage && (
          <div className="mt-3 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">Camera Access Notice</span>
                {onClearCameraError && (
                  <button
                    type="button"
                    onClick={onClearCameraError}
                    className="text-slate-400 hover:text-slate-200 text-[11px] underline"
                  >
                    Dismiss
                  </button>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">{cameraErrorMessage}</p>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload from Gallery instead</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Error Message */}
        {inputError && (
          <div className="mt-2.5 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Error processing image</p>
              <p className="text-[11px] text-red-300 mt-0.5">{inputError}</p>
            </div>
          </div>
        )}
      </section>

      {/* STEP 2: Observation Category Selector */}
      <section aria-labelledby="category-step-heading">
        <div className="flex items-center justify-between mb-2">
          <h2
            id="category-step-heading"
            className={`text-xs font-bold tracking-wider uppercase ${
              sunlightMode ? 'text-slate-950 font-black' : 'text-slate-400'
            }`}
          >
            2. Observation Category
          </h2>
          <span className={`text-[11px] ${sunlightMode ? 'text-slate-800' : 'text-slate-400'}`}>Required</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={`min-h-[56px] p-3 rounded-xl text-left transition-all border flex flex-col justify-between ${
                  isSelected
                    ? sunlightMode
                      ? 'bg-amber-400 text-slate-950 border-slate-950 shadow-md font-bold ring-2 ring-slate-950'
                      : 'bg-amber-500/15 text-amber-200 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : sunlightMode
                    ? 'bg-white text-slate-900 border-slate-400 hover:bg-slate-100'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`${
                      isSelected
                        ? sunlightMode
                          ? 'text-slate-950'
                          : 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {getCategoryIcon(category.id)}
                  </div>
                  <span className="text-xs font-bold leading-tight">{category.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Category Field Guidance Hint */}
        <div
          className={`mt-2.5 p-3 rounded-xl border text-xs flex items-start gap-2 ${
            sunlightMode
              ? 'bg-amber-50 text-slate-900 border-amber-300'
              : 'bg-slate-800/50 text-slate-300 border-slate-800'
          }`}
        >
          <HelpCircle className={`w-4 h-4 shrink-0 mt-0.5 ${sunlightMode ? 'text-amber-700' : 'text-amber-400'}`} />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-400 mr-1">Field Tip:</span>
            <span>{currentCategoryMeta.hint}</span>
          </div>
        </div>
      </section>

      {/* Optional: Student Field Notes / Context */}
      <section>
        <button
          type="button"
          onClick={() => setShowNotesField((v) => !v)}
          className={`text-xs font-medium flex items-center gap-1.5 transition-colors ${
            sunlightMode ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{showNotesField ? 'Hide student field notes' : '+ Add field notes (weather, altitude, smell, scratch test)'}</span>
        </button>

        {showNotesField && (
          <div className="mt-2">
            <textarea
              value={userNotes}
              onChange={(e) => onChangeUserNotes(e.target.value)}
              placeholder="e.g. Scratched by steel knife; damp north-facing creek bank; strong sulfur smell; altitude 620m..."
              rows={2}
              className={`w-full p-3 rounded-xl text-xs border outline-none transition-colors ${
                sunlightMode
                  ? 'bg-white text-slate-950 border-slate-950 placeholder:text-slate-500 focus:border-amber-500'
                  : 'bg-slate-900 text-slate-100 border-slate-700 placeholder:text-slate-500 focus:border-amber-500'
              }`}
            />
          </div>
        )}
      </section>

      {/* STEP 3: Primary Analyze Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onStartAnalysis}
          disabled={!selectedImageDataUrl || isLoading || processingImage}
          className={`w-full min-h-[54px] rounded-xl font-bold text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] border ${
            !selectedImageDataUrl || isLoading
              ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
              : sunlightMode
              ? 'bg-amber-400 text-slate-950 border-slate-950 hover:bg-amber-300 shadow-amber-400/20'
              : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-amber-500/20'
          }`}
        >
          <Sparkles className="w-5 h-5 shrink-0" />
          <span>Analyze Observation</span>
        </button>

        {!selectedImageDataUrl && (
          <p className={`text-center text-[11px] mt-2 ${sunlightMode ? 'text-slate-800' : 'text-slate-400'}`}>
            Take or upload a photo before starting the analysis.
          </p>
        )}
      </div>
    </div>
  );
};
