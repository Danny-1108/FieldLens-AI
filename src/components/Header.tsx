import React from 'react';
import { Sun, Moon, BookOpen, Compass } from 'lucide-react';

interface HeaderProps {
  sunlightMode: boolean;
  onToggleSunlightMode: () => void;
  savedCount: number;
  onOpenJournal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sunlightMode,
  onToggleSunlightMode,
  savedCount,
  onOpenJournal,
}) => {
  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-200 border-b ${
        sunlightMode
          ? 'bg-amber-400 text-slate-950 border-slate-950 font-bold'
          : 'bg-slate-900/95 text-slate-100 border-slate-800 backdrop-blur-md'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              sunlightMode ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">FieldLens</h1>
            <p className={`text-[11px] leading-none ${sunlightMode ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
              Field Observation Assistant
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Sunlight Mode Boost Toggle */}
          <button
            type="button"
            onClick={onToggleSunlightMode}
            title={sunlightMode ? 'Switch to Standard Theme' : 'High-Contrast Sunlight Mode for outdoors'}
            aria-label="Toggle outdoor sunlight mode"
            className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              sunlightMode
                ? 'bg-slate-950 text-amber-300 border-slate-950 shadow-sm'
                : 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {sunlightMode ? <Moon className="w-4 h-4 text-amber-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span className="hidden sm:inline">{sunlightMode ? 'Normal View' : 'Sunlight Mode'}</span>
            <span className="sm:hidden">{sunlightMode ? 'Normal' : 'Sun'}</span>
          </button>

          {/* Field Journal Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenJournal}
            title="View saved field observations journal"
            aria-label="Open field journal"
            className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              sunlightMode
                ? 'bg-slate-950 text-white border-slate-950'
                : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Field Log</span>
            {savedCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  sunlightMode ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
