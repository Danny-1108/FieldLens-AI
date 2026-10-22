import { ObservationRecord } from '../types';

const STORAGE_KEY = 'fieldlens_observations_v1';

export function getSavedObservations(): ObservationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read field observations from storage:', err);
    return [];
  }
}

export function saveObservationToStorage(record: ObservationRecord): boolean {
  try {
    const current = getSavedObservations();
    // Prepend new record, keeping up to 30 most recent field observations
    const updated = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.warn('LocalStorage quota issue, attempting to store with thumbnail only:', err);
    try {
      // If quota exceeded, strip full imageDataUrl and preserve lightweight thumbnail
      const current = getSavedObservations();
      const slimRecord: ObservationRecord = {
        ...record,
        imageDataUrl: record.thumbnailDataUrl, // fallback to thumbnail
      };
      const updated = [slimRecord, ...current.map((r) => ({ ...r, imageDataUrl: r.thumbnailDataUrl }))].slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (e2) {
      console.error('Failed to save to localStorage:', e2);
      return false;
    }
  }
}

export function updateObservationTestsInStorage(id: string, completedTests: Record<string, boolean>): void {
  try {
    const current = getSavedObservations();
    const index = current.findIndex((item) => item.id === id);
    if (index !== -1) {
      current[index].completedTests = completedTests;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.error('Failed to update completed tests in storage:', err);
  }
}

export function deleteObservationFromStorage(id: string): ObservationRecord[] {
  try {
    const current = getSavedObservations();
    const filtered = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error('Failed to delete observation from storage:', err);
    return [];
  }
}

export function clearAllObservationsFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
}

/**
 * Formats a record as standardized markdown for lab reports
 */
export function formatObservationAsMarkdown(record: ObservationRecord): string {
  const dateStr = new Date(record.timestamp).toLocaleString();
  const locStr = record.location
    ? `Lat ${record.location.latitude}, Lon ${record.location.longitude}${record.location.altitude ? `, Alt ${record.location.altitude}m` : ''}`
    : 'Not recorded';


  const interp =
    record.analysis.possibleInterpretation ||
    (record.analysis.isOutOfScope ? 'Out of Scope: ' + record.analysis.outOfScopeReason : 'N/A');

  const evidence = (record.analysis.visibleEvidence || []).filter(
    (e) => typeof e === 'string' && e.trim().length > 0
  );

  const checks = (
    record.analysis.inPersonInvestigateQuestions && record.analysis.inPersonInvestigateQuestions.length > 0
      ? record.analysis.inPersonInvestigateQuestions
      : (record.analysis as any).inPersonVerificationChecks ||
        (record.analysis as any).verificationChecks ||
        (record.analysis.fieldTestsChecklist || []).map((t) => `${t.testName}: ${t.instruction}`)
  ).filter((q: string) => typeof q === 'string' && q.trim().length > 0);

  const summary =
    record.analysis.fieldNoteSummary ||
    (record.analysis as any).fieldNotebookSummary ||
    (evidence.length > 0
      ? `Observed field specimen exhibiting ${evidence[0]}. Visual characteristics appear consistent with ${interp.slice(0, 100)}. Recommended in-person checks prioritized for verification.`
      : 'N/A');

  return `=======================================================
FIELDLENS OBSERVATION LOG
=======================================================
Timestamp: ${dateStr}
Category:  ${record.category.toUpperCase()}
Location:  ${locStr}
${record.studentNotes ? `Notes:     ${record.studentNotes}\n` : ''}
---
1. POSSIBLE INTERPRETATION:
${interp}

---
2. VISIBLE EVIDENCE FROM IMAGE:
${evidence.map((e) => `• ${e}`).join('\n') || 'None recorded'}

---
3. QUESTIONS / IN-PERSON VERIFICATION:
${checks.map((q: string) => `[ ] ${q}`).join('\n') || 'None recorded'}

---
4. FIELD NOTE SUMMARY:
${summary}

---
PHYSICAL TEST CHECKLIST:
${(record.analysis.fieldTestsChecklist || [])
  .map(
    (t) =>
      `[${record.completedTests?.[t.testName] ? 'X' : ' '}] ${t.testName}: ${t.instruction} (${t.diagnosticClue})`
  )
  .join('\n') || 'None recorded'}
${
  record.analysis.expandedAnalysis
    ? `
---
EXPANDED FIELD ANALYSIS:
Detailed Interpretation: ${record.analysis.expandedAnalysis.detailedInterpretation}
Formation Context:       ${record.analysis.expandedAnalysis.formationContext}
Diagnostic Key:
${record.analysis.expandedAnalysis.diagnosticKey.map((k) => `  - ${k}`).join('\n')}
Advanced Field Tests:
${record.analysis.expandedAnalysis.advancedFieldTests.map((t) => `  - ${t}`).join('\n')}
Environmental Significance: ${record.analysis.expandedAnalysis.environmentalSignificance}
`
    : ''
}
---
DISCLAIMER:
${record.analysis.uncertaintyDisclaimer}
=======================================================
`;
}
