/**
 * Utility to format and sanitize Field Notebook Summary.
 * Enforces:
 * 1. Maximum 3 sentences.
 * 2. Sentence 1: direct visible observation.
 * 3. Sentence 2: one concise tentative interpretation using uncertainty language only once
 *    (e.g. "The scene may be consistent with…" or "These features may suggest…").
 * 4. Sentence 3: the most relevant context-specific verification step.
 * 5. Removes duplicated phrases such as:
 *    - "appears consistent with … appears"
 *    - "appears in line with"
 *    - repeated "consistent with"
 *    - duplicated punctuation (e.g. "..")
 * 6. Does not introduce new facts not present in the analysis.
 * 7. Retains calibrated scientific uncertainty language.
 */

export interface SummaryContext {
  category?: string;
  visibleEvidence?: string[];
  possibleInterpretation?: string;
  inPersonChecks?: string[];
}

/**
 * Strips repeated punctuation, cleans whitespace, and normalizes commas/periods.
 */
export function cleanPunctuation(text: string): string {
  return text
    .replace(/\.{2,}/g, '.') // remove double/triple periods
    .replace(/,{2,}/g, ',')
    .replace(/;{2,}/g, ';')
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    .replace(/\s+([.,;:?!])/g, '$1') // remove space before punctuation
    .replace(/\s{2,}/g, ' ') // collapse multiple spaces
    .trim();
}

/**
 * Removes duplicate and stuttered phrases such as:
 * - "appears consistent with … appears"
 * - "appears in line with"
 * - repeated "consistent with"
 * - repeated adjacent words
 */
export function deduplicatePhrases(text: string): string {
  let cleaned = text;

  // Eradicate "appears in line with"
  cleaned = cleaned.replace(/\bappear[s]?\s+in\s+line\s+with\b/gi, 'may suggest');
  cleaned = cleaned.replace(/\bin\s+line\s+with\b/gi, 'consistent with');

  // Fix specific compound stutter: "Visual characteristics appear consistent with the (scene|specimen|image|landscape) appears [consistent with|in line with]"
  cleaned = cleaned.replace(
    /(?:visual\s+characteristics\s+)?appear[s]?\s+consistent\s+with\s+(?:the\s+(?:scene|specimen|image|photograph|formation|landscape|terrain)\s+)?appear[s]?\s*(?:consistent\s+with|in\s+line\s+with)?/gi,
    'appears consistent with'
  );

  // Fix "appears consistent with ... appears"
  cleaned = cleaned.replace(
    /\bappear[s]?\s+consistent\s+with\s+([^.?!;]+?)\bappear[s]?\b/gi,
    'appears consistent with $1'
  );

  // Fix repeated adjacent "appears consistent with"
  cleaned = cleaned.replace(/(?:appear[s]?\s+consistent\s+with\s*){2,}/gi, 'appears consistent with ');
  cleaned = cleaned.replace(/(?:consistent\s+with\s*){2,}/gi, 'consistent with ');
  cleaned = cleaned.replace(/(?:suggest[s]?\s*){2,}/gi, 'suggests ');
  cleaned = cleaned.replace(/(?:resemble[s]?\s*){2,}/gi, 'resembles ');

  // Fix repeated adjacent identical small words (e.g. "with with", "the the", "in in")
  cleaned = cleaned.replace(/\b(with|the|in|that|of|is|are|a|an)\s+\1\b/gi, '$1');

  // If "consistent with" appears more than once across the entire note, keep only the first
  const cwRegex = /\bconsistent with\b/gi;
  let cwCount = 0;
  cleaned = cleaned.replace(cwRegex, (match) => {
    cwCount++;
    if (cwCount === 1) return match;
    return 'resembling';
  });

  // If "appears" appears consecutively or redundantly with "may"
  cleaned = cleaned.replace(/\bmay\s+appears?\b/gi, 'may');
  cleaned = cleaned.replace(/\bcould\s+appears?\b/gi, 'could');

  return cleanPunctuation(cleaned);
}

/**
 * Extracts clean, concise text for Sentence 1: direct visible observation.
 */
export function buildDirectObservationSentence(firstEvidence?: string): string {
  if (!firstEvidence || firstEvidence.trim().length === 0) {
    return 'Direct field observation reveals distinct physical surface textures.';
  }

  const ev = firstEvidence.trim().replace(/[.,;:]+$/, '');

  // If it already starts with a direct observation phrase, use it cleanly
  if (
    /^(?:direct\s+observation|specimen\s+exhibits|specimen\s+displays|surface\s+shows|outcrop\s+displays|outcrop\s+exhibits|channel\s+view|foliage\s+shows|field\s+view)\b/i.test(
      ev
    )
  ) {
    return `${ev.charAt(0).toUpperCase() + ev.slice(1)}.`;
  }

  // Lowercase first letter if not an acronym
  const lowerFirst = /^[A-Z]{2,}\b/.test(ev) ? ev : ev.charAt(0).toLowerCase() + ev.slice(1);
  return `Direct observation reveals ${lowerFirst}.`;
}

