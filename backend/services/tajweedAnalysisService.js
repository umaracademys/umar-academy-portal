/**
 * Tajweed Analysis Service
 * Analyzes recitation quality based on Tajweed rules and fluency metrics
 * 
 * Features:
 * - Madd (Elongation) analysis
 * - Ghunnah (Nasalization) detection
 * - Waqf (Pause) analysis
 * - Phonetic accuracy scoring
 * - Integrated with GOP and audio analysis
 */

const { EventEmitter } = require('events');
const { gopService } = require('./gopService');

class TajweedAnalysisService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.maddThresholdMultiplier = options.maddThresholdMultiplier || 1.5; // Long vowels should be 1.5x short vowels
    this.ghunnaFrequencyRange = { min: 1000, max: 3000 }; // Hz range for ghunnah detection
    this.waqfPauseThreshold = options.waqfPauseThreshold || 1.0; // 1 second minimum for valid waqf
    this.minPhonemeDuration = options.minPhonemeDuration || 0.05; // 50ms minimum
    this.maxPhonemeDuration = options.maxPhonemeDuration || 0.5; // 500ms maximum
    
    // Quranic pause marks (Waqf signs)
    this.waqfMarks = [
      'م', // Must stop
      'ط', // Must stop
      'قلى', // Prefer not to stop
      'ج', // Must stop
      'صلى', // Prefer not to stop
      'ز', // Prefer not to stop
      'قف', // Must stop
      'ص', // Prefer not to stop
      'لا', // Do not stop
      '☪' // End of verse (natural pause)
    ];
  }

  /**
   * Analyze Madd (Elongation) - Long vowels should be pronounced longer
   * @param {Array} phonemeData - Phoneme-level data with timestamps
   * @param {Array} expectedPhonemes - Expected phoneme sequence
   * @param {number} averageTempo - Average phoneme duration in seconds
   * @returns {Object} Madd analysis results
   */
  analyzeMadd(phonemeData, expectedPhonemes, averageTempo = 0.1) {
    console.log(`🔵 [DEBUG] Analyzing Madd (elongation). Phonemes: ${phonemeData.length}, Expected: ${expectedPhonemes.length}, Avg tempo: ${averageTempo.toFixed(3)}s`);
    
    const maddIssues = [];
    let correctMaddCount = 0;
    let totalMaddCount = 0;

    // Identify long vowels (Madd) - indicated by 'ː' in IPA or specific Arabic patterns
    for (let i = 0; i < expectedPhonemes.length; i++) {
      const expected = expectedPhonemes[i];
      const actual = phonemeData[i] || {};
      
      // Check if expected phoneme is a long vowel (Madd)
      const isLongVowel = expected.includes('ː') || 
                          expected.includes('aː') || 
                          expected.includes('iː') || 
                          expected.includes('uː') ||
                          this.isMaddVowel(expected);

      if (isLongVowel) {
        totalMaddCount++;
        const expectedDuration = averageTempo * this.maddThresholdMultiplier; // Long vowels should be longer
        const actualDuration = actual.endTime && actual.startTime 
          ? actual.endTime - actual.startTime 
          : null;

        if (actualDuration !== null) {
          // Check if duration is appropriate for long vowel
          if (actualDuration < expectedDuration * 0.8) {
            // Too short - Madd not properly elongated
            maddIssues.push({
              type: 'madd_too_short',
              phonemeIndex: i,
              expectedPhoneme: expected,
              actualPhoneme: actual.phoneme || expected,
              expectedDuration: expectedDuration,
              actualDuration: actualDuration,
              severity: actualDuration < expectedDuration * 0.5 ? 'high' : 'medium',
              description: `Madd (long vowel) pronounced too short: ${actualDuration.toFixed(3)}s < ${expectedDuration.toFixed(3)}s`
            });
          } else {
            correctMaddCount++;
          }
        } else {
          // No timing data available
          maddIssues.push({
            type: 'madd_no_timing',
            phonemeIndex: i,
            expectedPhoneme: expected,
            severity: 'low',
            description: 'Madd vowel detected but no timing data available'
          });
        }
      }
    }

    // Calculate Madd accuracy score
    const maddAccuracy = totalMaddCount > 0 
      ? (correctMaddCount / totalMaddCount) * 100 
      : 100; // Perfect if no Madd vowels to check

    console.log(`🔵 [DEBUG] Madd analysis: ${correctMaddCount}/${totalMaddCount} correct, Accuracy: ${maddAccuracy.toFixed(1)}%, Issues: ${maddIssues.length}`);

    return {
      maddAccuracy,
      correctMaddCount,
      totalMaddCount,
      issues: maddIssues,
      averageExpectedDuration: averageTempo * this.maddThresholdMultiplier,
      averageActualDuration: maddIssues.length > 0 && maddIssues[0].actualDuration
        ? maddIssues.reduce((sum, issue) => sum + (issue.actualDuration || 0), 0) / maddIssues.length
        : null
    };
  }

  /**
   * Check if phoneme is a Madd vowel (Arabic long vowel pattern)
   * @param {string} phoneme - Phoneme to check
   * @returns {boolean}
   */
  isMaddVowel(phoneme) {
    // Long vowels in Arabic are indicated by:
    // - Alif (ا) after Fatha (a)
    // - Waw (و) after Damma (u)
    // - Ya (ي) after Kasra (i)
    // In IPA: aː, iː, uː
    return /[aiu]ː/.test(phoneme) || 
           phoneme === 'aː' || 
           phoneme === 'iː' || 
           phoneme === 'uː';
  }

  /**
   * Analyze Ghunnah (Nasalization) - Specific frequency analysis for nasal sounds
   * Note: This requires audio frequency analysis, which may not be available
   * For now, we'll use phoneme-level detection and duration analysis
   * @param {Array} phonemeData - Phoneme-level data
   * @param {Array} expectedPhonemes - Expected phoneme sequence
   * @param {Object} audioFeatures - Optional audio frequency features
   * @returns {Object} Ghunnah analysis results
   */
  analyzeGhunnah(phonemeData, expectedPhonemes, audioFeatures = null) {
    const ghunnahIssues = [];
    let correctGhunnahCount = 0;
    let totalGhunnahCount = 0;

    // Ghunnah occurs with:
    // - Noon (ن) with shaddah (ّ) or when followed by certain letters
    // - Meem (م) with shaddah (ّ) or when followed by certain letters
    const ghunnahPatterns = ['n', 'm', 'ن', 'م'];

    for (let i = 0; i < expectedPhonemes.length; i++) {
      const expected = expectedPhonemes[i];
      const actual = phonemeData[i] || {};
      
      // Check if this should be a Ghunnah sound
      const isGhunnah = ghunnahPatterns.some(pattern => expected.includes(pattern)) &&
                        this.shouldBeGhunnah(expected, expectedPhonemes, i);

      if (isGhunnah) {
        totalGhunnahCount++;
        const actualDuration = actual.endTime && actual.startTime 
          ? actual.endTime - actual.startTime 
          : null;

        // Ghunnah should be slightly longer than normal nasal sounds (1.2-1.5x)
        const expectedGhunnahDuration = (actual.duration || 0.1) * 1.3;

        if (actualDuration !== null) {
          if (actualDuration < expectedGhunnahDuration * 0.8) {
            // Too short - Ghunnah not properly pronounced
            ghunnahIssues.push({
              type: 'ghunnah_too_short',
              phonemeIndex: i,
              expectedPhoneme: expected,
              actualPhoneme: actual.phoneme || expected,
              expectedDuration: expectedGhunnahDuration,
              actualDuration: actualDuration,
              severity: actualDuration < expectedGhunnahDuration * 0.6 ? 'high' : 'medium',
              description: `Ghunnah (nasalization) not properly pronounced: duration too short`
            });
          } else {
            correctGhunnahCount++;
            
            // If audio features available, check frequency range
            if (audioFeatures && audioFeatures[i]) {
              const frequencies = audioFeatures[i].frequencies || [];
              const hasGhunnahFrequency = frequencies.some(freq => 
                freq >= this.ghunnaFrequencyRange.min && 
                freq <= this.ghunnaFrequencyRange.max
              );

              if (!hasGhunnahFrequency) {
                ghunnahIssues.push({
                  type: 'ghunnah_frequency_missing',
                  phonemeIndex: i,
                  severity: 'medium',
                  description: `Ghunnah frequency peak (1-3kHz) not detected`
                });
              }
            }
          }
        } else {
          ghunnahIssues.push({
            type: 'ghunnah_no_timing',
            phonemeIndex: i,
            expectedPhoneme: expected,
            severity: 'low',
            description: 'Ghunnah sound detected but no timing data available'
          });
        }
      }
    }

    const ghunnahAccuracy = totalGhunnahCount > 0
      ? (correctGhunnahCount / totalGhunnahCount) * 100
      : 100;

    return {
      ghunnahAccuracy,
      correctGhunnahCount,
      totalGhunnahCount,
      issues: ghunnahIssues
    };
  }

  /**
   * Check if a phoneme should have Ghunnah based on context
   * @param {string} phoneme - Phoneme to check
   * @param {Array} allPhonemes - All phonemes in sequence
   * @param {number} index - Current index
   * @returns {boolean}
   */
  shouldBeGhunnah(phoneme, allPhonemes, index) {
    // Ghunnah rules:
    // 1. Noon or Meem with shaddah (ّ)
    // 2. Noon followed by certain letters (ي, و, ن, م)
    // 3. Meem followed by certain letters (ب, م)
    
    if (phoneme.includes('n') || phoneme.includes('ن')) {
      const nextPhoneme = allPhonemes[index + 1];
      if (nextPhoneme) {
        const ghunnahLetters = ['j', 'w', 'n', 'm', 'ي', 'و', 'ن', 'م']; // Ya, Waw, Noon, Meem
        return ghunnahLetters.some(letter => nextPhoneme.includes(letter));
      }
    }
    
    if (phoneme.includes('m') || phoneme.includes('م')) {
      const nextPhoneme = allPhonemes[index + 1];
      if (nextPhoneme) {
        const ghunnahLetters = ['b', 'm', 'ب', 'م']; // Ba, Meem
        return ghunnahLetters.some(letter => nextPhoneme.includes(letter));
      }
    }

    return false;
  }

  /**
   * Analyze Waqf (Pause) - Quranic pause marks and fluency
   * @param {Array} segments - Transcript segments with timestamps
   * @param {Array} expectedWords - Expected words with pause marks
   * @param {Array} detectedMistakes - Already detected mistakes
   * @returns {Object} Waqf analysis results
   */
  analyzeWaqf(segments, expectedWords, detectedMistakes = []) {
    console.log(`🔵 [DEBUG] Analyzing Waqf (pauses). Segments: ${segments.length}, Expected words: ${expectedWords.length}, Existing mistakes: ${detectedMistakes.length}`);
    
    const waqfIssues = [];
    let correctWaqfCount = 0;
    let totalWaqfCount = 0;
    let invalidPauseCount = 0;

    // Identify pause points (gaps between segments)
    const pauses = [];
    for (let i = 1; i < segments.length; i++) {
      const gap = segments[i].startTime - segments[i - 1].endTime;
      if (gap > this.waqfPauseThreshold) {
        pauses.push({
          index: i,
          startTime: segments[i - 1].endTime,
          endTime: segments[i].startTime,
          duration: gap,
          wordIndex: i - 1,
          expectedWord: expectedWords[i - 1]?.text || ''
        });
      }
    }

    // Check each pause against expected Waqf marks
    for (const pause of pauses) {
      totalWaqfCount++;
      const expectedWord = expectedWords[pause.wordIndex];
      
      if (!expectedWord) {
        continue;
      }

      // Check if pause is at a valid Waqf mark
      const wordText = expectedWord.text || '';
      const hasValidWaqf = this.waqfMarks.some(mark => wordText.includes(mark)) ||
                          pause.wordIndex === expectedWords.length - 1; // End of verse is valid

      // Also check if pause is at end of ayah (natural break)
      const isEndOfAyah = expectedWord.ayah !== expectedWords[pause.wordIndex + 1]?.ayah;

      if (hasValidWaqf || isEndOfAyah) {
        // Valid pause - check if duration is appropriate
        if (pause.duration > 3.0) {
          // Pause too long even for valid waqf
          waqfIssues.push({
            type: 'waqf_too_long',
            pauseIndex: pause.index,
            wordIndex: pause.wordIndex,
            expectedWord: wordText,
            duration: pause.duration,
            severity: pause.duration > 5.0 ? 'high' : 'medium',
            description: `Valid waqf pause but too long: ${pause.duration.toFixed(2)}s`
          });
        } else {
          correctWaqfCount++;
        }
      } else {
        // Invalid pause - pausing mid-word or at wrong location
        invalidPauseCount++;
        waqfIssues.push({
          type: 'waqf_invalid',
          pauseIndex: pause.index,
          wordIndex: pause.wordIndex,
          expectedWord: wordText,
          duration: pause.duration,
          severity: pause.duration > 2.0 ? 'high' : 'medium',
          description: `Pause at invalid location (no waqf mark): ${wordText}`
        });
      }
    }

    // Check for mid-word pauses (very bad for fluency)
    for (const mistake of detectedMistakes) {
      if (mistake.type === 'pause' && mistake.wordIndex !== undefined) {
        const word = expectedWords[mistake.wordIndex];
        if (word && !word.text.includes(' ') && mistake.timestamp) {
          // Pause within a single word (no space)
          waqfIssues.push({
            type: 'pause_mid_word',
            wordIndex: mistake.wordIndex,
            expectedWord: word.text,
            severity: 'high',
            description: 'Pause detected mid-word (severe fluency error)'
          });
          invalidPauseCount++;
        }
      }
    }

    const waqfAccuracy = totalWaqfCount > 0
      ? (correctWaqfCount / totalWaqfCount) * 100
      : 100; // Perfect if no pauses

    console.log(`🔵 [DEBUG] Waqf analysis: ${correctWaqfCount}/${totalWaqfCount} correct, Accuracy: ${waqfAccuracy.toFixed(1)}%, Invalid: ${invalidPauseCount}, Total pauses: ${pauses.length}`);

    return {
      waqfAccuracy,
      correctWaqfCount,
      totalWaqfCount,
      invalidPauseCount,
      totalPauses: pauses.length,
      issues: waqfIssues
    };
  }

  /**
   * Calculate average tempo (phoneme duration) from audio segments
   * @param {Array} segments - Audio segments with timestamps
   * @returns {number} Average phoneme duration in seconds
   */
  calculateAverageTempo(segments) {
    if (!segments || segments.length === 0) {
      return 0.1; // Default 100ms per phoneme
    }

    let totalDuration = 0;
    let totalPhonemes = 0;

    for (const segment of segments) {
      const duration = segment.endTime - segment.startTime;
      const words = (segment.text || '').split(/\s+/);
      // Rough estimate: 3-5 phonemes per word on average
      const estimatedPhonemes = words.length * 4;
      
      totalDuration += duration;
      totalPhonemes += estimatedPhonemes;
    }

    return totalPhonemes > 0 ? totalDuration / totalPhonemes : 0.1;
  }

  /**
   * Analyze Makhraj (Articulation Point) accuracy
   * Checks if emphatic consonants (حروف مفخمة) are properly pronounced
   * @param {Array} phonemeData - Phoneme-level data
   * @param {Array} expectedPhonemes - Expected phoneme sequence
   * @param {Object} gopAnalysis - GOP analysis results (optional)
   * @returns {Object} Makhraj analysis results
   */
  analyzeMakhraj(phonemeData, expectedPhonemes, gopAnalysis = null) {
    console.log(`🔵 [DEBUG] Analyzing Makhraj (articulation points). Phonemes: ${phonemeData.length}, Expected: ${expectedPhonemes.length}, Has GOP: ${!!gopAnalysis}`);
    
    const makhrajIssues = [];
    let correctMakhrajCount = 0;
    let totalMakhrajCount = 0;

    // Emphatic consonants (حروف مفخمة): ص, ض, ط, ظ
    // These should have emphatic quality (indicated by ˤ in IPA)
    const emphaticConsonants = {
      'ص': 'sˤ',
      'ض': 'dˤ',
      'ط': 'tˤ',
      'ظ': 'zˤ',
      'sˤ': 'sˤ',
      'dˤ': 'dˤ',
      'tˤ': 'tˤ',
      'zˤ': 'zˤ'
    };

    // Regular counterparts (non-emphatic)
    const regularCounterparts = {
      'ص': 's',
      'ض': 'd',
      'ط': 't',
      'ظ': 'z'
    };

    for (let i = 0; i < expectedPhonemes.length; i++) {
      const expected = expectedPhonemes[i];
      const actual = phonemeData[i] || {};
      const actualPhoneme = actual.phoneme || '';

      // Check if expected phoneme is an emphatic consonant
      const isEmphatic = Object.keys(emphaticConsonants).some(key => 
        expected.includes(key) || expected === emphaticConsonants[key]
      );

      if (isEmphatic) {
        totalMakhrajCount++;
        const expectedEmphatic = emphaticConsonants[Object.keys(emphaticConsonants).find(key => 
          expected.includes(key) || expected === emphaticConsonants[key]
        )] || expected;

        // Check if actual phoneme has emphatic quality (ˤ marker)
        const hasEmphaticQuality = actualPhoneme.includes('ˤ') || 
                                   actualPhoneme === expectedEmphatic ||
                                   gopAnalysis?.phonemeScores?.[i]?.isMatch;

        if (!hasEmphaticQuality) {
          // Emphatic consonant not properly pronounced (missing emphasis)
          makhrajIssues.push({
            type: 'makhraj_emphatic_missing',
            phonemeIndex: i,
            expectedPhoneme: expectedEmphatic,
            actualPhoneme: actualPhoneme,
            expectedArabic: Object.keys(emphaticConsonants).find(key => 
              expected.includes(key)
            ) || '',
            severity: 'high',
            description: `Emphatic consonant (${expectedEmphatic}) not properly pronounced - missing emphasis (تخفيف)`
          });
        } else {
          correctMakhrajCount++;
        }

        // Also check for opposite error: regular consonant pronounced as emphatic
        const regular = regularCounterparts[Object.keys(regularCounterparts).find(key => 
          expected.includes(key)
        )];
        
        if (regular && actualPhoneme.includes('ˤ') && !expectedEmphatic.includes('ˤ')) {
          makhrajIssues.push({
            type: 'makhraj_over_emphasis',
            phonemeIndex: i,
            expectedPhoneme: regular,
            actualPhoneme: actualPhoneme,
            severity: 'medium',
            description: `Regular consonant pronounced with unnecessary emphasis`
          });
        }
      }
    }

    // Calculate Makhraj accuracy
    const makhrajAccuracy = totalMakhrajCount > 0
      ? (correctMakhrajCount / totalMakhrajCount) * 100
      : 100; // Perfect if no emphatic consonants

    console.log(`🔵 [DEBUG] Makhraj analysis: ${correctMakhrajCount}/${totalMakhrajCount} correct, Accuracy: ${makhrajAccuracy.toFixed(1)}%, Issues: ${makhrajIssues.length}`);

    return {
      makhrajAccuracy,
      correctMakhrajCount,
      totalMakhrajCount,
      issues: makhrajIssues
    };
  }

  /**
   * Calculate Waqf consistency score
   * Measures how consistently pauses occur at valid Waqf marks
   * @param {Object} waqfAnalysis - Waqf analysis results
   * @returns {number} Waqf consistency score (0-100)
   */
  calculateWaqfConsistency(waqfAnalysis) {
    if (!waqfAnalysis || waqfAnalysis.totalWaqfCount === 0) {
      return 100; // Perfect if no pauses (or no analysis)
    }

    // Consistency = (correct waqf / total pauses) * 100
    // Penalize invalid pauses more heavily
    const consistencyScore = (
      (waqfAnalysis.correctWaqfCount / waqfAnalysis.totalWaqfCount) * 100
    );

    // Apply penalty for invalid pauses
    const invalidPausePenalty = waqfAnalysis.invalidPauseCount * 10; // -10 points per invalid pause
    const finalScore = Math.max(0, consistencyScore - invalidPausePenalty);

    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Comprehensive Tajweed analysis combining all metrics
   * @param {Object} whisperResult - Whisper transcription result
   * @param {Array} expectedWords - Expected words from Quran
   * @param {Array} segments - Audio segments with timestamps
   * @param {Object} gopAnalysis - GOP analysis results
   * @returns {Object} Complete Tajweed analysis
   */
  analyzeTajweed(whisperResult, expectedWords, segments, gopAnalysis = null) {
    // Extract phoneme data from GOP analysis or generate from Whisper
    const phonemeData = gopAnalysis 
      ? gopAnalysis.phonemeData || []
      : this.extractPhonemesFromWhisper(whisperResult, segments);

    const expectedPhonemes = expectedWords.flatMap(word => 
      this.wordToPhonemes(word.text || word)
    );

    // Calculate average tempo
    const averageTempo = this.calculateAverageTempo(segments);

    // Run all analyses
    const maddAnalysis = this.analyzeMadd(phonemeData, expectedPhonemes, averageTempo);
    const ghunnahAnalysis = this.analyzeGhunnah(phonemeData, expectedPhonemes);
    const waqfAnalysis = this.analyzeWaqf(segments, expectedWords, []);
    const makhrajAnalysis = this.analyzeMakhraj(phonemeData, expectedPhonemes, gopAnalysis);

    // Calculate Waqf consistency
    const waqfConsistency = this.calculateWaqfConsistency(waqfAnalysis);

    // Calculate overall Tajweed score (weighted average)
    const weights = {
      madd: 0.25,
      ghunnah: 0.15,
      waqf: 0.15,
      makhraj: 0.15,
      pronunciation: 0.3 // From GOP
    };

    const pronunciationScore = gopAnalysis 
      ? gopAnalysis.overallGOP * 100 
      : 85; // Default if no GOP

    const tajweedScore = (
      maddAnalysis.maddAccuracy * weights.madd +
      ghunnahAnalysis.ghunnahAccuracy * weights.ghunnah +
      waqfAnalysis.waqfAccuracy * weights.waqf +
      makhrajAnalysis.makhrajAccuracy * weights.makhraj +
      pronunciationScore * weights.pronunciation
    );

    console.log(`🔵 [DEBUG] Tajweed score calculation:`, {
      madd: `${maddAnalysis.maddAccuracy.toFixed(1)} × ${weights.madd} = ${(maddAnalysis.maddAccuracy * weights.madd).toFixed(1)}`,
      ghunnah: `${ghunnahAnalysis.ghunnahAccuracy.toFixed(1)} × ${weights.ghunnah} = ${(ghunnahAnalysis.ghunnahAccuracy * weights.ghunnah).toFixed(1)}`,
      waqf: `${waqfAnalysis.waqfAccuracy.toFixed(1)} × ${weights.waqf} = ${(waqfAnalysis.waqfAccuracy * weights.waqf).toFixed(1)}`,
      makhraj: `${makhrajAnalysis.makhrajAccuracy.toFixed(1)} × ${weights.makhraj} = ${(makhrajAnalysis.makhrajAccuracy * weights.makhraj).toFixed(1)}`,
      pronunciation: `${pronunciationScore.toFixed(1)} × ${weights.pronunciation} = ${(pronunciationScore * weights.pronunciation).toFixed(1)}`,
      total: tajweedScore.toFixed(1)
    });

    return {
      tajweedScore: Math.round(tajweedScore * 100) / 100,
      maddAnalysis,
      ghunnahAnalysis,
      waqfAnalysis,
      makhrajAnalysis,
      pronunciationScore,
      waqfConsistency,
      averageTempo,
      totalIssues: [
        ...maddAnalysis.issues,
        ...ghunnahAnalysis.issues,
        ...waqfAnalysis.issues,
        ...makhrajAnalysis.issues
      ]
    };
  }

  /**
   * Extract phonemes from Whisper result (fallback if no GOP)
   * @param {Object} whisperResult - Whisper result
   * @param {Array} segments - Audio segments
   * @returns {Array} Phoneme data
   */
  extractPhonemesFromWhisper(whisperResult, segments) {
    // Basic extraction - can be enhanced
    const phonemeData = [];
    let segmentIndex = 0;

    for (const segment of segments) {
      const words = (segment.text || '').split(/\s+/);
      const wordDuration = (segment.endTime - segment.startTime) / words.length;

      for (let i = 0; i < words.length; i++) {
        const phonemes = this.wordToPhonemes(words[i]);
        const startTime = segment.startTime + (i * wordDuration);
        
        for (let j = 0; j < phonemes.length; j++) {
          const phonemeDuration = wordDuration / phonemes.length;
          phonemeData.push({
            phoneme: phonemes[j],
            startTime: startTime + (j * phonemeDuration),
            endTime: startTime + ((j + 1) * phonemeDuration),
            duration: phonemeDuration
          });
        }
      }
      segmentIndex++;
    }

    return phonemeData;
  }

  /**
   * Convert word to phoneme sequence (basic implementation)
   * @param {string} word - Arabic word
   * @returns {Array} Phoneme sequence
   */
  wordToPhonemes(word) {
    // Use GOP service's phoneme mapping
    return gopService.wordToPhonemes(word);
  }
}

// Export singleton instance
const tajweedAnalysisService = new TajweedAnalysisService();

module.exports = {
  TajweedAnalysisService,
  tajweedAnalysisService
};
