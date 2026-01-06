import { useMemo } from 'react';
import { MushafMistake } from '../types/mushaf';

export interface MistakeCounts {
  mistakes: number;
  atkees: number;
  tajweed: number;
  total: number;
}

/**
 * Categorize mistake types into three categories:
 * - mistake: memory, holding, letter, other
 * - atkee: atkee
 * - tajweed: madd, ikhfa, tech, heavy_letter, no_rounding_lips, heavy_h, light_l
 */
function categorizeMistakeType(type: string): 'mistake' | 'atkee' | 'tajweed' {
  if (type === 'atkee') {
    return 'atkee';
  }
  
  const tajweedTypes = ['madd', 'ikhfa', 'tech', 'heavy_letter', 'no_rounding_lips', 'heavy_h', 'light_l'];
  if (tajweedTypes.includes(type)) {
    return 'tajweed';
  }
  
  return 'mistake';
}

/**
 * Hook to calculate separate mistake counts by category
 */
export function useMistakeCounts(
  mistakes: MushafMistake[],
  historicalMistakes?: MushafMistake[],
  showHistorical: boolean = true
): MistakeCounts {
  return useMemo(() => {
    const allMistakes = showHistorical && historicalMistakes
      ? [...mistakes, ...historicalMistakes]
      : mistakes;

    const counts: MistakeCounts = {
      mistakes: 0,
      atkees: 0,
      tajweed: 0,
      total: allMistakes.length,
    };

    allMistakes.forEach(mistake => {
      const category = categorizeMistakeType(mistake.type);
      counts[category]++;
    });

    return counts;
  }, [mistakes, historicalMistakes, showHistorical]);
}


