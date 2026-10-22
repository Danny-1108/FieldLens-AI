import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Trash2,
  Download,
  Calendar,
  Compass,
  ArrowRight,
  ExternalLink,
  Check,
} from 'lucide-react';
import { ObservationRecord } from '../types';
import { getCategoryMeta } from '../utils/categories';
import { formatObservationAsMarkdown } from '../utils/storage';

interface FieldJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  observations: ObservationRecord[];
  onSelectObservation: (record: ObservationRecord) => void;
  onDeleteObservation: (id: string) => void;
  onClearAll: () => void;
  sunlightMode: boolean;
}

export const FieldJournalModal: React.FC<FieldJournalModalProps> = ({
  isOpen,
  onClose,
  observations,
  onSelectObservation,
  onDeleteObservation,
  onClearAll,
  sunlightMode,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const handleExportAll = () => {
    if (observations.length === 0) return;
    const combined = observations.map(formatObservationAsMarkdown).join('\n\n');
    const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FieldLens_Journal_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAllNotes = async () => {
    if (observations.length === 0) return;
    const combined = observations.map(formatObservationAsMarkdown).join('\n\n');
    try {
      await navigator.clipboard.writeText(combined);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (e) {
      console.error('Failed to copy journal:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full sm:max-w-xl max-h-[88vh] rounded-t-3xl sm:rounded-2xl border flex flex-col overflow-hidden shadow-2xl transition-all ${
          sunlightMode
            ? 'bg-white border-slate-950 text-slate-950'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Grab Handle & Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            sunlightMode ? 'bg-amber-100 border-slate-300' : 'bg-slate-800/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className={`w-5 h-5 ${sunlightMode ? 'text-slate-950' : 'text-emerald-400'}`} />
            <div>
              <h3 className="text-sm font-bold">Field Observations Log</h3>
              <p className={`text-[11px] ${sunlightMode ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                {observations.length} {observations.length === 1 ? 'entry' : 'entries'} saved offline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-slate-700/50"
            aria-label="Close field log"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {observations.length === 0 ? (
            <div className="py-12 text-center text-xs space-y-2">
              <BookOpen className="w-8 h-8 mx-auto opacity-30" />
              <p className="font-semibold">No Field Observations Saved Yet</p>
              <p className="text-slate-400 max-w-xs mx-auto">
                After analyzing a specimen photo, tap &quot;Save to Log&quot; to review it here anytime, even without an internet connection.
              </p>
            </div>
          ) : (
            observations.map((item) => {
              const meta = getCategoryMeta(item.category);
              const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    sunlightMode
                      ? 'bg-slate-50 border-slate-300 hover:border-slate-500'
                      : 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={item.thumbnailDataUrl || item.imageDataUrl}
                    alt={item.category}
                    className="w-14 h-14 rounded-lg object-cover border border-slate-700/40 shrink-0 mt-0.5"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          sunlightMode ? 'text-amber-700' : 'text-amber-400'
                        }`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{dateStr}</span>
                    </div>

                    <p className="text-xs font-semibold line-clamp-2 mt-0.5 leading-snug">
                      {item.analysis.possibleInterpretation}
                    </p>

                    <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-700/30">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectObservation(item);
                          onClose();
                        }}
                        className={`text-[11px] font-bold flex items-center gap-1 ${
                          sunlightMode ? 'text-slate-950 hover:underline' : 'text-amber-400 hover:underline'
                        }`}
                      >
                        <span>View Notes</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteObservation(item.id)}
                        className="text-[11px] text-red-400 hover:text-red-300 ml-auto flex items-center gap-1"
                        title="Delete from log"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {observations.length > 0 && (
          <div
            className={`p-3.5 border-t flex items-center justify-between gap-2 text-xs ${
              sunlightMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-800/90 border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={handleExportAll}
              className={`min-h-[40px] px-3 rounded-lg font-bold flex items-center gap-1.5 border ${
                sunlightMode
                  ? 'bg-white text-slate-950 border-slate-400 hover:bg-slate-200'
                  : 'bg-slate-700 text-slate-100 border-slate-600 hover:bg-slate-600'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAllNotes}
              className={`min-h-[40px] px-3 rounded-lg font-bold flex items-center gap-1.5 border ${
                copiedAll
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : sunlightMode
                  ? 'bg-amber-400 text-slate-950 border-slate-950'
                  : 'bg-amber-500 text-slate-950 border-amber-400'
              }`}
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Copied All!' : 'Copy All Log'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all saved field observations from this device?')) {
                  onClearAll();
                }
              }}
              className="text-red-400 hover:text-red-300 text-[11px] px-2 py-1"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
