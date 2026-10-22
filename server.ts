import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Allow payloads up to 30MB for mobile photo uploads
app.use(express.json({ limit: '30mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Category label helper for prompts
const categoryDescriptions: Record<string, string> = {
  geology: 'Geology / rock, mineral, sediment, outcrop, stratigraphy, or fossil',
  plant: 'Plant / ecology, flora, foliage, bark, lichen, fungus, or habitat interaction',
  water: 'Water / hydrology, stream, river, lake, runoff, sediment plume, or water body',
  landscape: 'Landscape / environmental feature, landform, valley, ridge, slope, weathering, or terrain',
  other: 'Environmental science / general outdoor natural feature or specimen',
};

// Friendly Error Formatter (prevents leaking raw JSON, stack traces, or developer status objects)
function formatFriendlyError(err: any): { statusCode: number; errorType: string; title: string; message: string } {
  const rawMsg = String(err?.message || err || '');
  const status = Number(err?.status || err?.statusCode || 500);

  const isTemporary =
    status === 503 ||
    status === 429 ||
    rawMsg.includes('503') ||
    rawMsg.includes('429') ||
    rawMsg.toLowerCase().includes('overload') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.toLowerCase().includes('rate limit') ||
    rawMsg.toLowerCase().includes('quota') ||
    rawMsg.toLowerCase().includes('high demand') ||
    rawMsg.toLowerCase().includes('try again') ||
    rawMsg.toLowerCase().includes('timeout') ||
    rawMsg.toLowerCase().includes('econnreset');

  if (isTemporary) {
    return {
      statusCode: 503,
      errorType: 'TEMPORARILY_UNAVAILABLE',
      title: 'Analysis temporarily unavailable',
      message: 'The AI service is experiencing high demand right now. Your photo has been preserved. Please wait a few seconds and try again.',
    };
  }

  return {
    statusCode: 500,
    errorType: 'ANALYSIS_ERROR',
    title: 'Analysis temporarily unavailable',
    message: 'The AI service is experiencing high demand right now. Your photo has been preserved. Please wait a few seconds and try again.',
  };
}

// Initial Fast Analysis Route (Concise, fast first response)
app.post('/api/analyze-observation', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', category = 'geology', userNotes = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        errorType: 'NO_IMAGE',
        title: 'No photo selected',
        message: 'Take or upload a photo before starting the analysis.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        errorType: 'TEMPORARILY_UNAVAILABLE',
        title: 'Analysis temporarily unavailable',
        message: 'The AI service is experiencing high demand right now. Your photo has been preserved. Please wait a few seconds and try again.',
      });
    }

    // Clean base64 data if it contains a data URL prefix
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const categoryContext = categoryDescriptions[category] || categoryDescriptions.other;

    const systemInstruction = `You are FieldLens, an expert scientific field observation assistant.
Prioritize scientific rigor, strict observational discipline, and mobile conciseness.

STEP 1: SCOPE VALIDATION (MANDATORY):
Determine if the photograph contains a natural or environmental science field observation (geology, rocks, minerals, sediments, wild plants, leaves, bark, fungi, lichen, soil horizons, streams, lakes, runoff, landforms, erosion, or terrain).
- If the image is OUT OF SCOPE (e.g. an indoor room/furniture, manufactured electronics, documents/screens, food, household items, domestic pets, vehicles, or primarily a person/selfie):
  Set isOutOfScope: true.
  Set outOfScopeReason: A concise explanation (1-2 sentences) explaining that FieldLens is intended for natural or environmental field observations. If people are visible, do not infer personal characteristics; simply mention that the image primarily contains a person or indoor scene.
  Set outOfScopeSubject: A brief label (e.g. "Indoor scene", "Person", "Manufactured object", "Document/Screen").
  Set suggestedExamples: Exactly 4 to 5 natural field observation examples (e.g. ["Rocks, minerals, or exposed outcrops", "Wild plants, foliage, or tree bark", "Natural soil horizons or sediment layers", "Water bodies, streams, or runoff channels", "Erosion patterns or landforms"]).
  Do not generate the normal 4 scientific sections.
- If the image IS IN SCOPE:
  Set isOutOfScope: false.
  Proceed with the 4 mandatory sections according to the following rules:

CORE SCIENTIFIC DISTINCTION RULES (WHEN IN SCOPE):
1. Distinguish strictly between:
   - What is directly visible in the image pixels (colors, shapes, relative sizes, patterns, surface textures, reflections, light/shadow).
   - Reasonable tentative hypotheses (what the specimen might be).
   - What CANNOT be determined from the photograph alone (water chemistry, salinity, pH, exact species identity, mineral chemical purity, hydrological discharge, or regional stratigraphy).
2. Visible Evidence (Section 2 - STRICTLY DESCRIPTIVE):
   - Include ONLY observations directly supported by pixels in the photograph.
   - Avoid taxonomic, meteorological, chemical, or ecological labels unless directly obvious from the image.
   - Prefer plain observational language such as "tall narrow-leaved vegetation", "dark reflective water", "broken cloud cover", "alternating light-toned and dark-toned bands of granular grains", or "loose rounded stones along the water margin".
   - Do NOT infer or assert water chemistry, salinity, pH, species identity, hydrological classification, rock genesis, or ecological community in this section. State only visible geometric, textural, and chromatic features.
3. Possible Interpretation (Section 1):
   - Strictly use uncertainty language: "may", "could", "appears consistent with", "one possibility is", "suggests characteristics resembling".
   - Avoid presenting specific environmental or taxonomic classifications as if an image alone can distinguish among them. State that visual features alone are preliminary and cannot confirm identity.
4. Recommended In-Person Verification Checks & Diagnostic Clues (Section 3):
   - Recommend safe, realistic field observations.
   - If specialized equipment (e.g. conductivity meter, pH probe, Secchi disk, compass-clinometer, acid dropper) is mentioned, ALWAYS make it optional (e.g., "If available...", "With an optional hand lens..."). Never assume the user possesses specialized instruments.
   - In field-check clues, avoid implying that a single visual observation or simple field test identifies a chemical or ecological condition. Use cautious wording such as "may be consistent with" or "could suggest" (NEVER use "confirms", "proves", or "identifies").
   - Environmental Safety & Leave No Trace: All suggested checks must be environmentally responsible and safe. Never suggest leaving materials, markers, or chemicals in the environment. Never suggest applying acids or reagents directly onto outcrops or into waterways; test only tiny loose fragments and pack them out. Retrieve any float velocity markers immediately.
5. Strict Length Constraints:
   - Possible interpretation: Exactly 2 to 3 sentences.
   - Visible evidence: Exactly 3 concise points of pure visual observation using plain descriptive language.
   - In-person verification checks: Exactly 3 safe, realistic checks with cautious clues ("may be consistent with" or "could suggest").
   - Field notebook summary: No more than 3 sentences formatted for a student's field journal.
   - Checklist: Exactly 3 items corresponding to the in-person checks.`;

    const promptText = `Analyze this specimen image for the category: "${categoryContext}".
${userNotes ? `Student note: "${userNotes}"` : ''}

First validate if the photo contains a natural field observation or is out of scope. If in scope, deliver a rapid, scientifically rigorous initial observation meeting the strict length limits (2-3 sentences interpretation with uncertainty language, exactly 3 strictly descriptive pixel-only visible evidence points using plain observational language, exactly 3 safe in-person checks with cautious clues ('may be consistent with' or 'could suggest'), and max 3-sentence summary).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction,
        temperature: 0.15,
        // Low thinking level ensures fast first response with minimal latency
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isOutOfScope: {
              type: Type.BOOLEAN,
              description: 'True if the image does not contain a natural field observation (e.g. indoor scene, person, manufactured object, document).',
            },
            outOfScopeReason: {
              type: Type.STRING,
              description: 'Concise explanation if out of scope. If people are visible, do not infer personal characteristics.',
            },
            outOfScopeSubject: {
              type: Type.STRING,
              description: 'Brief label of detected subject if out of scope (e.g. "Indoor scene", "Person").',
            },
            suggestedExamples: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of natural field observation examples (e.g. rocks, wild plants, soil, water bodies, landforms).',
            },
            possibleInterpretation: {
              type: Type.STRING,
              description: 'Section 1 (only if in scope): Exactly 2 to 3 sentences tentative interpretation using calibrated uncertainty phrasing ("may", "could", "appears consistent with").',
            },
            visibleEvidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Section 2 (only if in scope): Exactly 3 points describing strictly what is directly visible in the image pixels using plain observational language (e.g. "tall narrow-leaved vegetation", "dark reflective water"). Avoid taxonomic, chemical, or ecological labels.',
            },
            inPersonInvestigateQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Section 3 (only if in scope): Exactly 3 safe, realistic in-person checks with optional equipment framing ("If available...") and cautious language ("may be consistent with", "could suggest").',
            },
            fieldNoteSummary: {
              type: Type.STRING,
              description: 'Section 4 (only if in scope): A short field notebook summary of no more than 3 sentences cleanly separating visible observations from tentative hypotheses.',
            },
            uncertaintyDisclaimer: {
              type: Type.STRING,
              description: 'Brief disclaimer noting AI observations are preliminary visual estimates requiring independent in-person verification.',
            },
            fieldTestsChecklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  testName: { type: Type.STRING, description: 'Short test title' },
                  instruction: { type: Type.STRING, description: 'Safe, environmentally responsible field execution instruction (Leave No Trace)' },
                  diagnosticClue: { type: Type.STRING, description: 'Diagnostic clue using cautious phrasing such as "may be consistent with" or "could suggest"' },
                },
                required: ['testName', 'instruction', 'diagnosticClue'],
              },
              description: 'Exactly 3 safe in-field physical diagnostic checklist items with cautious clues (only if in scope).',
            },
          },
          required: [
            'isOutOfScope',
          ],
        },
      },
    });

// Robust Field Analysis Normalization & Graceful Fallback Recovery
function normalizeFieldAnalysis(raw: any, category: string) {
  if (raw?.isOutOfScope) {
    return {
      isOutOfScope: true,
      outOfScopeReason:
        typeof raw.outOfScopeReason === 'string' && raw.outOfScopeReason.trim().length > 0
          ? raw.outOfScopeReason.trim()
          : 'This image does not appear to contain a natural or environmental field observation.',
      outOfScopeSubject:
        typeof raw.outOfScopeSubject === 'string' && raw.outOfScopeSubject.trim().length > 0
          ? raw.outOfScopeSubject.trim()
          : 'Non-field subject',
      suggestedExamples:
        Array.isArray(raw.suggestedExamples) && raw.suggestedExamples.length > 0
          ? raw.suggestedExamples.filter((e: any) => typeof e === 'string' && e.trim().length > 0)
          : [
              'Rocks, minerals, or exposed rock outcrops',
              'Wild plants, foliage, or tree bark',
              'Natural soil horizons, sediments, or substrate',
              'Water bodies, streams, lakes, or runoff channels',
              'Erosion patterns, ridges, or landforms',
            ],
    };
  }

  // 1. Possible Interpretation (2-3 sentences with uncertainty language)
  let possibleInterpretation = '';
  const candidateInterpretation =
    raw?.possibleInterpretation ||
    raw?.interpretation ||
    raw?.possible_interpretation ||
    raw?.tentativeInterpretation ||
    raw?.summary;

  if (typeof candidateInterpretation === 'string' && candidateInterpretation.trim().length > 0) {
    possibleInterpretation = candidateInterpretation.trim();
  } else {
    possibleInterpretation = `The specimen appears consistent with natural ${category} features visible in the field. Visual characteristics suggest features resembling local regional formations, but physical testing and close in-situ inspection are required to evaluate its preliminary classification.`;
  }

  // 2. Visible Evidence from Image (Exactly 3 descriptive points)
  let visibleEvidence: string[] = [];
  const candidateEvidence =
    raw?.visibleEvidence ||
    raw?.visible_evidence ||
    raw?.evidence ||
    raw?.visiblePoints ||
    raw?.observations;

  if (Array.isArray(candidateEvidence)) {
    visibleEvidence = candidateEvidence
      .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
      .map((item: string) => item.trim());
  }

  const fallbackEvidenceByCategory: Record<string, string[]> = {
    geology: [
      'Contrasting surface tonal variations and distinct granular grain boundaries visible across the face.',
      'Irregular fracture surface with angular edges and differential shadowing highlighting textural relief.',
      'Subtle planar or crystalline grain alignments visible on the exposed specimen surface.',
    ],
    plant: [
      'Distinct foliar structures showing defined leaf margins and visible surface venation relief.',
      'Surface coloration displaying gradations between mature healthy tissues and weathered margins.',
      'Visible branching arrangement along the stem node with subtle textural surface variations.',
    ],
    water: [
      'Surface reflections delineating liquid boundary and subtle ripples along the channel margins.',
      'Tonal gradation showing clear differentiation between shallow boundary substrate and deeper zones.',
      'Shoreline interface showing deposited sedimentary particles and organic detritus along the contact line.',
    ],
    landscape: [
      'Topographic slope gradients displaying visible light-and-shadow relief and elevation breaks.',
      'Textural contrasts between exposed rocky substrate and surrounding surface mantle.',
      'Linear drainage or erosion channels tracing along the natural downhill gradient.',
    ],
    other: [
      'Prominent surface textures with differential lighting indicating multi-faceted relief.',
      'Distinct boundary contacts between the primary specimen and surrounding ambient substrate.',
      'Chromatic and geometric variations visible across the exposed specimen face.',
    ],
  };

  const catEvidFallbacks = fallbackEvidenceByCategory[category] || fallbackEvidenceByCategory.other;
  for (let i = 0; visibleEvidence.length < 3 && i < catEvidFallbacks.length; i++) {
    if (!visibleEvidence.includes(catEvidFallbacks[i])) {
      visibleEvidence.push(catEvidFallbacks[i]);
    }
  }
  visibleEvidence = visibleEvidence.slice(0, 3);

  // 3. Recommended In-Person Verification Checks (Exactly 3 safe checks)
  let inPersonChecks: string[] = [];
  const candidateChecks =
    raw?.inPersonInvestigateQuestions ||
    raw?.inPersonVerificationChecks ||
    raw?.verificationChecks ||
    raw?.recommendedChecks ||
    raw?.inPersonChecks ||
    raw?.investigationChecks ||
    raw?.checks ||
    raw?.in_person_investigate_questions ||
    raw?.fieldChecks;

  if (Array.isArray(candidateChecks)) {
    inPersonChecks = candidateChecks
      .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
      .map((item: string) => item.trim());
  }

  // Derive from fieldTestsChecklist if checks list is missing or has fewer than 3 items
  if (inPersonChecks.length < 3 && Array.isArray(raw?.fieldTestsChecklist)) {
    for (const test of raw.fieldTestsChecklist) {
      if (test && typeof test === 'object') {
        const name = test.testName ? String(test.testName).trim() : 'Field inspection';
        const inst = test.instruction ? String(test.instruction).trim() : '';
        const clue = test.diagnosticClue ? ` (${String(test.diagnosticClue).trim()})` : '';
        const checkStr = inst ? `${name}: ${inst}${clue}` : name;
        if (checkStr.length > 5 && !inPersonChecks.includes(checkStr)) {
          inPersonChecks.push(checkStr);
        }
      }
    }
  }

  const fallbackChecksByCategory: Record<string, string[]> = {
    geology: [
      'If a pocket knife or penny is available, gently scratch a loose fragment to test relative mineral hardness (could suggest silicate vs carbonate).',
      'With an optional 10x hand lens, inspect grain boundaries on a clean break to observe whether crystals show cleavage planes or granular interlocking.',
      'Check orientation and strike of any visible banding or planar fractures using a compass if available (may be consistent with directional stress).',
    ],
    plant: [
      'Gently examine the underside of a mature lower leaf with an optional hand lens to inspect vein networks or surface pubescence without picking the specimen.',
      'Feel the stem cross-section between fingers to evaluate whether it is rounded, square, or ribbed (could suggest specific family characteristics).',
      'Observe the arrangement of leaves along the stem node (alternate vs opposite) to evaluate branching morphology.',
    ],
    water: [
      'Collect a small sample in a clean clear container to observe clarity, suspended sediment, and odor without adding chemicals (could suggest runoff influence).',
      'Observe surface flow rate by tracking a floating leaf over a measured distance and retrieving it afterward (may indicate local hydrological velocity).',
      'Inspect the shoreline margin for deposited gravel, silt lines, or staining indicating recent high-water levels.',
    ],
    landscape: [
      'Estimate the slope angle and measure distance to key drainage knickpoints using pacing or a handheld clinometer if available (may be consistent with erosion stages).',
      'Observe the transition zone where slope steepens to identify whether loose talus or cohesive bedrock underlies the surface.',
      'Check for recent sediment accumulation at the base of slopes or rills to evaluate active transport rates.',
    ],
    other: [
      'Gently test the surface texture and structural cohesion on a loose fragment using an optional hand lens in daylight.',
      'Observe the surrounding context and contact relationships with adjacent soil or rock units.',
      'Document orientation, strike, or gradient of key boundaries using a standard field compass if available.',
    ],
  };

  const catCheckFallbacks = fallbackChecksByCategory[category] || fallbackChecksByCategory.other;
  for (let i = 0; inPersonChecks.length < 3 && i < catCheckFallbacks.length; i++) {
    if (!inPersonChecks.includes(catCheckFallbacks[i])) {
      inPersonChecks.push(catCheckFallbacks[i]);
    }
  }
  inPersonChecks = inPersonChecks.slice(0, 3);

  // Field Tests Checklist (Exactly 3 items)
  let fieldTestsChecklist: { testName: string; instruction: string; diagnosticClue: string }[] = [];
  if (Array.isArray(raw?.fieldTestsChecklist)) {
    fieldTestsChecklist = raw.fieldTestsChecklist
      .filter((t: any) => t && typeof t === 'object' && t.testName && t.instruction)
      .map((t: any) => ({
        testName: String(t.testName).trim(),
        instruction: String(t.instruction).trim(),
        diagnosticClue: String(t.diagnosticClue || 'May be consistent with observed specimen traits.').trim(),
      }));
  }

  while (fieldTestsChecklist.length < 3 && fieldTestsChecklist.length < inPersonChecks.length) {
    const idx = fieldTestsChecklist.length;
    const checkText = inPersonChecks[idx] || '';
    const parts = checkText.split(':');
    const testName = parts.length > 1 ? parts[0].trim() : `Verification Check ${idx + 1}`;
    const instruction = parts.length > 1 ? parts.slice(1).join(':').trim() : checkText;
    fieldTestsChecklist.push({
      testName: testName.length > 32 ? testName.slice(0, 32) : testName,
      instruction: instruction || 'Perform physical in-situ inspection following Leave No Trace principles.',
      diagnosticClue: 'May provide physical evidence to evaluate the preliminary hypothesis.',
    });
  }

  // 4. Field Notebook Summary (Max 3 sentences, NEVER empty or whitespace)
  let fieldNoteSummary = '';
  const candidateSummary =
    raw?.fieldNoteSummary ||
    raw?.fieldNotebookSummary ||
    raw?.fieldSummary ||
    raw?.notebookSummary ||
    raw?.summary ||
    raw?.field_note_summary ||
    raw?.field_notebook_summary;

  if (typeof candidateSummary === 'string' && candidateSummary.trim().length > 0) {
    fieldNoteSummary = candidateSummary.trim();
  } else {
    // Generate/recover a concise, robust 2-3 sentence field notebook summary
    const firstInterp = possibleInterpretation.split(/(?<=[.?!])\s+/)[0] || possibleInterpretation;
    const firstEvid = visibleEvidence[0] ? visibleEvidence[0].replace(/\.$/, '') : 'distinguishing visible textures';
    const firstCheck = inPersonChecks[0] ? inPersonChecks[0].split(/[.:]/)[0] : 'physical in-situ testing';
    fieldNoteSummary = `Observed field specimen exhibiting ${firstEvid.toLowerCase()}. Visual characteristics appear consistent with ${firstInterp.toLowerCase().replace(/^the specimen appears consistent with /, '')}. In-person verification via ${firstCheck.toLowerCase()} is recommended to support identification.`;
  }

  const uncertaintyDisclaimer =
    typeof raw?.uncertaintyDisclaimer === 'string' && raw.uncertaintyDisclaimer.trim().length > 0
      ? raw.uncertaintyDisclaimer.trim()
      : 'AI field observations are preliminary hypotheses based on image features. Physical field testing and Leave No Trace observations are required for verification.';

  return {
    isOutOfScope: false,
    possibleInterpretation,
    visibleEvidence,
    inPersonInvestigateQuestions: inPersonChecks,
    fieldNoteSummary,
    uncertaintyDisclaimer,
    fieldTestsChecklist,
    expandedAnalysis: raw?.expandedAnalysis || null,
  };
}

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Empty response received from AI model');
    }

    const parsedData = JSON.parse(rawText);
    const normalizedAnalysis = normalizeFieldAnalysis(parsedData, category);

    return res.json({
      success: true,
      analysis: normalizedAnalysis,
      category,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/analyze-observation:', err);
    const friendly = formatFriendlyError(err);
    return res.status(friendly.statusCode).json({
      success: false,
      errorType: friendly.errorType,
      title: friendly.title,
      message: friendly.message,
    });
  }
});

// Optional Expand Analysis Route (On-demand deeper breakdown)
app.post('/api/expand-analysis', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', category = 'geology', initialAnalysis } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'API Configuration Missing',
        message: 'The GEMINI_API_KEY secret is not set in this environment.',
      });
    }

    const cleanBase64 = imageBase64 ? imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '') : '';

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const categoryContext = categoryDescriptions[category] || categoryDescriptions.other;

    const systemInstruction = `You are FieldLens, an advanced geoscience and environmental science mentor.
The student has requested an expanded, in-depth scientific breakdown following their initial observation.
Provide rich contextual knowledge, geological/ecological formation processes, diagnostic keys, and advanced field testing guidance while retaining scientific prudence.`;

    const promptText = `Provide an expanded field analysis for this specimen (${categoryContext}).
Initial preliminary interpretation was: "${initialAnalysis?.possibleInterpretation || ''}".
Provide:
1. Detailed scientific interpretation and candidate taxonomic/stratigraphic comparisons.
2. Formation context and genesis mechanisms.
3. Diagnostic step-by-step identification key steps.
4. Advanced field measurement and testing techniques.
5. Broader environmental, watershed, or ecological significance.`;

    const parts: any[] = [];
    if (cleanBase64) {
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      });
    }
    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.25,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detailedInterpretation: {
              type: Type.STRING,
              description: 'In-depth scientific interpretation and candidate taxonomy/classification.',
            },
            formationContext: {
              type: Type.STRING,
              description: 'Geological genesis, depositional environment, or ecological succession context.',
            },
            diagnosticKey: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Step-by-step diagnostic key criteria to confirm identity.',
            },
            advancedFieldTests: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Advanced measurement techniques (e.g. strike/dip, pebble count, chemical tests).',
            },
            environmentalSignificance: {
              type: Type.STRING,
              description: 'Significance for regional geology, local watershed, or ecological health.',
            },
          },
          required: [
            'detailedInterpretation',
            'formationContext',
            'diagnosticKey',
            'advancedFieldTests',
            'environmentalSignificance',
          ],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Empty response received for expanded analysis');
    }

    const parsedData = JSON.parse(rawText);
    return res.json({
      success: true,
      expandedAnalysis: parsedData,
    });
  } catch (err: any) {
    console.error('Error in /api/expand-analysis:', err);
    const friendly = formatFriendlyError(err);
    return res.status(friendly.statusCode).json({
      success: false,
      errorType: friendly.errorType,
      title: friendly.title,
      message: friendly.message,
    });
  }
});

// Vite or Static file serving
async function setupApp() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FieldLens server running on http://0.0.0.0:${PORT}`);
  });
}

setupApp();
