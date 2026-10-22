export type ObservationCategory =
  | 'geology'
  | 'plant'
  | 'water'
  | 'landscape'
  | 'other';

export interface FieldTestItem {
  testName: string;
  instruction: string;
  diagnosticClue: string;
}

export interface ExpandedAnalysis {
  detailedInterpretation: string;
  formationContext: string;
  diagnosticKey: string[];
  advancedFieldTests: string[];
  environmentalSignificance: string;
}

export interface FieldAnalysisResult {
  isOutOfScope?: boolean;
  outOfScopeReason?: string;
  outOfScopeSubject?: string;
  suggestedExamples?: string[];
  possibleInterpretation?: string; // 2-3 sentences
  visibleEvidence?: string[]; // exactly 3 items
  inPersonInvestigateQuestions?: string[]; // exactly 3 items
  fieldNoteSummary?: string; // no more than 3 sentences
  uncertaintyDisclaimer?: string;
  fieldTestsChecklist?: FieldTestItem[];
  expandedAnalysis?: ExpandedAnalysis | null;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number;
  timestamp: number;
}

export interface ObservationRecord {
  id: string;
  timestamp: number;
  category: ObservationCategory;
  imageDataUrl: string;
  thumbnailDataUrl: string;
  analysis: FieldAnalysisResult;
  completedTests: Record<string, boolean>;
  studentNotes?: string;
  location?: LocationData | null;
}

export interface CategoryMetadata {
  id: ObservationCategory;
  label: string;
  shortLabel: string;
  description: string;
  hint: string;
  iconName: string;
  color: string;
}
