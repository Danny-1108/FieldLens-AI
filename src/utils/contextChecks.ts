/**
 * Context-aware in-person verification checks helper.
 * Ensures Section 3 checks are primarily grounded in:
 * - the actual visible evidence,
 * - the tentative interpretation,
 * - and the specific environmental context shown in the photograph,
 * rather than only the broad selected category.
 *
 * If AI-generated verification checks are available, they are always preferred.
 * Category fallbacks are broad, safe, and context-sensitive (e.g. flat wetlands never
 * receive hillslope or knickpoint checks).
 */

export function getContextAwareFallbackChecks(
  category: string = 'other',
  possibleInterpretation: string = '',
  visibleEvidence: string[] = []
): string[] {
  const contextText = `${category} ${possibleInterpretation} ${visibleEvidence.join(' ')}`.toLowerCase();

  // 1. Wetland / Marsh / Bog / Swamp / Fen / Floodplain / Riparian Mud
  if (
    /(?:wetland|marsh|bog|swamp|fen|reed|sedge|standing\s+water|saturated|mudflat|floodplain|riparian|puddle|shallow\s+water)/i.test(
      contextText
    )
  ) {
    return [
      'Inspect standing water depth and surface saturation along the vegetation contact line without stepping into deep mud (could suggest local water table level).',
      'Examine emergent plant stem bases and substrate firmness to observe whether organic detritus or mineral silt predominates.',
      'Observe surface water movement or clarity across open shallow patches using an optional clear container (may indicate stagnant vs slow drainage conditions).',
    ];
  }

  // 2. Hillslope / Active Erosion / Rills / Slopes / Talus
  if (
    /(?:slope|hillslope|ridge|cliff|escarpment|rill|gully|erosion|talus|scree|gradient|knickpoint|elevation\s+break)/i.test(
      contextText
    )
  ) {
    return [
      'Estimate the local slope gradient and observe surface drainage paths from a safe, stable vantage point (may be consistent with natural surface runoff).',
      'Observe the contact where slope angle changes to check whether loose mantle or cohesive substrate is exposed.',
      'Inspect the base of visible slopes or channels for recent sediment accumulation.',
    ];
  }

  // 3. Water body / Hydrology / Stream / Creek / River / Lake
  if (
    /(?:water|stream|creek|river|lake|pond|riffle|channel|alluvial|sediment\s+plume|shoreline)/i.test(
      contextText
    )
  ) {
    return [
      'Collect a small sample in a clean clear container to observe clarity, suspended sediment, and odor without adding chemicals (could suggest runoff influence).',
      'Observe surface flow rate by tracking a floating leaf over a measured distance and retrieving it afterward (may indicate local hydrological velocity).',
      'Inspect the shoreline margin for deposited gravel, silt lines, or staining indicating recent high-water levels.',
    ];
  }

  // 4. Plant / Botany / Foliage / Tree / Conifer / Shrub
  if (
    /(?:plant|flora|tree|bark|leaf|leaves|needle|foliage|conifer|shrub|lichen|branch|stem|botanical)/i.test(
      contextText
    )
  ) {
    return [
      'Gently examine the underside of a mature lower leaf with an optional hand lens to inspect vein networks or surface pubescence without picking the specimen.',
      'Feel the stem cross-section between fingers to evaluate whether it is rounded, square, or ribbed (could suggest specific family characteristics).',
      'Observe the arrangement of leaves along the stem node (alternate vs opposite) to evaluate branching morphology.',
    ];
  }

  // 5. Rock / Mineral / Outcrop / Geology / Bedrock
  if (
    /(?:rock|mineral|outcrop|geology|stone|boulder|bedrock|granite|gneiss|basalt|sandstone|shale|quartz|crystal|fracture)/i.test(
      contextText
    )
  ) {
    return [
      'If a pocket knife or penny is available, gently scratch a loose fragment to test relative mineral hardness (could suggest silicate vs carbonate).',
      'With an optional 10x hand lens, inspect grain boundaries on a clean break to observe whether crystals show cleavage planes or granular interlocking.',
      'Check orientation and strike of any visible banding or planar fractures using a compass if available (may be consistent with directional stress).',
    ];
  }

  // 6. Broad, Safe Universal Landscape Fallback (Never assumes slopes, talus, or knickpoints)
  return [
    'Observe the contact relationships between exposed surface substrate and surrounding vegetation cover to evaluate natural weathering.',
    'Inspect loose surface sediment or soil texture along an undisturbed margin to note particle size and cohesion.',
    'Document natural orientation, elevation changes, or moisture patterns using a standard compass or field notes if available.',
  ];
}
