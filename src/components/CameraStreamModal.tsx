import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Grid, Upload } from 'lucide-react';

interface CameraStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  onFallbackUpload?: () => void;
  onCameraError?: (message: string) => void;
  sunlightMode: boolean;
}

export const CameraStreamModal: React.FC<CameraStreamModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackUpload,
  onCameraError,
  sunlightMode,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }
    startCamera();
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setError(null);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Camera access is turned off. Allow camera access or upload a photo instead.';
      setError(msg);
      onCameraError?.(msg);
      return;
    }

    try {
      // First check available video devices to see if switching is possible
      try {
        if (navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoInputs.length > 1);
        }
      } catch {
        // Non-critical check
      }

      let stream: MediaStream;
      try {
        // Try ideal mobile or high-res webcam constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback for desktop webcams or browsers that reject advanced facingMode/resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      let msg = 'Camera access is turned off. Allow camera access or upload a photo instead.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera access is turned off. Allow camera access or upload a photo instead.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera was detected. You can upload a photo instead.';
      } else {
        msg = 'Camera access is turned off. Allow camera access or upload a photo instead.';
      }
      setError(msg);
      onCameraError?.(msg);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopStream();
    onCapture(dataUrl);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 pb-safe select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between text-white z-10">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-800"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            title="Toggle field observation scale grid"
            className={`min-h-[44px] px-3 flex items-center gap-1.5 rounded-full text-xs font-medium border ${
              showGrid ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900/80 text-slate-300 border-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Grid</span>
          </button>

          {hasMultipleCameras && (
            <button
              type="button"
              onClick={toggleFacingMode}
              title="Switch front/back camera"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-slate-800"
              aria-label="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Viewfinder Area */}
      <div className="relative flex-1 my-3 flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 border border-slate-800">
        {error ? (
          <div className="p-6 text-center max-w-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Camera Notice</h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">{error}</p>
            </div>
            <div className="pt-2 space-y-2">
              {onFallbackUpload && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFallbackUpload();
                  }}
                  className="w-full min-h-[46px] px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload from Gallery</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[42px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Viewfinder
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-amber-400/30">
                <div className="border-r border-b border-amber-400/25"></div>
                <div className="border-r border-b border-amber-400/25"></div>
                <div className="border-b border-amber-400/25"></div>
                <div className="border-r border-b border-amber-400/25"></div>
                <div className="border-r border-b border-amber-400/25 flex items-center justify-center">
                  <div className="w-8 h-8 border border-amber-400/50 rounded-full"></div>
                </div>
                <div className="border-b border-amber-400/25"></div>
                <div className="border-r border-b border-amber-400/25"></div>
                <div className="border-r border-b border-amber-400/25"></div>
                <div></div>
              </div>
            )}

            {/* Scale Bar Hint */}
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm border border-slate-700 text-white px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-amber-400 inline-block"></span>
              <span>1 cm scale guide</span>
            </div>
          </>
        )}
      </div>

      {/* Shutter Button Zone */}
      <div className="flex items-center justify-center pb-2">
        <button
          type="button"
          onClick={handleSnap}
          disabled={Boolean(error)}
          aria-label="Capture field photo"
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            error
              ? 'opacity-40 cursor-not-allowed bg-slate-800'
              : sunlightMode
              ? 'bg-amber-400 active:scale-95 shadow-xl shadow-amber-400/20'
              : 'bg-white active:scale-95 shadow-xl shadow-white/20 hover:bg-slate-100'
          }`}
        >
          <div className="w-16 h-16 rounded-full border-2 border-slate-950 flex items-center justify-center">
            <Camera className="w-7 h-7 text-slate-950" />
          </div>
        </button>
      </div>
    </div>
  );
};
