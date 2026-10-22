import { FieldAnalysisResult, ObservationCategory } from '../types';

export interface SampleSpecimen {
  id: string;
  name: string;
  category: ObservationCategory;
  description: string;
  thumbnailSvg: string;
  analysis: FieldAnalysisResult;
}

// Inline SVGs for demo specimens (100% offline reliable, no external dependencies)
function createSvgDataUrl(title: string, subtitle: string, bgColor: string, pattern: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <rect width="600" height="450" fill="${bgColor}"/>
    ${pattern}
    <rect y="330" width="600" height="120" fill="rgba(15,23,42,0.85)"/>
    <text x="24" y="370" fill="#F8FAFC" font-family="sans-serif" font-size="20" font-weight="bold">${title}</text>
    <text x="24" y="405" fill="#94A3B8" font-family="sans-serif" font-size="14">${subtitle}</text>
    <rect x="500" y="355" width="76" height="30" rx="4" fill="#D97706"/>
    <text x="538" y="375" fill="#FFFFFF" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">5 cm</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_SPECIMENS: SampleSpecimen[] = [
  {
    id: 'sample-gneiss',
    name: 'Banded Outcrop Specimen',
    category: 'geology',
    description: 'Alternating light felsic and dark mafic crystalline bands',
    thumbnailSvg: createSvgDataUrl(
      'Metamorphic Banded Outcrop',
      'Foliated gneissic layering with quartz-feldspar augen',
      '#334155',
      `<path d="M0,80 Q150,110 300,70 T600,90 L600,120 Q450,140 300,100 T0,110 Z" fill="#64748B"/>
       <path d="M0,150 Q180,130 320,160 T600,140 L600,180 Q450,190 300,180 T0,180 Z" fill="#E2E8F0"/>
       <path d="M0,210 Q140,240 310,200 T600,230 L600,260 Q450,280 300,240 T0,240 Z" fill="#475569"/>
       <ellipse cx="220" cy="155" rx="28" ry="14" fill="#F1F5F9" stroke="#94A3B8" stroke-width="2"/>
       <ellipse cx="410" cy="195" rx="36" ry="16" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/>`
    ),
    analysis: {
      possibleInterpretation:
        'The specimen appears consistent with a foliated crystalline metamorphic rock, and one possibility is a banded gneiss. It could also represent a layered igneous intrusion or sheared metasediment, as an image alone cannot distinguish mineral compositions or metamorphic grade. Physical scratch tests and cleavage checks are needed to evaluate the constituent minerals.',
      visibleEvidence: [
        'Alternating lighter-toned and darker-toned parallel bands of granular grains measuring roughly 5mm to 20mm across.',
        'Rough granular surface texture in the light layers alongside small oriented reflective mineral specks in the darker layers.',
        'Eye-shaped clusters of pale mineral grains aligned with the orientation of the layering.',
      ],
      inPersonInvestigateQuestions: [
        'If a pocket knife is available, gently scratch a light-colored mineral grain on a loose flake to test whether it resists steel (~5.5).',
        'With an optional 10x hand lens, observe whether dark grains exhibit reflective sheet-like cleavage flakes or prismatic angles.',
        'If safe diluted acid is available, test a loose chip on a portable tray away from the rock face to check for effervescence.',
      ],
      fieldNoteSummary:
        'Outcrop exhibits distinct 5-20mm alternating light and dark crystalline banding with lenticular pod structures. Visible texture suggests high-grade foliation, but mineral identities cannot be confirmed from imagery alone. Hand-lens inspection and scratch testing on loose fragments are planned for verification.',
      uncertaintyDisclaimer:
        'AI field observations are preliminary hypotheses based on image features. Mineral identity, metamorphic grade, and protolith cannot be determined from photographs without physical testing.',
      fieldTestsChecklist: [
        {
          testName: 'Pocket Knife Scratch Test',
          instruction: 'Gently scratch a loose fragment with a pocket blade (if available) away from natural formations.',
          diagnosticClue: 'Resistance to steel scratching could suggest a relatively hard mineral composition such as quartz or feldspar.',
        },
        {
          testName: 'Hand Lens Cleavage Inspection',
          instruction: 'Use an optional 10x hand lens in open daylight to inspect mineral grain boundaries.',
          diagnosticClue: 'Reflective sheet-like flakes may be consistent with platy mineral grains such as mica.',
        },
        {
          testName: 'Loose Chip Acid Test (Leave No Trace)',
          instruction: 'If carrying dilute acid, apply one drop only to a small loose chip in a container and pack it out.',
          diagnosticClue: 'Absence of bubbling on a loose chip could suggest non-carbonate mineralogy.',
        },
      ],
      expandedAnalysis: {
        detailedInterpretation:
          'The compositional segregation into lighter quartz-feldspar zones and darker ferromagnesian bands suggests solid-state recrystallization under high temperatures and differential shear stress. A laboratory thin-section examination would be necessary to establish exact mineral percentages.',
        formationContext:
          'Deep crustal metamorphism where ductile shearing and thermal diffusion promote segregation of contrasting mineral phases.',
        diagnosticKey: [
          'Quartz vs. feldspar: look for two cleavage planes at ~90° on feldspar versus conchoidal fracture on quartz.',
          'Biotite vs. amphibole: check for flexible thin sheets (biotite) versus brittle 60°/120° cleavage planes (hornblende).',
          'Strike and dip: if a compass-clinometer is available, record the orientation of foliation surfaces.',
        ],
        advancedFieldTests: [
          'If a compass is available, measure foliation strike and dip to understand regional fold geometry.',
          'Examine loose, weathered float rocks nearby to check weathering rind thickness.',
        ],
        environmentalSignificance:
          'Exposed crystalline basement rocks typically yield acidic, nutrient-lean soils with low infiltration capacity.',
      },
    },
  },
  {
    id: 'sample-needle',
    name: 'Conifer Foliage Specimen',
    category: 'plant',
    description: 'Flattened needles with distinct two-ranked arrangement',
    thumbnailSvg: createSvgDataUrl(
      'Conifer Foliage Branchlet',
      'Flat linear needles with ventral stomatal bands',
      '#14532D',
      `<path d="M100,280 Q250,220 520,120" stroke="#78350F" stroke-width="8" stroke-linecap="round" fill="none"/>
       <path d="M180,240 Q130,190 90,170 M230,220 Q190,160 160,130 M280,200 Q250,140 220,110 M340,180 Q310,120 280,90 M400,160 Q380,100 350,70" stroke="#22C55E" stroke-width="6" stroke-linecap="round"/>
       <path d="M200,260 Q260,280 300,310 M250,240 Q320,260 360,280 M300,220 Q370,240 420,250 M370,190 Q430,210 470,220" stroke="#16A34A" stroke-width="6" stroke-linecap="round"/>`
    ),
    analysis: {
      possibleInterpretation:
        'The branchlet appears consistent with an evergreen conifer, and one possibility is a member of the Pinaceae family (such as a fir or hemlock), though yew or redwood foliage may share superficial similarities. A photograph of foliage alone cannot determine exact species or ecological classification. In-person checks of needle attachments, underside bands, and reproductive structures are required.',
      visibleEvidence: [
        'Flattened narrow-leaved green needles arranged horizontally along two sides of a slender woody stem.',
        'Dark green upper leaf surfaces showing a faint central groove and rounded or notched needle tips.',
        'Needle bases attached directly along the woody stem without raised woody pegs or prominent stalks.',
      ],
      inPersonInvestigateQuestions: [
        'Carefully detach a single fallen needle: inspect whether the detachment scar is a smooth circular disc or an oval pad.',
        'Turn a needle over under open daylight to observe whether two pale stomatal wax lines run along the underside.',
        'Crush a single fallen needle between fingers to note whether it releases a citrusy terpene aroma or little scent.',
      ],
      fieldNoteSummary:
        'Evergreen branchlet exhibits flat, blunt needles in a two-ranked horizontal arrangement. Visual morphology is consistent with fir-like conifers, but definitive identification cannot be made from foliage alone. In-situ observation of detachment scars and cone structures is recommended.',
      uncertaintyDisclaimer:
        'Visual foliage observations are preliminary hypotheses. Exact botanical identification cannot be determined from photographs alone and requires dichotomous keys and reproductive structures.',
      fieldTestsChecklist: [
        {
          testName: 'Needle Detachment Scar Check',
          instruction: 'Examine a detached needle base with an optional hand lens without damaging the living branch.',
          diagnosticClue: 'A smooth circular detachment scar may be consistent with certain fir species.',
        },
        {
          testName: 'Underside Stomatal Band Inspection',
          instruction: 'View the underside of several needles in natural daylight.',
          diagnosticClue: 'Two pale lines along the needle underside could suggest stomatal wax grooves.',
        },
        {
          testName: 'Gentle Foliar Scent Check',
          instruction: 'Gently crush a single detached needle and inhale briefly.',
          diagnosticClue: 'A citrusy terpene aroma may be consistent with resinous conifer foliage.',
        },
      ],
      expandedAnalysis: {
        detailedInterpretation:
          'Horizontal distichous needle arrangement is a common phototropic adaptation in shade-tolerant conifers, allowing maximum surface area for photosynthesis in forest understories.',
        formationContext:
          'Typically occurs within temperate montane forest ecosystems where snow accumulation and seasonal fog provide adequate canopy moisture.',
        diagnosticKey: [
          'Cross-section check: flat needles rule out 4-sided spruce needles.',
          'Attachment check: smooth twig surface rules out persistent woody sterigmata.',
          'Bud inspection: check if terminal winter buds are coated with protective resin.',
        ],
        advancedFieldTests: [
          'If a field ruler is available, measure needle length variation between shade and sun branches.',
          'Look on the forest floor for intact seed cones or fallen cone scales to assist keying.',
        ],
        environmentalSignificance:
          'Dense conifer canopies attenuate solar radiation and regulate ground surface temperatures for soil biota.',
      },
    },
  },
  {
    id: 'sample-creek',
    name: 'Riparian Stream Channel',
    category: 'water',
    description: 'Alluvial stream bed with cobble sorting and sediment plume',
    thumbnailSvg: createSvgDataUrl(
      'Gravel-Bed Alluvial Stream',
      'Riffle-pool channel morphology with gravel bar sorting',
      '#0369A1',
      `<path d="M0,280 Q180,240 320,290 T600,260 L600,450 L0,450 Z" fill="#0EA5E9" opacity="0.8"/>
       <ellipse cx="140" cy="380" rx="45" ry="25" fill="#94A3B8"/>
       <ellipse cx="230" cy="360" rx="35" ry="18" fill="#64748B"/>
       <ellipse cx="340" cy="390" rx="55" ry="30" fill="#CBD5E1"/>
       <path d="M420,280 Q480,270 560,290" stroke="#FFFFFF" stroke-width="3" fill="none" opacity="0.6"/>`
    ),
    analysis: {
      possibleInterpretation:
        'The image appears consistent with a shallow gravel-bed stream channel featuring active surface flow. One possibility is a natural riffle section, but water chemistry, velocity, and discharge cannot be determined from a photograph alone. Safe, direct in-person measurements are needed to evaluate flow and substrate characteristics.',
      visibleEvidence: [
        'Exposed margin of loose, rounded grey and tan stones of mixed sizes ranging from pebbles to small cobbles.',
        'Dark reflective water with patches of white aerated surface foam downstream of protruding stones.',
        'Submerged channel stones visible through the water surface in shallower margin areas.',
      ],
      inPersonInvestigateQuestions: [
        'If a ruler or tape is available, measure the intermediate axis of several gravel clasts on the dry bar without disturbing the bed.',
        'To estimate surface speed safely, float a natural dry leaf over a marked 5-meter bank distance and retrieve any markers afterward.',
        'Observe bank vegetation and substrate clarity from a stable, dry vantage point without wading into swift current.',
      ],
      fieldNoteSummary:
        'Channel view shows coarse rounded gravel-cobble substrate with visible surface riffles and moderate water clarity. Flow velocity and water chemistry cannot be inferred from imagery. Safe bank-side pebble measurement and float velocity estimation are recommended.',
      uncertaintyDisclaimer:
        'Photographic observations cannot determine water quality, pH, dissolved solids, or discharge. All hydrological metrics require calibrated instruments or verified physical measurements.',
      fieldTestsChecklist: [
        {
          testName: 'Dry Bar Clast Size Measurement',
          instruction: 'Measure 10 loose stones on the exposed gravel bar using an optional field ruler (Leave No Trace).',
          diagnosticClue: 'Measuring loose stone dimensions could suggest local sediment size distribution on the dry bar.',
        },
        {
          testName: 'Safe Natural Float Velocity Check',
          instruction: 'Time a floating natural leaf or small twig over a marked distance from the bank; retrieve all markers.',
          diagnosticClue: 'Surface drift timing may be consistent with approximate surface water speed at this reach.',
        },
        {
          testName: 'Substrate Clarity Observation',
          instruction: 'Look vertically into a calm margin pool with optional polarized glasses to note visible depth.',
          diagnosticClue: 'Visible bed stones in calm margins could suggest lower suspended particulate matter at this moment.',
        },
      ],
      expandedAnalysis: {
        detailedInterpretation:
          'Surface ripples and gravel sorting reflect local hydraulic shear stress during high-flow events. However, discharge volume and sediment flux vary seasonally and require continuous monitoring.',
        formationContext:
          'Fluvial erosion and deposition shaping channel morphology as flowing water mobilizes and re-deposits bedload materials.',
        diagnosticKey: [
          'Observe imbrication: clasts tilted upstream would be consistent with prevailing current orientation.',
          'Check channel margins for active undercutting versus root stabilization.',
        ],
        advancedFieldTests: [
          'If a calibrated probe is available, record water temperature and dissolved oxygen in a designated collection cup.',
          'Cross-sectional survey with wading staff only if safe flow conditions permit.',
        ],
        environmentalSignificance:
          'Coarse gravel substrate and turbulent riffles provide oxygenated microhabitats for aquatic invertebrates.',
      },
    },
  },
  {
    id: 'sample-indoor',
    name: 'Indoor Desk (Out of Scope)',
    category: 'other',
    description: 'Indoor workspace with computer equipment and furniture',
    thumbnailSvg: createSvgDataUrl(
      'Indoor Desk Scene',
      'Laptop computer and desk items (Non-field image)',
      '#1E293B',
      `<rect x="180" y="160" width="240" height="130" rx="8" fill="#334155" stroke="#64748B" stroke-width="3"/>
       <rect x="200" y="175" width="200" height="95" rx="4" fill="#0F172A"/>
       <path d="M150,290 L450,290 L470,305 L130,305 Z" fill="#64748B"/>
       <ellipse cx="490" cy="265" rx="20" ry="12" fill="#E2E8F0"/>
       <rect x="475" y="225" width="30" height="40" rx="4" fill="#CBD5E1"/>`
    ),
    analysis: {
      isOutOfScope: true,
      outOfScopeSubject: 'Indoor workspace / manufactured items',
      outOfScopeReason:
        'This photo primarily displays an indoor workspace with electronic devices rather than a natural environmental science specimen. FieldLens is intended for outdoor geological, ecological, and hydrological field observations.',
      suggestedExamples: [
        'Rocks, minerals, or exposed rock outcrops',
        'Wild plants, foliage, or tree bark',
        'Natural soil horizons, sediments, or substrate',
        'Water bodies, streams, lakes, or runoff channels',
        'Erosion patterns, ridges, or landforms',
      ],
    },
  },
];
