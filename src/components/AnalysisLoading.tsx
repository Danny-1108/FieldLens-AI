import React, { useEffect, useState } from 'react';
import { Compass, CheckCircle2, Loader2 } from 'lucide-react';

interface AnalysisLoadingProps {
  sunlightMode: boolean;
  categoryLabel: string;
  isAutoRetrying?: boolean;
  isFallbackModel?: boolean;
}

const LOADING_STAGES = [
  { id: 0, label: 'Analyzing image' },
  { id: 1, label: 'Identifying visible features' },
  { id: 2, label: 'Preparing field checks' },
];

export const AnalysisLoading: React.FC<AnalysisLoadingProps> = ({
  sunlightMode,
  categoryLabel,
  isAutoRetrying = false,
  isFallbackModel = false,
}) => {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    // Quickly advance through the stages to match fast response time
    const timer1 = setTimeout(() => setActiveStage(1), 900);
    const timer2 = setTimeout(() => setActiveStage(2), 1800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 my-4 text-center border transition-all ${
        sunlightMode
          ? 'bg-white border-slate-950 shadow-xl text-slate-950'
          : 'bg-slate-800/80 border-slate-700 shadow-2xl backdrop-blur-md text-slate-100'
      }`}
    >
      <div className="max-w-xs sm:max-w-sm mx-auto space-y-4">
        {/* Animated Scanner Radar */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed animate-spin ${
              sunlightMode ? 'border-slate-950 text-slate-950' : 'border-amber-400 text-amber-400'
            }`}
            style={{ animationDuration: '4s' }}
          >
            <Compass className="w-7 h-7" />
          </div>
        </div>

        {/* Title */}
        <div>
          <span
            className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
              sunlightMode ? 'bg-amber-400 text-slate-950 font-black' : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {categoryLabel}
          </span>
          <h3 className={`text-base font-bold mt-1.5 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
            {isFallbackModel
              ? 'Connecting to Backup AI Model'
              : isAutoRetrying
              ? 'Retrying Field Analysis'
              : 'Analyzing Observation'}
          </h3>
          {isFallbackModel ? (
            <p className="text-xs text-amber-400 mt-1 font-medium">
              Primary model busy. Using backup model for faster recovery.
            </p>
          ) : isAutoRetrying ? (
            <p className="text-xs text-amber-400 mt-1 font-medium">
              High service demand detected. Automatically retrying...
            </p>
          ) : null}
        </div>

        {/* 3 Explicit Progress Steps */}
        <div
          className={`p-3 rounded-xl border text-left space-y-2.5 ${
            sunlightMode ? 'bg-amber-50/70 border-slate-300' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {LOADING_STAGES.map((stage) => {
            const isCompleted = activeStage > stage.id;
            const isCurrent = activeStage === stage.id;
            return (
              <div key={stage.id} className="flex items-center gap-2.5 text-xs font-semibold">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : isCurrent ? (
                  <Loader2
                    className={`w-4 h-4 animate-spin shrink-0 ${
                      sunlightMode ? 'text-slate-950' : 'text-amber-400'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full border border-dashed shrink-0 ${
                      sunlightMode ? 'border-slate-400' : 'border-slate-600'
                    }`}
                  />
                )}
                <span
                  className={`${
                    isCurrent
                      ? sunlightMode
                        ? 'text-slate-950 font-bold'
                        : 'text-amber-300 font-bold'
                      : isCompleted
                      ? 'text-emerald-500 font-medium'
                      : sunlightMode
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className={`text-[11px] ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
          Generating rapid field note...
        </p>
      </div>
    </div>
  );
};
