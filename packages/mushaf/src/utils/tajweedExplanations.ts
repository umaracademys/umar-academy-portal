/**
 * Tajweed rule explanations for instructional display
 */

export interface TajweedExplanation {
  ruleName: string;
  explanation: string;
  example?: string;
}

const TAJWEED_EXPLANATIONS: Record<string, TajweedExplanation> = {
  madd: {
    ruleName: 'Madd (Elongation)',
    explanation: 'Elongation of vowel sounds. Madd letters (ا, و, ي) when followed by sukoon or hamza require specific elongation counts.',
    example: 'Natural madd: 2 counts, Required madd: 4-6 counts',
  },
  ikhfa: {
    ruleName: 'Ikhfāʾ (Concealment)',
    explanation: 'نْ or نّ before certain letters (ت, ث, ج, د, ذ, ز, س, ش, ص, ض, ط, ظ, ف, ق, ك) requires Ghunna (nasalization) for 2 counts.',
    example: 'نْ before ت → Ghunna 2 counts',
  },
  tech: {
    ruleName: 'Ghunna (Nasalization)',
    explanation: 'Nasal sound produced when ن or م have shaddah or when نْ is followed by certain letters. Duration: 2 counts.',
    example: 'نّ or مّ → Ghunna 2 counts',
  },
  heavy_letter: {
    ruleName: 'Tafkhīm (Heavy Letter)',
    explanation: 'Certain letters (خ, ص, ض, ط, ظ, غ, ق) are always heavy (tafkhīm), requiring full mouth cavity resonance.',
    example: 'ق, ط, ض → Always heavy',
  },
  no_rounding_lips: {
    ruleName: 'No Lip Rounding',
    explanation: 'و should be pronounced without rounding the lips when it appears as a consonant.',
    example: 'و in وَلَا → No lip rounding',
  },
  heavy_h: {
    ruleName: 'Heavy Hāʾ',
    explanation: 'ه when it appears in certain positions requires heavy pronunciation (full mouth cavity).',
    example: 'ه in أَهْدِنَا → Heavy pronunciation',
  },
  light_l: {
    ruleName: 'Light Lām',
    explanation: 'ل in لفظ الجلالة (Allah) is pronounced lightly when preceded by kasrah or yāʾ.',
    example: 'ل in بِاللَّهِ → Light pronunciation',
  },
};

export function getTajweedExplanation(type: string): TajweedExplanation | null {
  return TAJWEED_EXPLANATIONS[type] || null;
}

export function isTajweedType(type: string): boolean {
  return type in TAJWEED_EXPLANATIONS;
}


