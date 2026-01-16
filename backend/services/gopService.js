/**
 * Goodness of Pronunciation (GOP) Service
 * Analyzes phoneme-level pronunciation quality for Arabic recitation
 * 
 * Features:
 * - Phoneme-level probability extraction
 * - Arabic phoneme mapping
 * - GOP score calculation
 * - Pronunciation quality detection (vowel length, consonant quality, tajweed)
 * - Integration with Whisper transcription
 */

const { EventEmitter } = require('events');

class GOPService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.minGOPThreshold = options.minGOPThreshold || 0.6; // Minimum GOP score (0-1)
    this.vowelLengthThreshold = options.vowelLengthThreshold || 0.5; // Minimum vowel length score
    this.tajweedWeight = options.tajweedWeight || 0.3; // Weight for tajweed mistakes in GOP
    
    // Arabic phoneme mappings
    this.arabicPhonemes = this.initializeArabicPhonemes();
    
    // Pronunciation dictionary (expected phonemes for common words)
    this.pronunciationDictionary = this.initializePronunciationDictionary();
  }

  /**
   * Initialize Arabic phoneme mappings
   * Maps Arabic letters and diacritics to phonemes
   */
  initializeArabicPhonemes() {
    return {
      // Consonants
      'ب': 'b', 'ت': 't', 'ث': 'θ', 'ج': 'dʒ', 'ح': 'ħ', 'خ': 'x',
      'د': 'd', 'ذ': 'ð', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'ʃ',
      'ص': 'sˤ', 'ض': 'dˤ', 'ط': 'tˤ', 'ظ': 'zˤ', 'ع': 'ʕ', 'غ': 'ɣ',
      'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
      'ه': 'h', 'و': 'w', 'ي': 'j', 'ء': 'ʔ', 'أ': 'ʔ', 'إ': 'ʔ', 'آ': 'ʔ',
      
      // Vowels (diacritics)
      'َ': 'a', // Fatha (short a)
      'ُ': 'u', // Damma (short u)
      'ِ': 'i', // Kasra (short i)
      'ً': 'an', // Fathatan
      'ٌ': 'un', // Dammatan
      'ٍ': 'in', // Kasratan
      'ا': 'aː', // Alif (long a)
      'و': 'uː', // Waw (long u)
      'ي': 'iː', // Ya (long i)
      
      // Tajweed-specific
      'م': 'm', // Meem with shaddah (ghunnah)
      'ن': 'n', // Noon with shaddah (ghunnah)
    };
  }

  /**
   * Initialize pronunciation dictionary
   * Maps common Quranic words to expected phoneme sequences
   */
  initializePronunciationDictionary() {
    // This would ideally be loaded from a database or file
    // For now, we'll generate it dynamically from expected text
    return new Map();
  }

  /**
   * Extract phoneme-level probabilities from Whisper output
   * Note: Whisper doesn't directly provide phoneme probabilities,
   * so we'll use word-level confidence and infer phoneme quality
   * 
   * @param {Object} whisperResult - Whisper transcription result
   * @param {Array} wordsWithTimestamps - Words with timestamps
   * @returns {Array} Phoneme-level data
   */
  extractPhonemeProbabilities(whisperResult, wordsWithTimestamps = []) {
    const phonemeData = [];
    
    // If Whisper provides word-level probabilities, use them
    if (whisperResult.words && Array.isArray(whisperResult.words)) {
      for (const word of whisperResult.words) {
        const phonemes = this.wordToPhonemes(word.text || word.word || '');
        const baseProbability = word.probability || word.score || 0.8;
        
        // Distribute probability across phonemes
        const phonemeProb = baseProbability / phonemes.length;
        
        for (let i = 0; i < phonemes.length; i++) {
          phonemeData.push({
            phoneme: phonemes[i],
            probability: phonemeProb,
            word: word.text || word.word,
            wordIndex: word.index || 0,
            startTime: word.start || 0,
            endTime: word.end || 0,
            timestamp: word.start || 0
          });
        }
      }
    } else {
      // Fallback: infer from text and timestamps
      const text = whisperResult.text || '';
      const words = text.split(/\s+/);
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const phonemes = this.wordToPhonemes(word);
        const wordTimestamp = wordsWithTimestamps[i] || {};
        
        // Default probability (will be refined by GOP analysis)
        const baseProbability = 0.7;
        const phonemeProb = baseProbability / phonemes.length;
        
        for (let j = 0; j < phonemes.length; j++) {
          phonemeData.push({
            phoneme: phonemes[j],
            probability: phonemeProb,
            word: word,
            wordIndex: i,
            startTime: wordTimestamp.start || 0,
            endTime: wordTimestamp.end || 0,
            timestamp: wordTimestamp.start || 0
          });
        }
      }
    }
    
    return phonemeData;
  }

  /**
   * Convert Arabic word to phoneme sequence
   * @param {string} word - Arabic word
   * @returns {Array<string>} Phoneme sequence
   */
  wordToPhonemes(word) {
    const phonemes = [];
    const chars = Array.from(word);
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const nextChar = chars[i + 1];
      
      // Check if it's a letter
      if (this.arabicPhonemes[char]) {
        const phoneme = this.arabicPhonemes[char];
        
        // Check for long vowels (Alif, Waw, Ya)
        if (char === 'ا' || char === 'و' || char === 'ي') {
          // Long vowel
          phonemes.push(phoneme);
        } else {
          // Consonant - check for following vowel
          if (nextChar && this.isVowelDiacritic(nextChar)) {
            const vowel = this.arabicPhonemes[nextChar];
            phonemes.push(phoneme + vowel);
            i++; // Skip the diacritic
          } else {
            phonemes.push(phoneme);
          }
        }
      }
    }
    
    return phonemes;
  }

  /**
   * Check if character is a vowel diacritic
   * @param {string} char - Character to check
   * @returns {boolean}
   */
  isVowelDiacritic(char) {
    return ['َ', 'ُ', 'ِ', 'ً', 'ٌ', 'ٍ'].includes(char);
  }

  /**
   * Calculate GOP score for a word
   * GOP = average log-posterior probability of phonemes
   * 
   * @param {Array} phonemeData - Phoneme-level data for the word
   * @param {Array} expectedPhonemes - Expected phoneme sequence
   * @returns {Object} GOP analysis result
   */
  calculateGOP(phonemeData, expectedPhonemes) {
    if (!phonemeData || phonemeData.length === 0) {
      return {
        gopScore: 0,
        phonemeScores: [],
        pronunciationIssues: [],
        quality: 'poor'
      };
    }

    const phonemeScores = [];
    const pronunciationIssues = [];
    let totalLogProb = 0;
    let validPhonemes = 0;

    // Align phonemes (simple alignment for now)
    const alignedPhonemes = this.alignPhonemes(
      phonemeData.map(p => p.phoneme),
      expectedPhonemes
    );

    for (let i = 0; i < alignedPhonemes.length; i++) {
      const aligned = alignedPhonemes[i];
      const actualPhoneme = aligned.actual;
      const expectedPhoneme = aligned.expected;
      const phonemeDataItem = phonemeData[i] || phonemeData[aligned.actualIndex] || {};
      
      // Calculate log-posterior probability
      const probability = phonemeDataItem.probability || 0.5;
      const logProb = Math.log(Math.max(probability, 0.001)); // Avoid log(0)
      
      // Check if phoneme matches expected
      const isMatch = this.comparePhonemes(actualPhoneme, expectedPhoneme);
      const matchScore = isMatch ? 1.0 : 0.3; // Penalty for mismatch
      
      // Combined score
      const phonemeScore = (logProb + Math.log(matchScore)) / 2;
      totalLogProb += phonemeScore;
      validPhonemes++;

      phonemeScores.push({
        phoneme: actualPhoneme,
        expected: expectedPhoneme,
        probability: probability,
        logProbability: logProb,
        matchScore: matchScore,
        gopScore: phonemeScore,
        isMatch: isMatch
      });

      // Detect pronunciation issues
      if (!isMatch) {
        const issue = this.detectPronunciationIssue(actualPhoneme, expectedPhoneme);
        if (issue) {
          pronunciationIssues.push({
            ...issue,
            phonemeIndex: i,
            actualPhoneme,
            expectedPhoneme
          });
        }
      }

      // Check vowel length (for Damma, Fatha, Kasra)
      if (this.isVowel(actualPhoneme) && this.isVowel(expectedPhoneme)) {
        const vowelLengthIssue = this.checkVowelLength(
          actualPhoneme,
          expectedPhoneme,
          phonemeDataItem
        );
        if (vowelLengthIssue) {
          pronunciationIssues.push(vowelLengthIssue);
        }
      }
    }

    // Calculate average GOP score
    const avgGOP = validPhonemes > 0 ? totalLogProb / validPhonemes : 0;
    // Normalize to 0-1 scale (log probabilities are negative)
    const normalizedGOP = Math.max(0, Math.min(1, (avgGOP + 5) / 5)); // Rough normalization

    // Determine quality level
    let quality = 'excellent';
    if (normalizedGOP < this.minGOPThreshold) {
      quality = 'poor';
    } else if (normalizedGOP < 0.75) {
      quality = 'fair';
    } else if (normalizedGOP < 0.9) {
      quality = 'good';
    }

    return {
      gopScore: normalizedGOP,
      logGOP: avgGOP,
      phonemeScores,
      pronunciationIssues,
      quality,
      totalPhonemes: validPhonemes,
      matchedPhonemes: phonemeScores.filter(s => s.isMatch).length
    };
  }

  /**
   * Align actual phonemes with expected phonemes
   * Uses simple dynamic programming alignment
   * 
   * @param {Array} actualPhonemes - Actual phoneme sequence
   * @param {Array} expectedPhonemes - Expected phoneme sequence
   * @returns {Array} Aligned phoneme pairs
   */
  alignPhonemes(actualPhonemes, expectedPhonemes) {
    const aligned = [];
    let actualIdx = 0;
    let expectedIdx = 0;

    while (actualIdx < actualPhonemes.length || expectedIdx < expectedPhonemes.length) {
      const actual = actualPhonemes[actualIdx] || null;
      const expected = expectedPhonemes[expectedIdx] || null;

      if (actual && expected) {
        aligned.push({
          actual,
          expected,
          actualIndex: actualIdx,
          expectedIndex: expectedIdx
        });
        actualIdx++;
        expectedIdx++;
      } else if (actual) {
        // Extra phoneme (insertion)
        aligned.push({
          actual,
          expected: null,
          actualIndex: actualIdx,
          expectedIndex: -1
        });
        actualIdx++;
      } else {
        // Missing phoneme (deletion)
        aligned.push({
          actual: null,
          expected,
          actualIndex: -1,
          expectedIndex: expectedIdx
        });
        expectedIdx++;
      }
    }

    return aligned;
  }

  /**
   * Compare two phonemes (with fuzzy matching for similar sounds)
   * @param {string} actual - Actual phoneme
   * @param {string} expected - Expected phoneme
   * @returns {boolean} Whether they match
   */
  comparePhonemes(actual, expected) {
    if (!actual || !expected) return false;
    if (actual === expected) return true;

    // Fuzzy matching for similar phonemes
    const similarPhonemes = {
      'a': ['aː', 'a'], // Short vs long a
      'u': ['uː', 'u'], // Short vs long u
      'i': ['iː', 'i'], // Short vs long i
      's': ['sˤ'], // Regular vs emphatic s
      'd': ['dˤ'], // Regular vs emphatic d
      't': ['tˤ'], // Regular vs emphatic t
      'z': ['zˤ'], // Regular vs emphatic z
    };

    // Check if phonemes are similar
    for (const [base, variants] of Object.entries(similarPhonemes)) {
      if (variants.includes(actual) && variants.includes(expected)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect specific pronunciation issues
   * @param {string} actual - Actual phoneme
   * @param {string} expected - Expected phoneme
   * @returns {Object|null} Issue details or null
   */
  detectPronunciationIssue(actual, expected) {
    if (!actual || !expected) return null;

    // Vowel substitution (e.g., Damma sounds like Fatha)
    if (this.isVowel(actual) && this.isVowel(expected)) {
      if (expected.includes('u') && actual.includes('a')) {
        return {
          type: 'vowel_substitution',
          severity: 'medium',
          description: 'Damma (u) pronounced as Fatha (a)',
          expected: expected,
          actual: actual
        };
      }
      if (expected.includes('a') && actual.includes('u')) {
        return {
          type: 'vowel_substitution',
          severity: 'medium',
          description: 'Fatha (a) pronounced as Damma (u)',
          expected: expected,
          actual: actual
        };
      }
      if (expected.includes('i') && actual.includes('a')) {
        return {
          type: 'vowel_substitution',
          severity: 'medium',
          description: 'Kasra (i) pronounced as Fatha (a)',
          expected: expected,
          actual: actual
        };
      }
    }

    // Vowel length issues
    if (expected.includes('ː') && !actual.includes('ː')) {
      return {
        type: 'vowel_length',
        severity: 'high',
        description: 'Long vowel shortened',
        expected: expected,
        actual: actual
      };
    }
    if (!expected.includes('ː') && actual.includes('ː')) {
      return {
        type: 'vowel_length',
        severity: 'medium',
        description: 'Short vowel lengthened',
        expected: expected,
        actual: actual
      };
    }

    // Consonant quality issues
    if (expected.includes('ˤ') && !actual.includes('ˤ')) {
      return {
        type: 'consonant_quality',
        severity: 'high',
        description: 'Emphatic consonant not pronounced correctly',
        expected: expected,
        actual: actual
      };
    }

    return null;
  }

  /**
   * Check if phoneme is a vowel
   * @param {string} phoneme - Phoneme to check
   * @returns {boolean}
   */
  isVowel(phoneme) {
    if (!phoneme) return false;
    return /[aiu]|aː|iː|uː/.test(phoneme);
  }

  /**
   * Check vowel length quality
   * @param {string} actual - Actual phoneme
   * @param {string} expected - Expected phoneme
   * @param {Object} phonemeData - Phoneme data with timing
   * @returns {Object|null} Issue or null
   */
  checkVowelLength(actual, expected, phonemeData) {
    if (!phonemeData.startTime || !phonemeData.endTime) return null;

    const duration = phonemeData.endTime - phonemeData.startTime;
    const isLongExpected = expected.includes('ː');
    const isLongActual = actual.includes('ː');

    // Expected long vowel but pronounced short
    if (isLongExpected && !isLongActual) {
      // Check duration (long vowels should be ~2x short vowels)
      if (duration < 0.15) { // Less than 150ms for long vowel
        return {
          type: 'vowel_length',
          severity: 'high',
          description: `Long vowel "${expected}" pronounced too short (${duration.toFixed(3)}s)`,
          expected: expected,
          actual: actual,
          duration: duration,
          expectedDuration: 0.2 // ~200ms for long vowel
        };
      }
    }

    // Expected short vowel but pronounced long
    if (!isLongExpected && isLongActual) {
      if (duration > 0.2) { // More than 200ms for short vowel
        return {
          type: 'vowel_length',
          severity: 'medium',
          description: `Short vowel "${expected}" pronounced too long (${duration.toFixed(3)}s)`,
          expected: expected,
          actual: actual,
          duration: duration,
          expectedDuration: 0.1 // ~100ms for short vowel
        };
      }
    }

    return null;
  }

  /**
   * Analyze GOP for entire recitation
   * @param {Object} whisperResult - Whisper transcription result
   * @param {Array} expectedWords - Expected words from Quran
   * @param {Array} wordsWithTimestamps - Words with timestamps
   * @returns {Object} Complete GOP analysis
   */
  analyzeRecitationGOP(whisperResult, expectedWords, wordsWithTimestamps = []) {
    const phonemeData = this.extractPhonemeProbabilities(whisperResult, wordsWithTimestamps);
    const wordGOPs = [];
    const allPronunciationIssues = [];
    let totalGOP = 0;
    let wordCount = 0;

    // Group phonemes by word
    const words = (whisperResult.text || '').split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const expectedWord = expectedWords[i] || '';
      
      // Get phonemes for this word
      const wordPhonemes = phonemeData.filter(p => p.wordIndex === i);
      const expectedPhonemes = this.wordToPhonemes(expectedWord);
      
      // Calculate GOP for this word
      const wordGOP = this.calculateGOP(wordPhonemes, expectedPhonemes);
      
      wordGOPs.push({
        word,
        expectedWord,
        wordIndex: i,
        ...wordGOP
      });
      
      totalGOP += wordGOP.gopScore;
      wordCount++;
      
      // Collect pronunciation issues
      if (wordGOP.pronunciationIssues.length > 0) {
        allPronunciationIssues.push(...wordGOP.pronunciationIssues.map(issue => ({
          ...issue,
          word,
          wordIndex: i
        })));
      }
    }

    // Calculate overall GOP score
    const overallGOP = wordCount > 0 ? totalGOP / wordCount : 0;

    // Categorize issues
    const issuesByType = this.categorizePronunciationIssues(allPronunciationIssues);

    return {
      overallGOP,
      wordGOPs,
      pronunciationIssues: allPronunciationIssues,
      issuesByType,
      totalWords: wordCount,
      wordsWithIssues: wordGOPs.filter(w => w.pronunciationIssues.length > 0).length,
      averageWordGOP: overallGOP
    };
  }

  /**
   * Categorize pronunciation issues by type
   * @param {Array} issues - Pronunciation issues
   * @returns {Object} Categorized issues
   */
  categorizePronunciationIssues(issues) {
    const categorized = {
      vowel_substitution: [],
      vowel_length: [],
      consonant_quality: [],
      tajweed: [],
      other: []
    };

    for (const issue of issues) {
      const type = issue.type || 'other';
      if (categorized[type]) {
        categorized[type].push(issue);
      } else {
        categorized.other.push(issue);
      }
    }

    return categorized;
  }

  /**
   * Get expected phonemes for a word from pronunciation dictionary
   * @param {string} word - Arabic word
   * @returns {Array} Expected phoneme sequence
   */
  getExpectedPhonemes(word) {
    // Check dictionary first
    if (this.pronunciationDictionary.has(word)) {
      return this.pronunciationDictionary.get(word);
    }

    // Generate from word
    return this.wordToPhonemes(word);
  }
}

// Export singleton instance and class
const gopService = new GOPService();

module.exports = {
  GOPService,
  gopService // Singleton instance
};
