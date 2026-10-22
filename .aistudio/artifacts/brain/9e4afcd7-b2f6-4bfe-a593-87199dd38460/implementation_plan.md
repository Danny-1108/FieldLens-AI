# FieldLens: AI Field Observation Assistant

A mobile-first web application designed for students and researchers performing environmental science and geoscience field observations. Enables live camera capture or photo upload, scientific category selection, structured multimodal Gemini AI analysis with calibrated uncertainty, interactive field test checklists, and offline local journal logging.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were established based on your preferences:
> - **Local History & Field Journal**: Field observations (including image thumbnail, timestamp, GPS/location tag if enabled, category, full 4-section notes, and completed test checklists) will be stored locally in browser storage for instant retrieval in the field without losing work.
> - **High-Contrast Outdoor Mode**: The visual system features high-visibility outdoor styling (high contrast ratios exceeding 7:1, anti-glare typography, tactile $48\text{px}$ touch targets, and a quick toggle for Sunlight Boost / Ambient Mode).
> - **Interactive Physical Test Prompts**: In addition to AI visual analysis, category-specific field tests (e.g., mineral hardness/streak/acid reaction for Geology; leaf venation/margins for Botany; clarity/foam/odor for Water; slope/erosion/aspect for Landscape) are provided as quick-tap observation guides.

- **Multimodal AI Backend**: All visual identification requests are proxied securely through a dedicated server-side Express endpoint (`/api/analyze-observation`) using `@google/genai` with `gemini-3.8-flash`.

---

### 1. Overview & Core Concept

- **What It Does**: FieldLens transforms mobile smartphones into guided field observation assistants for geoscience and ecology students. Students capture an outcrop, sediment bed, biological specimen, or stream feature; pick an observation category; and receive calibrated, scientifically disciplined 4-part notes.
- **Target Audience / Persona**: Undergraduate and high school students in Geology, Environmental Science, Forestry, Hydrology, and Physical Geography courses, as well as field instructors and amateur naturalists.
- **Key Value**: Teaches students *how* to observe critically in the field rather than presenting AI as an infallible oracle. AI analysis uses tentative scientific phrasing ("appears to exhibit," "possibly," "consistent with") and prompts students with in-person physical tests to verify features themselves.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Zero-State / Capture Screen**:
   - Prominent camera viewfinder button (`capture="environment"` for direct back-camera invocation on iOS/Android) plus file upload trigger.
   - Clean category segmented selector: *Geology / rock*, *Plant / ecology*, *Water*, *Landscape / feature*, *Other*.
   - Optional quick sample physical test checklist expandable for that category.
2. **Analysis State**:
   - Instant image preview with zoom/pan inspection affordance.
   - High-contrast tactile "Analyze Observation" action button.
   - Field-tested loading indicator with reassurance progress states ("Analyzing visual textures...", "Formulating field hypotheses...", "Structuring field notebook entry...").
3. **Structured Results View**:
   - **Section 1: Possible Interpretation** (tentative hypotheses with confidence calibration).
   - **Section 2: Visible Evidence from Image** (grain size, bedding, color banding, leaf margins, turbidity).
   - **Section 3: Questions & In-Person Verification Tests** (physical checks students should do right now: e.g. streak test, hand lens inspection, hardness, fizz test).
   - **Section 4: Field Notebook Summary** (clean, formatted text block with 1-tap "Copy to Clipboard" for student field books or report compilation).
   - **Independent Verification Disclaimer Banner** reminding students that AI suggestions must be tested against physical specimens.
4. **Action Bar & Field Log**:
   - "New Observation" reset button, "Save to Field Journal", and "Share/Export".
   - Bottom navigation drawer to browse saved past observations offline.

#### Visual Identity & Theme
- **Aesthetic Direction**: Utilitarian, rugged scientific field equipment aesthetic—clean typography, crisp hairline dividers, high legibility under direct sunlight.
- **Color Palette & Mood**:
  - Dominant Neutral: Deep slate `/` bright outdoor parchment (`#F8FAFC` background with `#0F172A` text in light/sunlight mode; `#0B0F17` in field dark mode).
  - High-Visibility Accent: Field safety amber / chartreuse accents (`#D97706` amber and `#15803D` deep field forest green) for crisp status markers.
  - Category Identifiers: Subtle earthy tint codes (Slate for Geology, Forest for Botany, Ocean for Water, Ochre for Landscape).
- **Typography & Hierarchy**:
  - Display & Headings: `Plus Jakarta Sans` for crisp geometric precision.
  - Data, Metrics & Field Notes: `JetBrains Mono` / `font-mono tabular-nums` for timestamps, GPS coordinates, and field-note blocks.
  - Body: High-legibility sans-serif with 1.6 line height.
