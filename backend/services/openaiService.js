/**
 * OpenAI Service
 * Provides AI-powered features for the recitation monitoring system
 * Features: Enhanced suggestions, AI-powered summarization, error analysis
 */

const axios = require('axios');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    this.enabled = !!this.apiKey;
    
    if (this.enabled) {
      console.log('✅ OpenAI service enabled');
    } else {
      console.warn('⚠️ OpenAI service disabled (OPENAI_API_KEY not set)');
    }
  }

  /**
   * Check if OpenAI is available
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Generate AI-powered suggestions for student improvement
   * @param {string} context - Context about the student's recitation
   * @param {Array} mistakes - Array of mistakes detected
   * @returns {Promise<Array<string>>} Array of improvement suggestions
   */
  async generateSuggestions(context, mistakes = []) {
    if (!this.enabled) {
      return [];
    }

    try {
      const mistakesSummary = mistakes
        .slice(0, 10) // Limit to first 10 mistakes
        .map(m => `- ${m.type}: ${m.expectedText || 'N/A'}`)
        .join('\n');

      const prompt = `You are an expert Quran recitation teacher. Based on the following recitation analysis, provide 3-5 specific, actionable suggestions for improvement in Arabic and English.

Context: ${context || 'General recitation practice'}

Mistakes detected:
${mistakesSummary || 'No specific mistakes detected'}

Provide suggestions that are:
1. Specific and actionable
2. Focused on Tajweed and pronunciation
3. Encouraging and constructive
4. In both Arabic and English

Format as a numbered list.`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-4o-mini', // Cost-effective model
          messages: [
            {
              role: 'system',
              content: 'You are an expert Quran recitation teacher specializing in Tajweed and Arabic pronunciation. Provide clear, actionable feedback.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      const suggestions = response.data.choices[0]?.message?.content || '';
      return suggestions.split('\n').filter(line => line.trim().length > 0);

    } catch (error) {
      console.error('❌ OpenAI suggestion generation error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Generate AI-powered summary of recitation session
   * @param {Object} sessionData - Recitation session data
   * @returns {Promise<string>} AI-generated summary
   */
  async generateSummary(sessionData) {
    if (!this.enabled) {
      return null;
    }

    try {
      const {
        transcript,
        metrics,
        mistakes = []
      } = sessionData;

      const prompt = `Summarize this Quran recitation session in Arabic and English.

Transcript: ${transcript || 'N/A'}
Fluency: ${metrics?.fluencyPercentage || 0}%
Words per minute: ${metrics?.wordsPerMinute || 0}
Total mistakes: ${mistakes.length}

Mistakes breakdown:
- Skipped: ${mistakes.filter(m => m.type === 'skipped').length}
- Incorrect: ${mistakes.filter(m => m.type === 'incorrect').length}
- Tajweed: ${mistakes.filter(m => m.type === 'tajweed').length}
- Repeated: ${mistakes.filter(m => m.type === 'repeated').length}

Provide a concise, professional summary (2-3 sentences) highlighting:
1. Overall performance
2. Key areas for improvement
3. Positive aspects

Format in both Arabic and English.`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert Quran recitation teacher. Provide clear, professional summaries of recitation sessions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data.choices[0]?.message?.content || null;

    } catch (error) {
      console.error('❌ OpenAI summary generation error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Analyze pronunciation errors and provide detailed feedback
   * @param {Array} mistakes - Array of detected mistakes
   * @param {string} transcript - Transcribed text
   * @returns {Promise<Object>} Detailed error analysis
   */
  async analyzeErrors(mistakes, transcript) {
    if (!this.enabled) {
      return null;
    }

    try {
      const mistakesSummary = mistakes
        .slice(0, 20) // Limit to first 20 mistakes
        .map((m, idx) => `${idx + 1}. ${m.type}: Expected "${m.expectedText}", Detected "${m.detectedText || 'N/A'}"`)
        .join('\n');

      const prompt = `Analyze these Quran recitation errors and provide detailed feedback.

Transcript: ${transcript || 'N/A'}

Errors detected:
${mistakesSummary || 'No errors detected'}

Provide:
1. Pattern analysis (common error types)
2. Root cause suggestions
3. Specific Tajweed rule violations
4. Practice recommendations

Format as structured feedback in Arabic and English.`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert in Arabic phonetics and Tajweed rules. Provide detailed, technical analysis of pronunciation errors.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 600,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return {
        analysis: response.data.choices[0]?.message?.content || null,
        patterns: this.extractPatterns(mistakes),
        recommendations: []
      };

    } catch (error) {
      console.error('❌ OpenAI error analysis error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Extract error patterns from mistakes
   * @param {Array} mistakes - Array of mistakes
   * @returns {Object} Pattern analysis
   */
  extractPatterns(mistakes) {
    const patterns = {
      skipped: mistakes.filter(m => m.type === 'skipped').length,
      incorrect: mistakes.filter(m => m.type === 'incorrect').length,
      tajweed: mistakes.filter(m => m.type === 'tajweed').length,
      repeated: mistakes.filter(m => m.type === 'repeated').length,
      pause: mistakes.filter(m => m.type === 'pause').length
    };

    return patterns;
  }
}

module.exports = new OpenAIService();
