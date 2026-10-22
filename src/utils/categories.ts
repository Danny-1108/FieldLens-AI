import { CategoryMetadata, ObservationCategory } from '../types';

export const CATEGORIES: CategoryMetadata[] = [
  {
    id: 'geology',
    label: 'Geology / rock',
    shortLabel: 'Geology',
    description: 'Rocks, minerals, sediments, stratigraphy, fossils, or fault zones',
    hint: 'Include a scale item (coin, pencil, knife) in your frame if possible.',
    iconName: 'Mountain',
    color: 'amber',
  },
  {
    id: 'plant',
    label: 'Plant / ecology',
    shortLabel: 'Plant',
    description: 'Leaves, stems, bark, flowers, moss, lichen, fungi, or plant communities',
    hint: 'Capture both leaf arrangement and close-up vein/margin texture.',
    iconName: 'Sprout',
    color: 'emerald',
  },
  {
    id: 'water',
    label: 'Water',
    shortLabel: 'Water',
    description: 'Streams, pools, turbidity, foam, sediment transport, or riparian zones',
    hint: 'Notice clarity, bottom substrate, flow speed, and surface features.',
    iconName: 'Droplets',
    color: 'cyan',
  },
  {
    id: 'landscape',
    label: 'Landscape / environmental feature',
    shortLabel: 'Landscape',
    description: 'Landforms, slope angles, weathering rinds, erosion channels, or soil horizons',
    hint: 'Step back to capture the wider geological context and horizon reference.',
    iconName: 'Compass',
    color: 'orange',
  },
  {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    description: 'Weather phenomena, animal tracks, anthropogenic impact, or outdoor specimens',
    hint: 'Describe any ambient context like odor, dampness, or sun exposure.',
    iconName: 'Layers',
    color: 'slate',
  },
];

export function getCategoryMeta(id: ObservationCategory): CategoryMetadata {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}
