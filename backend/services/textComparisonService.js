/**
 * Text Comparison Service
 * Compares transcribed Arabic text with expected Mushaf text
 * Detects mistakes: skipped, repeated, incorrect words, tajweed issues
 * Now includes GOP (Goodness of Pronunciation) analysis
 */

const { gopService } = require('./gopService');

class TextComparisonService {
  /**
   * Compare transcribed text with expected Mushaf text
   */
  async compareText(transcript, expectedWords, surahNumber, startAyah, endAyah) {
    const mistakes = [];
    const transcriptWords = this.tokenizeArabic(transcript);
    const expectedWordTexts = expectedWords.map(w => w.text);
    
    let transcriptIndex = 0;
    let expectedIndex = 0;
    let wordsCorrect = 0;
    let wordsSkipped = 0;
    let wordsRepeated = 0;
    let wordsIncorrect = 0;

    while (expectedIndex < expectedWordTexts.length) {
      const expectedWord = expectedWordTexts[expectedIndex];
      const expectedWordData = expectedWords[expectedIndex];

      if (transcriptIndex >= transcriptWords.length) {
        // End of transcript - remaining words are skipped
        mistakes.push({
          type: 'skipped',
          wordIndex: expectedWordData.wordIndex,
          surah: expectedWordData.surah,
          ayah: expectedWordData.ayah,
          page: expectedWordData.page,
          detectedText: '',
          expectedText: expectedWord,
          timestamp: null,
          confidence: 1.0
        });
        wordsSkipped++;
        expectedIndex++;
        continue;
      }

      const transcriptWord = transcriptWords[transcriptIndex];
      const similarity = this.calculateSimilarity(transcriptWord, expectedWord);

      if (similarity >= 0.8) {
        // Word matches (with some tolerance for diacritics)
        wordsCorrect++;
        transcriptIndex++;
        expectedIndex++;
      } else if (transcriptIndex + 1 < transcriptWords.length) {
        // Check if next word matches (student might have skipped this word)
        const nextTranscriptWord = transcriptWords[transcriptIndex + 1];
        const nextSimilarity = this.calculateSimilarity(nextTranscriptWord, expectedWord);

        if (nextSimilarity >= 0.8) {
          // Current word was skipped
          mistakes.push({
            type: 'skipped',
            wordIndex: expectedWordData.wordIndex,
            surah: expectedWordData.surah,
            ayah: expectedWordData.ayah,
            page: expectedWordData.page,
            detectedText: '',
            expectedText: expectedWord,
            timestamp: null,
            confidence: 0.9
          });
          wordsSkipped++;
          expectedIndex++;
          // Don't advance transcriptIndex - next word will be checked
        } else if (this.calculateSimilarity(transcriptWord, expectedWord) < 0.5) {
          // Word is incorrect
          mistakes.push({
            type: 'incorrect',
            wordIndex: expectedWordData.wordIndex,
            surah: expectedWordData.surah,
            ayah: expectedWordData.ayah,
            page: expectedWordData.page,
            detectedText: transcriptWord,
            expectedText: expectedWord,
            timestamp: null,
            confidence: 0.8
          });
          wordsIncorrect++;
          transcriptIndex++;
          expectedIndex++;
        } else {
          // Partial match - might be tajweed issue
          mistakes.push({
            type: 'tajweed',
            wordIndex: expectedWordData.wordIndex,
            surah: expectedWordData.surah,
            ayah: expectedWordData.ayah,
            page: expectedWordData.page,
            detectedText: transcriptWord,
            expectedText: expectedWord,
            timestamp: null,
            confidence: 0.7,
            tajweedRule: this.detectTajweedRule(transcriptWord, expectedWord)
          });
          wordsIncorrect++;
          transcriptIndex++;
          expectedIndex++;
        }
      } else {
        // Last word - check if it matches
        if (similarity < 0.8) {
          mistakes.push({
            type: 'incorrect',
            wordIndex: expectedWordData.wordIndex,
            surah: expectedWordData.surah,
            ayah: expectedWordData.ayah,
            page: expectedWordData.page,
            detectedText: transcriptWord,
            expectedText: expectedWord,
            timestamp: null,
            confidence: 0.8
          });
          wordsIncorrect++;
        } else {
          wordsCorrect++;
        }
        transcriptIndex++;
        expectedIndex++;
      }
    }

    // Check for repeated words (words in transcript that don't match expected)
    if (transcriptIndex < transcriptWords.length) {
      const remainingWords = transcriptWords.slice(transcriptIndex);
      remainingWords.forEach((word, idx) => {
        mistakes.push({
          type: 'repeated',
          wordIndex: expectedWords[expectedWords.length - 1].wordIndex,
          surah: expectedWords[expectedWords.length - 1].surah,
          ayah: expectedWords[expectedWords.length - 1].ayah,
          page: expectedWords[expectedWords.length - 1].page,
          detectedText: word,
          expectedText: '',
          timestamp: null,
          confidence: 0.7
        });
        wordsRepeated++;
      });
    }

    return {
      mistakes,
      metrics: {
        totalWords: expectedWords.length,
        wordsSpoken: transcriptWords.length,
        wordsCorrect,
        wordsSkipped,
        wordsRepeated,
        wordsIncorrect,
        fluencyPercentage: (wordsCorrect / expectedWords.length) * 100
      }
    };
  }