- **Touch Ergonomics**:
  - Minimum touch targets: $48 \times 48\text{px}$ on all buttons and selectors.
  - Bottom-thumb action zone for primary triggers: Camera shutter, Category pill selector, Analyze, and Reset.

---

### 3. Key Product Decisions & Trade-Offs

- **Camera Integration Method**:
  - *Decision*: Native HTML5 `<input type="file" accept="image/*" capture="environment">` paired with optional live `<video>` stream canvas capture fallback.
  - *Why*: Direct `capture="environment"` invokes the native camera app on both iOS Safari and Android Chrome with full sensor autofocus, optical stabilization, and flash, avoiding mobile browser permission hurdles and memory crashes while working seamlessly.
- **Server-Side AI Proxy (`/api/analyze-observation`)**:
  - *Decision*: Node/Express server using `@google/genai` with model `gemini-3.8-flash`.
  - *Why*: Complies with runtime constraints (server-only API key handling) and leverages structured JSON output mode to guarantee the 4 required sections without hallucinated formatting.
- **Offline Resilience & Field Journal Storage**:
  - *Decision*: Local browser `localStorage` + `IndexedDB` storage for past observations and notes.
  - *Why*: Fieldwork often takes place in remote valleys, quarries, or riverbanks with spotty cellular reception. Students can review past notes and photos without internet.
- **Scientific Humility & Epistemic Guardrails**:
  - *Decision*: System instruction strictly enforces probabilistic language ("appears consistent with," "possibly," "suggests") and prohibits authoritative pronouncements. Prominently displays an outdoor-readable verification banner.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Client                        │
│                                                             │
│  ┌────────────────────────┐      ┌───────────────────────┐  │
│  │ Mobile Camera / Upload │ ───> │  Image Preview + Crop │  │
│  └────────────────────────┘      └───────────────────────┘  │
│               │                              │              │
│               v                              v              │
│  ┌────────────────────────┐      ┌───────────────────────┐  │
│  │ Category & Field Tests │      │ Sunlight Boost Toggle │  │
│  └────────────────────────┘      └───────────────────────┘  │
│               │                              │              │
│               └──────────────┬───────────────┘              │
│                              v                              │
│                 [ Analyze Observation CTA ]                 │
│                              │                              │
│                              v POST (base64 + category)     │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────┐
│                   Server (Express / Vite)                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ POST /api/analyze-observation                         │  │
│  │ - Validates category and base64 image data            │  │
│  │ - Calls GoogleGenAI (gemini-3.8-flash)                │  │
│  │ - Structured Schema: 4 mandatory field note sections  │  │
│  │ - Enforces epistemic uncertainty instructions         │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────┐
│                 Results View & Persistence                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Possible Interpretation                            │  │
│  │ 2. Visible Evidence from Image                        │  │
│  │ 3. Questions & In-Person Verification Tests           │  │
│  │ 4. Field Notebook Summary (Copyable)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│               │                              │              │
│               v                              v              │
│  ┌────────────────────────┐      ┌───────────────────────┐  │
│  │ Local Journal Storage  │      │ Reset / New Note      │  │
│  └────────────────────────┘      └───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### State & Data Model
```typescript
export type ObservationCategory =
  | 'geology'
  | 'plant'
  | 'water'
  | 'landscape'
  | 'other';

export interface FieldAnalysisResult {
  possibleInterpretation: string;
  visibleEvidence: string[];
  inPersonQuestionsAndTests: string[];
  fieldNoteSummary: string;
  scientificConfidenceLevel: 'low' | 'moderate' | 'tentative';
  suggestedChecklist: { testName: string; instruction: string }[];
}

export interface ObservationRecord {
  id: string;
  timestamp: number;
  category: ObservationCategory;
  imageDataUrl: string;
  analysis: FieldAnalysisResult;
  completedTests: Record<string, boolean>;
  userNotes?: string;
  locationName?: string;
}
```

#### Interactive Component & State Mapping
- `ObservationCapture`: Camera input (`capture="environment"`), drag-and-drop/gallery picker, image compression to maintain fast uploads even over cellular, category segmented toggle, quick checklist.
- `AnalysisDisplay`: 4 accordion / card panels matching the required sections with clear badge labels, clipboard copy trigger for field notebook, and verification disclaimer banner.
- `FieldJournalDrawer`: Slide-up mobile sheet listing past observations with thumbnail, timestamp, category icon, and quick restore.
- `SunlightModeToggle`: High-contrast outdoor mode boosting contrast, text weight, and borders for bright daylight conditions.