/**
 * Extracts clean, concise text for Sentence 2:
 * "one concise tentative interpretation using uncertainty language only once, such as:
 *  'The scene may be consistent with…' or 'These features may suggest…'"
 */
export function buildTentativeInterpretationSentence(
  rawInterp?: string,
  category: string = 'other'
): string {
  if (!rawInterp || rawInterp.trim().length === 0) {
    return category === 'landscape' || category === 'water'
      ? 'The scene may be consistent with natural field features, though preliminary visual observation requires verification.'
      : 'These features may suggest a natural field specimen, though preliminary visual observation requires verification.';
  }

  // Get first sentence of possible interpretation
  let sentence = rawInterp.split(/(?<=[.?!])\s+/)[0]?.trim() || rawInterp.trim();

  // Iteratively strip all leading subject and uncertainty boilerplate to isolate the core hypothesis
  let prev = '';
  while (sentence !== prev) {
    prev = sentence;
    sentence = sentence.replace(
      /^(?:(?:the\s+(?:landscape|scene|specimen|outcrop|image|photograph|terrain|area|formation|environment|features)|visual\s+(?:characteristics|features)|these\s+features|this)\s+)?(?:appear[s]?\s+consistent\s+with|appear[s]?\s+in\s+line\s+with|may\s+be\s+consistent\s+with|could\s+be\s+consistent\s+with|is\s+consistent\s+with|in\s+line\s+with|consistent\s+with|may\s+suggest|could\s+suggest|suggest[s]?\s+characteristics\s+resembling|suggest[s]?|resemble[s]?|appears?\s+to\s+be)\s*/i,
      ''
    );
    sentence = sentence.replace(/^(?:the\s+(?:landscape|scene|specimen|image|terrain)\s+)/i, '');
    sentence = sentence.replace(/^(?:with\s+)/i, '');
    sentence = sentence.trim();
  }

  // Strip trailing punctuation
  sentence = sentence.replace(/[.,;:]+$/, '').trim();

  if (sentence.length === 0) {
    sentence = 'natural field characteristics';
  }

  // If the core hypothesis starts with "a " / "an " / "the ", or is a landscape scene
  const isSceneOrLandscape =
    category === 'landscape' ||
    category === 'water' ||
    /(?:landscape|wetland|marsh|valley|channel|basin|slope|forest|terrain|environment)/i.test(
      sentence
    );

  const prefix = isSceneOrLandscape ? 'The scene may be consistent with' : 'These features may suggest';

  // Ensure lowerFirst unless acronym or proper noun
  const lowerFirst = /^[A-Z]{2,}\b/.test(sentence)
    ? sentence
    : sentence.charAt(0).toLowerCase() + sentence.slice(1);

  return `${prefix} ${lowerFirst}.`;
}

/**
 * Extracts clean, concise text for Sentence 3:
 * "the most relevant context-specific verification step."
 */
export function buildVerificationSentence(firstCheck?: string): string {
  if (!firstCheck || firstCheck.trim().length === 0) {
    return 'In-person physical verification following Leave No Trace principles is recommended.';
  }

  // Strip parenthetical diagnostic clues
  let check = firstCheck.replace(/\s*\([^)]*\)/g, '').trim();
  // Strip leading numbering or labels like "Check 1:", "Test 1:", "1.", "Test Name:"
  check = check.replace(/^(?:check\s*\d+:?|test\s*\d+:?|\d+[.):])\s*/i, '');
  check = check.replace(/^[A-Za-z\s]+:\s*/, '');
  // Strip leading "If available" or "With an optional"
  check = check.replace(/^(?:if\s+[^,]+,\s*)/i, '');
  check = check.replace(/^(?:with\s+an?\s+optional\s+[^,]+,\s*)/i, '');
  check = check.replace(/^(?:to\s+[^,]+,\s*)/i, '');
  check = check.replace(/[.,;:]+$/, '').trim();

  if (check.length === 0) {
    return 'In-person physical verification following Leave No Trace principles is recommended.';
  }

  // If already phrased as a complete recommendation sentence
  if (/\b(?:is\s+recommended|are\s+recommended|is\s+planned|are\s+planned)\b/i.test(check)) {
    return `${check.charAt(0).toUpperCase() + check.slice(1)}.`;
  }

  // Convert leading imperative verb to gerund ("-ing") for smooth natural grammar
  let action = check;
  const verbMap: Record<string, string> = {
    'gently scratch': 'gently scratching',
    scratch: 'scratching',
    'gently examine': 'gently examining',
    examine: 'examining',
    'gently feel': 'gently feeling',
    feel: 'feeling',
    inspect: 'inspecting',
    measure: 'measuring',
    collect: 'collecting',
    observe: 'observing',
    check: 'checking',
    test: 'testing',
    estimate: 'estimating',
    conduct: 'conducting',
    perform: 'performing',
    view: 'viewing',
  };

  for (const [v, gerund] of Object.entries(verbMap)) {
    const rx = new RegExp(`^${v}\\b`, 'i');
    if (rx.test(action)) {
      action = action.replace(rx, gerund);
      break;
    }
  }

  const lowerFirst = /^[A-Z]{2,}\b/.test(action) ? action : action.charAt(0).toLowerCase() + action.slice(1);
  return `In-person verification via ${lowerFirst} is recommended.`;
}