  /**
   * Tokenize Arabic text into words
   */
  tokenizeArabic(text) {
    if (!text || typeof text !== 'string') return [];
    // Remove diacritics for comparison (optional - can keep for tajweed)
    const normalized = text.replace(/[\u064B-\u065F\u0670]/g, ''); // Remove diacritics
    return normalized.split(/\s+/).filter(word => word.length > 0);
  }

  /**
   * Calculate similarity between two Arabic words
   * Uses Levenshtein distance with Arabic-specific normalization
   */
  calculateSimilarity(word1, word2) {
    if (!word1 || !word2) return 0;
    
    // Normalize Arabic text (remove diacritics, normalize forms)
    const normalize = (text) => {
      return text
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove diacritics
        .replace(/\u0640/g, '') // Remove tatweel
        .trim();
    };

    const norm1 = normalize(word1);
    const norm2 = normalize(word2);

    if (norm1 === norm2) return 1.0;

    // Levenshtein distance
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1 - (distance / maxLength);
  }

  /**
   * Levenshtein distance algorithm
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  /**
   * Detect tajweed rule violation (basic heuristics)
   */
  detectTajweedRule(detected, expected) {
    if (!detected || !expected) return 'unknown';
    
    // Basic heuristics - can be enhanced with ML
    if (detected.length < expected.length) {
      return 'madd'; // Possible madd issue (shortened elongation)
    }
    if (detected.includes('ن') && expected.includes('ن')) {
      return 'ghunna'; // Possible ghunna issue
    }
    if (detected.includes('م') && expected.includes('م')) {
      return 'ghunna'; // Possible ghunna issue
    }
    return 'unknown';
  }

  /**
   * Calculate fluency metrics from transcript segments
   */
  calculateFluencyMetrics(segments, totalDurationParam) {
    if (!segments || segments.length === 0) {
      return {
        pauseCount: 0,
        totalPauseTime: 0,
        averagePauseDuration: 0,
        wordsPerMinute: 0
      };
    }

    let pauseCount = 0;
    let totalPauseTime = 0;
    const pauseThreshold = 1.0; // 1 second pause threshold

    for (let i = 1; i < segments.length; i++) {
      const gap = segments[i].startTime - segments[i - 1].endTime;
      if (gap > pauseThreshold) {
        pauseCount++;
        totalPauseTime += gap;
      }
    }

    let totalWords = 0;
    let calculatedDuration = 0;

    segments.forEach(seg => {
      const words = seg.text ? seg.text.split(/\s+/).length : 0;
      const duration = seg.endTime - seg.startTime;
      totalWords += words;
      calculatedDuration += duration;
    });

    // Use provided duration if available, otherwise use calculated
    const totalDuration = totalDurationParam || calculatedDuration;
    const wordsPerMinute = totalDuration > 0 ? (totalWords / totalDuration) * 60 : 0;

    return {
      pauseCount,
      totalPauseTime,
      averagePauseDuration: pauseCount > 0 ? totalPauseTime / pauseCount : 0,
      wordsPerMinute: wordsPerMinute || 0
    };
  }

