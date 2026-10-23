import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Eye,
  HelpCircle,
  Bookmark,
  Share2,
  CheckSquare,
  Square,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Loader2,
  AlertTriangle,
  Camera,
  Upload,
  Layers,
} from 'lucide-react';
import { FieldAnalysisResult, ObservationCategory } from '../types';
import { getCategoryMeta } from '../utils/categories';
import { formatFieldNotebookSummary } from '../utils/summaryFormatter';
import { getContextAwareFallbackChecks } from '../utils/contextChecks';

interface ResultsSectionProps {
  analysis: FieldAnalysisResult;
  category: ObservationCategory;
  imageDataUrl: string;
  sunlightMode: boolean;
  onReset: () => void;
  onSaveToJournal: () => void;
  isSaved: boolean;
  completedTests: Record<string, boolean>;
  onToggleTest: (testName: string) => void;
  onExpandAnalysis: () => void;
  isExpanding: boolean;
  onRetakePhoto?: () => void;
  onUploadDifferent?: () => void;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  analysis,
  category,
  imageDataUrl,
  sunlightMode,
  onReset,
  onSaveToJournal,
  isSaved,
  completedTests,
  onToggleTest,
  onExpandAnalysis,
  isExpanding,
  onRetakePhoto,
  onUploadDifferent,
}) => {
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [showExpandedDetails, setShowExpandedDetails] = useState(true);
  const categoryMeta = getCategoryMeta(category);

  const isOutOfScope = Boolean(analysis.isOutOfScope);

  // --- DETERMINISTIC SECTION DATA RESOLUTION & RECOVERY ---
  // Section 1: Possible Interpretation
  const possibleInterpretation =
    analysis.possibleInterpretation?.trim() ||
    (analysis as any).interpretation?.trim() ||
    (analysis as any).possible_interpretation?.trim() ||
    `Visual features appear consistent with natural ${categoryMeta.label.toLowerCase()} traits in the field. Visual observation alone cannot confirm identification without physical testing.`;

  // Section 2: Visible Evidence from Image (Exactly 3 descriptive points)
  const visibleEvidence: string[] = (() => {
    const raw =
      analysis.visibleEvidence ||
      (analysis as any).visible_evidence ||
      (analysis as any).evidence ||
      (analysis as any).visiblePoints ||
      [];
    const list = Array.isArray(raw)
      ? raw
          .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
          .map((s: string) => s.trim())
      : [];
    if (list.length >= 3) return list.slice(0, 3);
    const fallbacks = [
      'Contrasting surface tonal variations and distinct granular grain boundaries visible across the face.',
      'Textural relief showing irregular angular fractures and subtle shadow variations under field lighting.',
      'Surface contact boundary showing distinct coloration differences compared to the surrounding background.',
    ];
    for (const f of fallbacks) {
      if (list.length < 3 && !list.includes(f)) list.push(f);
    }
    return list.slice(0, 3);
  })();

  // Section 3: Recommended In-Person Verification Checks (Exactly 3 safe checks)
  const inPersonChecks: string[] = (() => {
    const candidate =
      analysis.inPersonInvestigateQuestions ||
      (analysis as any).inPersonVerificationChecks ||
      (analysis as any).verificationChecks ||
      (analysis as any).recommendedChecks ||
      (analysis as any).inPersonChecks ||
      (analysis as any).checks ||
      (analysis as any).in_person_investigate_questions ||
      (analysis as any).fieldChecks;

    let list: string[] = [];
    if (Array.isArray(candidate)) {
      list = candidate
        .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        .map((item: string) => item.trim());
    }

    // Try extracting from fieldTestsChecklist if checks list is empty/incomplete
    if (list.length < 3 && Array.isArray(analysis.fieldTestsChecklist)) {
      for (const t of analysis.fieldTestsChecklist) {
        if (t && typeof t === 'object' && t.instruction) {
          const checkText = t.testName ? `${t.testName}: ${t.instruction}` : t.instruction;
          if (checkText.trim().length > 0 && !list.includes(checkText.trim())) {
            list.push(checkText.trim());
          }
        }
      }
    }

    if (list.length >= 3) return list.slice(0, 3);

    const fallbacks = getContextAwareFallbackChecks(category, possibleInterpretation, visibleEvidence);
    for (const f of fallbacks) {
      if (list.length < 3 && !list.includes(f)) list.push(f);
    }
    return list.slice(0, 3);
  })();

  // Section 4: Field Notebook Summary (Max 3 sentences, natural, concise, no duplicate phrases)
  const fieldNoteSummary: string = (() => {
    const rawSum =
      analysis.fieldNoteSummary ||
      (analysis as any).fieldNotebookSummary ||
      (analysis as any).fieldSummary ||
      (analysis as any).notebookSummary ||
      (analysis as any).summary ||
      (analysis as any).field_note_summary;

    return formatFieldNotebookSummary(rawSum, {
      category,
      visibleEvidence,
      possibleInterpretation,
      inPersonChecks,
    });
  })();

  // Synchronized in-situ interactive checklist
  const fieldTests = (
    Array.isArray(analysis.fieldTestsChecklist) && analysis.fieldTestsChecklist.length > 0
      ? analysis.fieldTestsChecklist
      : inPersonChecks.map((check, i) => {
          const parts = check.split(':');
          const testName = parts.length > 1 ? parts[0].trim() : `Verification Check ${i + 1}`;
          const instruction = parts.length > 1 ? parts.slice(1).join(':').trim() : check;
          return {
            testName: testName.length > 32 ? testName.slice(0, 32) : testName,
            instruction: instruction || 'Conduct in-situ verification following Leave No Trace principles.',
            diagnosticClue: 'May provide physical evidence to evaluate the preliminary hypothesis.',
          };
        })
  ).slice(0, 3);

  const handleCopyNote = async () => {
    if (!fieldNoteSummary) return;
    try {
      await navigator.clipboard.writeText(fieldNoteSummary);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2200);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleCopyAll = async () => {
    try {
      let fullText = `FIELDLENS OBSERVATION [${category.toUpperCase()}]
--------------------------------------------------
1. POSSIBLE INTERPRETATION:
${possibleInterpretation}

2. VISIBLE EVIDENCE FROM IMAGE:
${visibleEvidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}

3. RECOMMENDED IN-PERSON VERIFICATION CHECKS:
${inPersonChecks.map((q) => `[ ] ${q}`).join('\n')}

4. FIELD NOTE SUMMARY:
${fieldNoteSummary}

DISCLAIMER:
${analysis.uncertaintyDisclaimer || 'AI field observations are preliminary hypotheses based on image features. Physical testing required. Always observe Leave No Trace principles.'}`;

      if (analysis.expandedAnalysis) {
        fullText += `\n\n--------------------------------------------------
EXPANDED FIELD ANALYSIS:
• Detailed Interpretation: ${analysis.expandedAnalysis.detailedInterpretation}
• Formation Context: ${analysis.expandedAnalysis.formationContext}
• Diagnostic Key:
${(analysis.expandedAnalysis.diagnosticKey || []).map((k) => `  - ${k}`).join('\n')}
• Advanced Tests:
${(analysis.expandedAnalysis.advancedFieldTests || []).map((t) => `  - ${t}`).join('\n')}
• Environmental Significance: ${analysis.expandedAnalysis.environmentalSignificance}`;
      }

      await navigator.clipboard.writeText(fullText);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2200);
    } catch (err) {
      console.error('Full copy failed:', err);
    }
  };

  // --- OUT OF SCOPE VIEW ---
  if (isOutOfScope) {
    const suggested = analysis.suggestedExamples || [
      'Rocks, minerals, or exposed rock outcrops',
      'Wild plants, foliage, or tree bark',
      'Natural soil horizons, sediments, or substrate',
      'Water bodies, streams, lakes, or runoff channels',
      'Erosion patterns, ridges, or landforms',
    ];

    return (
      <div className="space-y-4 pb-12">
        {/* Top Summary Bar */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
            sunlightMode
              ? 'bg-white border-slate-950 text-slate-950 shadow-md'
              : 'bg-slate-800/80 border-slate-700/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={imageDataUrl}
              alt="Evaluated image thumbnail"
              className="w-13 h-13 rounded-xl object-cover border border-slate-700/50 shrink-0"
            />
            <div className="min-w-0">
              <span
                className={`text-[11px] font-bold tracking-wider uppercase ${
                  sunlightMode ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                Scope Check
              </span>
              <h2 className="text-sm font-bold truncate">Out of Scope Image</h2>
              <p className={`text-[11px] ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
                Non-environmental image detected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border shrink-0 ${
              sunlightMode
                ? 'bg-slate-950 text-amber-300 border-slate-950 hover:bg-slate-900'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Start new observation"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New</span>
          </button>
        </div>

        {/* Out of Scope Card */}
        <section
          aria-labelledby="out-of-scope-heading"
          className={`rounded-2xl p-5 border text-center transition-all ${
            sunlightMode
              ? 'bg-white border-slate-950 shadow-md text-slate-950'
              : 'bg-slate-800/90 border-slate-700 text-slate-100 shadow-xl'
          }`}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                sunlightMode
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                  sunlightMode ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                Out of Scope
              </span>
              <h3 id="out-of-scope-heading" className="text-base sm:text-lg font-bold mt-2">
                FieldLens is for Environmental Observations
              </h3>
              <p
                className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                  sunlightMode ? 'text-slate-800 font-medium' : 'text-slate-300'
                }`}
              >
                {analysis.outOfScopeReason ||
                  'This photo does not contain a meaningful geological, ecological, hydrological, or environmental field observation. FieldLens is designed specifically for environmental science and geoscience field observations.'}
              </p>
            </div>

            {/* Detected subject disclaimer if relevant */}
            {analysis.outOfScopeSubject && (
              <div
                className={`p-2.5 rounded-xl text-xs border text-left ${
                  sunlightMode
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-amber-400">
                  Detected Subject: <span className="text-slate-200">{analysis.outOfScopeSubject}</span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5 leading-normal">
                  Note: If people or indoor items are visible, personal characteristics are not evaluated. FieldLens only checks whether natural field specimens are present.
                </p>
              </div>
            )}

            {/* Suggested Examples */}
            <div
              className={`p-3.5 rounded-xl text-left border ${
                sunlightMode
                  ? 'bg-amber-50 border-amber-300 text-slate-900'
                  : 'bg-slate-900/80 border-slate-800 text-slate-200'
              }`}
            >
              <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Suitable Field Observation Examples:</span>
              </h4>
              <ul className="space-y-1.5 text-xs">
                {suggested.map((example, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prominent Action Buttons */}
            <div className="space-y-2.5 pt-2">
              {/* Primary: Take Another Photo */}
              <button
                type="button"
                onClick={onRetakePhoto || onReset}
                className={`w-full min-h-[52px] rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all border ${
                  sunlightMode
                    ? 'bg-amber-400 text-slate-950 border-slate-950 hover:bg-amber-300 shadow-amber-400/20'
                    : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-amber-500/20'
                }`}
              >
                <Camera className="w-5 h-5 text-slate-950 shrink-0" />
                <span>Take Another Photo</span>
              </button>

              {/* Secondary: Upload from Gallery */}
              <button
                type="button"
                onClick={onUploadDifferent || onReset}
                className={`w-full min-h-[46px] rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
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
        </section>
      </div>
    );
  }

  // --- VALID FIELD OBSERVATION (4 SECTIONS) ---
  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner: Specimen Thumbnail + Category + Reset Trigger */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
          sunlightMode
            ? 'bg-white border-slate-950 text-slate-950 shadow-md'
            : 'bg-slate-800/80 border-slate-700/80 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={imageDataUrl}
            alt="Field specimen thumbnail"
            className="w-13 h-13 rounded-xl object-cover border border-slate-700/50 shrink-0"
          />
          <div className="min-w-0">
            <span
              className={`text-[11px] font-bold tracking-wider uppercase ${
                sunlightMode ? 'text-amber-700' : 'text-amber-400'
              }`}
            >
              {categoryMeta.label}
            </span>
            <h2 className="text-sm font-bold truncate">Field Observation Ready</h2>
            <p className={`text-[11px] ${sunlightMode ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              Concise initial analysis generated
            </p>
          </div>
        </div>

        {/* Top Reset Button */}
        <button
          type="button"
          onClick={onReset}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border shrink-0 ${
            sunlightMode
              ? 'bg-slate-950 text-amber-300 border-slate-950 hover:bg-slate-900'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
          }`}
          title="Start new observation"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {/* Mandatory Scientific Disclaimer Banner */}
      <div
        className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
          sunlightMode
            ? 'bg-amber-100 border-amber-900 text-amber-950 font-medium'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}
      >
        <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${sunlightMode ? 'text-amber-900' : 'text-amber-400'}`} />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold">Independent Scientific Verification Required</p>
          <p className="text-[11px] opacity-90">
            {analysis.uncertaintyDisclaimer ||
              'AI observations are preliminary hypotheses based on image features. They cannot confirm water chemistry, salinity, pH, exact species, or mineral composition without physical field tests. Always observe Leave No Trace principles.'}
          </p>
        </div>
      </div>

      {/* SECTION 1: Possible Interpretation (2–3 sentences) */}
      <section
        aria-labelledby="section-1-heading"
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          sunlightMode
            ? 'bg-white border-slate-950 shadow-md text-slate-950'
            : 'bg-slate-800/80 border-slate-700/80 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              sunlightMode ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            1
          </div>
          <div>
            <h3 id="section-1-heading" className="text-sm font-bold tracking-tight">
              Possible Interpretation
            </h3>
            <p className={`text-[11px] ${sunlightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Tentative hypothesis based on visual indicators
            </p>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded ml-auto ${
              sunlightMode ? 'bg-amber-100 text-amber-900' : 'bg-amber-500/10 text-amber-300'
            }`}
          >
            Tentative
          </span>
        </div>

        <p
          className={`text-xs sm:text-sm leading-relaxed ${
            sunlightMode ? 'text-slate-900 font-medium' : 'text-slate-200'
          }`}
        >
          {possibleInterpretation}
        </p>
      </section>

      {/* SECTION 2: Visible Evidence from the Image (Exactly 3 points) */}
      <section
        aria-labelledby="section-2-heading"
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          sunlightMode
            ? 'bg-white border-slate-950 shadow-md text-slate-950'
            : 'bg-slate-800/80 border-slate-700/80 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              sunlightMode ? 'bg-slate-950 text-amber-400' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            2
          </div>
          <div>
            <h3 id="section-2-heading" className="text-sm font-bold tracking-tight">
              Visible Evidence from the Image
            </h3>
            <p className={`text-[11px] ${sunlightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Supported directly by photograph pixels only
            </p>
          </div>
          {visibleEvidence.length === 3 ? (
            <span className={`text-[11px] ml-auto font-medium ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
              3 points
            </span>
          ) : visibleEvidence.length > 0 ? (
            <span className={`text-[11px] ml-auto font-medium ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
              {visibleEvidence.length} points
            </span>
          ) : null}
        </div>

        <ul className="space-y-2">
          {visibleEvidence.map((evidence, idx) => (
            <li
              key={idx}
              className={`text-xs sm:text-sm flex items-start gap-2.5 leading-relaxed p-2.5 rounded-xl border ${
                sunlightMode
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-200'
              }`}
            >
              <Eye
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  sunlightMode ? 'text-emerald-700' : 'text-emerald-400'
                }`}
              />
              <span>{evidence}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* SECTION 3: Questions or Observations to Investigate in Person (Exactly 3 checks) */}
      <section
        aria-labelledby="section-3-heading"
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          sunlightMode
            ? 'bg-white border-slate-950 shadow-md text-slate-950'
            : 'bg-slate-800/80 border-slate-700/80 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              sunlightMode ? 'bg-slate-950 text-amber-400' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            3
          </div>
          <div>
            <h3 id="section-3-heading" className="text-sm font-bold tracking-tight">
              Recommended In-Person Verification Checks
            </h3>
            <p className={`text-[11px] ${sunlightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Safe, realistic in-situ checks (specialized tools optional)
            </p>
          </div>
          {inPersonChecks.length === 3 ? (
            <span className={`text-[11px] ml-auto font-medium ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
              3 checks
            </span>
          ) : inPersonChecks.length > 0 ? (
            <span className={`text-[11px] ml-auto font-medium ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
              {inPersonChecks.length} checks
            </span>
          ) : null}
        </div>

        <p className={`text-xs mb-3 ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
          Conduct these physical diagnostic checks safely following Leave No Trace principles:
        </p>

        {/* Guiding Field Questions (Exactly 3) */}
        <div className="space-y-2 mb-3">
          {inPersonChecks.map((q, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 ${
                sunlightMode
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-slate-900/50 border-slate-700/60 text-slate-200'
              }`}
            >
              <HelpCircle className={`w-4 h-4 shrink-0 mt-0.5 ${sunlightMode ? 'text-cyan-700' : 'text-cyan-400'}`} />
              <span>{q}</span>
            </div>
          ))}
        </div>

        {/* Interactive Physical Test Checklist (Tap to record) */}
        {fieldTests.length > 0 && (
          <div
            className={`p-3 rounded-xl border ${
              sunlightMode ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-900/70 border-slate-700'
            }`}
          >
            <h4 className="text-xs font-bold tracking-tight mb-2 flex items-center gap-1.5">
              <CheckSquare className={`w-3.5 h-3.5 ${sunlightMode ? 'text-amber-800' : 'text-amber-400'}`} />
              <span>Tap to check off completed in-situ tests</span>
            </h4>

            <div className="space-y-2">
              {fieldTests.map((test, idx) => {
                const isChecked = Boolean(completedTests[test.testName]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onToggleTest(test.testName)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                      isChecked
                        ? sunlightMode
                          ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-medium'
                          : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                        : sunlightMode
                        ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100'
                        : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{test.testName}</span>
                        {isChecked && (
                          <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="opacity-90 mt-0.5">{test.instruction}</p>
                      <p className={`text-[11px] mt-0.5 italic ${isChecked ? 'opacity-95 font-semibold' : 'opacity-70'}`}>
                        Clue: {test.diagnosticClue}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: Short Field-Note Summary (No more than 3 sentences) */}
      <section
        aria-labelledby="section-4-heading"
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          sunlightMode
            ? 'bg-amber-50 border-slate-950 shadow-md text-slate-950'
            : 'bg-slate-900 border-amber-500/30 text-slate-100 shadow-xl'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                sunlightMode ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}
            >
              4
            </div>
            <div>
              <h3 id="section-4-heading" className="text-sm font-bold tracking-tight">
                Field Notebook Summary
              </h3>
              <p className={`text-[11px] ${sunlightMode ? 'text-slate-700' : 'text-slate-400'}`}>
                Concise entry (max 3 sentences)
              </p>
            </div>
          </div>

          {/* Quick Copy Button */}
          <button
            type="button"
            onClick={handleCopyNote}
            className={`min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
              copiedNote
                ? 'bg-emerald-600 text-white border-emerald-500'
                : sunlightMode
                ? 'bg-slate-950 text-amber-400 border-slate-950 hover:bg-slate-800'
                : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
            }`}
            title="Copy field note to clipboard"
          >
            {copiedNote ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedNote ? 'Copied!' : 'Copy Note'}</span>
          </button>
        </div>

        {/* Notebook Card Pre-block */}
        <div
          className={`p-3.5 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap border select-all ${
            sunlightMode
              ? 'bg-white border-slate-400 text-slate-950 font-semibold'
              : 'bg-slate-950/80 border-slate-800 text-amber-200/90'
          }`}
        >
          {fieldNoteSummary}
        </div>
      </section>

      {/* OPTIONAL EXPAND ANALYSIS TRIGGER & CARD */}
      <section className="pt-1">
        {!analysis.expandedAnalysis ? (
          <button
            type="button"
            onClick={onExpandAnalysis}
            disabled={isExpanding}
            className={`w-full min-h-[48px] px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
              isExpanding
                ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-wait'
                : sunlightMode
                ? 'bg-white text-slate-950 border-slate-950 hover:bg-amber-100 shadow-sm'
                : 'bg-slate-800/90 text-amber-300 border-amber-500/40 hover:bg-slate-800 hover:border-amber-400'
            }`}
          >
            {isExpanding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Generating Detailed Field Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Expand Analysis (Detailed Geological / Ecological Context)</span>
              </>
            )}
          </button>
        ) : (
          <div
            className={`rounded-2xl border overflow-hidden transition-all ${
              sunlightMode
                ? 'bg-white border-slate-950 text-slate-950 shadow-md'
                : 'bg-slate-800/80 border-slate-700 text-slate-100'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between cursor-pointer ${
                sunlightMode ? 'bg-amber-100' : 'bg-slate-800'
              }`}
              onClick={() => setShowExpandedDetails((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className={`w-4 h-4 ${sunlightMode ? 'text-slate-950' : 'text-amber-400'}`} />
                <h4 className="text-sm font-bold">Expanded Field Analysis</h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    sunlightMode ? 'bg-amber-300 text-slate-950' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  Deep Context
                </span>
              </div>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-white"
                aria-label="Toggle expanded section"
              >
                {showExpandedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showExpandedDetails && (
              <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                <div>
                  <h5 className="font-bold text-amber-400 mb-1">Detailed Scientific Interpretation</h5>
                  <p className="leading-relaxed opacity-95">{analysis.expandedAnalysis.detailedInterpretation}</p>
                </div>

                <div>
                  <h5 className="font-bold text-amber-400 mb-1">Formation & Genesis Mechanism</h5>
                  <p className="leading-relaxed opacity-95">{analysis.expandedAnalysis.formationContext}</p>
                </div>

                {analysis.expandedAnalysis.diagnosticKey && analysis.expandedAnalysis.diagnosticKey.length > 0 && (
                  <div>
                    <h5 className="font-bold text-amber-400 mb-1.5">Diagnostic Key Branch Points</h5>
                    <ul className="space-y-1.5 pl-3 border-l-2 border-amber-500/40">
                      {analysis.expandedAnalysis.diagnosticKey.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.expandedAnalysis.advancedFieldTests &&
                  analysis.expandedAnalysis.advancedFieldTests.length > 0 && (
                    <div>
                      <h5 className="font-bold text-amber-400 mb-1.5">Advanced Field Measurement Methods</h5>
                      <ul className="space-y-1.5 pl-3 border-l-2 border-cyan-500/40">
                        {analysis.expandedAnalysis.advancedFieldTests.map((test, idx) => (
                          <li key={idx} className="leading-relaxed">
                            • {test}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div>
                  <h5 className="font-bold text-amber-400 mb-1">Environmental & Watershed Significance</h5>
                  <p className="leading-relaxed opacity-95">{analysis.expandedAnalysis.environmentalSignificance}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* BOTTOM ACTION BAR */}
      <div className="space-y-2 pt-2">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Save to Field Log */}
          <button
            type="button"
            onClick={onSaveToJournal}
            className={`min-h-[48px] px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
              isSaved
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/80'
                : sunlightMode
                ? 'bg-slate-950 text-white border-slate-950 hover:bg-slate-800'
                : 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{isSaved ? 'Saved in Field Log' : 'Save to Log'}</span>
          </button>

          {/* Copy Full Report */}
          <button
            type="button"
            onClick={handleCopyAll}
            className={`min-h-[48px] px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
              copiedFull
                ? 'bg-emerald-600 text-white border-emerald-500'
                : sunlightMode
                ? 'bg-slate-100 text-slate-900 border-slate-400 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-white hover:bg-slate-700'
            }`}
          >
            {copiedFull ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4 text-slate-400" />}
            <span>{copiedFull ? 'All Copied!' : 'Copy All Sections'}</span>
          </button>
        </div>

        {/* Primary Reset Button */}
        <button
          type="button"
          onClick={onReset}
          className={`w-full min-h-[50px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] border ${
            sunlightMode
              ? 'bg-amber-400 text-slate-950 border-slate-950 hover:bg-amber-300'
              : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-slate-950" />
          <span>New Observation / Next Specimen</span>
        </button>
      </div>
    </div>
  );
};
