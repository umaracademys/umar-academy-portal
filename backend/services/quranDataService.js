/**
 * Quran Data Service
 * Fetches expected text and words from Mushaf database
 */

const { QuranWord } = require('../quranSchemas');

/**
 * Get expected words for a recitation range
 */
async function getQuranWords(surahNumber, startAyah, endAyah) {
  try {
    const words = await QuranWord.find({
      surah: surahNumber,
      ayah: { $gte: startAyah, $lte: endAyah }
    }).sort({ ayah: 1, word: 1 });

    return words.map(word => ({
      wordIndex: word.word_id,
      surah: word.surah,
      ayah: word.ayah,
      text: word.text,
      page: word.page_number || null
    }));
  } catch (error) {
    console.error('Error fetching Quran words:', error);
    throw error;
  }
}

/**
 * Get expected text as a single string
 */
async function getExpectedText(surahNumber, startAyah, endAyah) {
  try {
    const words = await getQuranWords(surahNumber, startAyah, endAyah);
    if (!words || words.length === 0) {
      return '';
    }
    return words.map(w => w.text).join(' ');
  } catch (error) {
    console.error('Error fetching expected text:', error);
    return '';
  }
}

module.exports = {
  getQuranWords,
  getExpectedText
};