  /**
   * Compare transcripts with GOP (Goodness of Pronunciation) analysis
   * Enhanced version that includes phoneme-level pronunciation analysis
   * 
   * @param {Array} expectedWords - Expected words from Quran
   * @param {Array} transcribedWords - Transcribed words
   * @param {Object} whisperResult - Whisper transcription result (optional, for GOP)
   * @param {Array} wordsWithTimestamps - Words with timestamps (optional, for vowel length analysis)
   * @returns {Object} Comparison result with GOP metrics
   */
  async compareTranscriptsWithGOP(expectedWords, transcribedWords, whisperResult = null, wordsWithTimestamps = []) {
    console.log(`🔵 [DEBUG] compareTranscriptsWithGOP: ${expectedWords.length} expected, ${transcribedWords.length} transcribed, Has Whisper: ${!!whisperResult}`);
    
    // First do standard comparison
    const transcriptText = Array.isArray(transcribedWords) 
      ? transcribedWords.join(' ') 
      : transcribedWords;
    
    console.log(`🔵 [DEBUG] Running standard text comparison...`);
    const standardComparison = await this.compareText(
      transcriptText,
      expectedWords,
      null, // surahNumber
      null, // startAyah
      null  // endAyah
    );
    
    console.log(`🔵 [DEBUG] Standard comparison: ${standardComparison.mistakes.length} mistakes, ${standardComparison.metrics.wordsCorrect} correct`);

    // Add GOP analysis if Whisper result is available
    let gopAnalysis = null;
    if (whisperResult && whisperResult.text) {
      try {
        console.log(`🔵 [DEBUG] Running GOP analysis...`);
        gopAnalysis = gopService.analyzeRecitationGOP(
          whisperResult,
          expectedWords.map(w => w.text || w),
          wordsWithTimestamps
        );
        
        console.log(`🔵 [DEBUG] GOP analysis complete:`, {
          overallGOP: gopAnalysis.overallGOP,
          pronunciationQuality: gopAnalysis.overallGOP * 100,
          wordsWithIssues: gopAnalysis.wordsWithIssues,
          totalIssues: gopAnalysis.pronunciationIssues.length
        });

        // Add pronunciation issues as tajweed mistakes
        if (gopAnalysis.pronunciationIssues && gopAnalysis.pronunciationIssues.length > 0) {
          console.log(`🔵 [DEBUG] Adding ${gopAnalysis.pronunciationIssues.length} pronunciation issues as tajweed mistakes...`);
          for (const issue of gopAnalysis.pronunciationIssues) {
            const wordIndex = issue.wordIndex || 0;
            const expectedWord = expectedWords[wordIndex];
            
            if (expectedWord) {
              standardComparison.mistakes.push({
                type: 'tajweed',
                wordIndex: expectedWord.wordIndex || wordIndex,
                surah: expectedWord.surah,
                ayah: expectedWord.ayah,
                page: expectedWord.page,
                detectedText: issue.word || transcribedWords[wordIndex] || '',
                expectedText: expectedWords[wordIndex]?.text || '',
                timestamp: issue.timestamp || 0,
                confidence: 0.7,
                tajweedRule: issue.type,
                gopScore: issue.gopScore || 0,
                severity: issue.severity || 'medium',
                pronunciationIssue: issue.description || `Pronunciation issue: ${issue.type}`
              });
            }
          }
          console.log(`✅ [DEBUG] Added ${gopAnalysis.pronunciationIssues.length} pronunciation issues to mistakes`);
        } else {
          console.log(`🔵 [DEBUG] No pronunciation issues detected by GOP`);
        }
      } catch (gopError) {
        console.warn('GOP analysis failed:', gopError);
        // Continue without GOP if analysis fails
      }
    }

    // Update metrics with GOP data
    const metrics = {
      ...standardComparison.metrics,
      pronunciationQuality: gopAnalysis ? gopAnalysis.overallGOP * 100 : null,
      overallGOP: gopAnalysis ? gopAnalysis.overallGOP : null,
      wordsWithPronunciationIssues: gopAnalysis ? gopAnalysis.wordsWithIssues : 0,
      totalPronunciationIssues: gopAnalysis ? (gopAnalysis.pronunciationIssues?.length || 0) : 0,
      pronunciationIssuesByType: gopAnalysis ? gopAnalysis.issuesByType : null
    };

    return {
      ...standardComparison,
      metrics,
      gopAnalysis
    };
  }
}

module.exports = new TextComparisonService();