/**
 * Main function: formats and guarantees a valid, high quality Field Notebook Summary.
 * Maximum 3 sentences:
 * Sentence 1: direct visible observation.
 * Sentence 2: one concise tentative interpretation using uncertainty language only once.
 * Sentence 3: the most relevant context-specific verification step.
 */
export function formatFieldNotebookSummary(
  rawSummary?: string | null,
  context?: SummaryContext
): string {
  const category = context?.category || 'other';
  const visibleEvidence = context?.visibleEvidence || [];
  const possibleInterpretation = context?.possibleInterpretation || '';
  const inPersonChecks = context?.inPersonChecks || [];

  const raw = typeof rawSummary === 'string' ? rawSummary.trim() : '';

  // If no raw summary provided, construct from scratch following the exact 3-sentence rules
  if (!raw) {
    const s1 = buildDirectObservationSentence(visibleEvidence[0]);
    const s2 = buildTentativeInterpretationSentence(possibleInterpretation, category);
    const s3 = buildVerificationSentence(inPersonChecks[0]);
    return cleanPunctuation(`${s1} ${s2} ${s3}`);
  }

  // Clean raw summary first
  let cleaned = cleanPunctuation(raw);
  cleaned = deduplicatePhrases(cleaned);

  // Split into sentences
  const sentences = cleaned
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Check if sentence 1 starts with interpretation language instead of direct observation
  const startsWithInterpretation =
    sentences.length > 0 &&
    /^(?:(?:the\s+(?:specimen|image|photograph|scene|outcrop|formation|landscape|terrain)|visual\s+characteristics|visual\s+features|these\s+features|this)\s+)?(?:appear[s]?\s+consistent\s+with|appear[s]?\s+in\s+line\s+with|consistent\s+with|suggest[s]?|is\s+likely|may\s+be|could\s+be)\b/i.test(
      sentences[0]
    );

  // Check if sentence 1 or 2 contains duplicated interpretation language or "appears in line with"
  const hasStutterOrDuplication =
    /\b(?:appear[s]?\s+in\s+line\s+with|appear[s]?\s+consistent\s+with[\s\w]*\bappear[s]?\b)\b/i.test(
      cleaned
    ) || (cleaned.match(/\bconsistent\s+with\b/gi) || []).length > 1;

  // If sentence 1 is an interpretation, has stutter, or summary is incomplete (< 2 sentences), rebuild cleanly
  if (startsWithInterpretation || hasStutterOrDuplication || sentences.length < 2) {
    let directObsText = visibleEvidence[0];
    if (!directObsText && sentences.length > 1) {
      const obsIdx = sentences.findIndex(
        (s, i) =>
          i > 0 &&
          /\b(?:visible|reveals|displays|shows|exhibits|texture|layer|color|surface|margin|grain|standing\s+water)\b/i.test(
            s
          ) &&
          !/\b(?:recommended|verification|check|scratch|test|inspect)\b/i.test(s)
      );
      if (obsIdx > 0) {
        directObsText = sentences[obsIdx];
      }
    }

    const s1 = buildDirectObservationSentence(directObsText);
    const s2 = buildTentativeInterpretationSentence(
      possibleInterpretation || (startsWithInterpretation ? sentences[0] : ''),
      category
    );
    const s3 = buildVerificationSentence(
      inPersonChecks[0] || (sentences.length > 2 ? sentences[sentences.length - 1] : '')
    );
    return cleanPunctuation(`${s1} ${s2} ${s3}`);
  }

  // If we have 2 or 3 sentences, ensure Sentence 2 is clean and Sentence 3 is a verification check
  let finalSentences = sentences.slice(0, 3);

  // Sentence 2: ensure it uses uncertainty language cleanly
  finalSentences[1] = buildTentativeInterpretationSentence(finalSentences[1], category);

  // If we only have 2 sentences, append the verification check as the 3rd sentence
  if (finalSentences.length === 2) {
    const s3 = buildVerificationSentence(inPersonChecks[0]);
    finalSentences.push(s3);
  } else if (finalSentences.length === 3) {
    // Ensure 3rd sentence is a verification step
    const s3 = finalSentences[2];
    const hasVerificationWord = /\b(?:verification|verify|inspect|check|test|scratch|measure|recommended|planned|hand\s+lens|observe|saturation)\b/i.test(
      s3
    );
    if (!hasVerificationWord) {
      finalSentences[2] = buildVerificationSentence(inPersonChecks[0]);
    }
  }

  // Ensure each sentence ends with a proper period
  finalSentences = finalSentences.map((s) => {
    const st = s.replace(/[.,;:]+$/, '').trim();
    return `${st}.`;
  });

  // Re-run deduplication and punctuation cleaning on the joined 3 sentences
  const joined = finalSentences.join(' ');
  return deduplicatePhrases(joined);
}
