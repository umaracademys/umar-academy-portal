// MongoDB Schemas for Quran Data
const mongoose = require('mongoose');

// Quran Page Layout Schema
const quranPageSchema = new mongoose.Schema({
  page_number: { type: Number, required: true, index: true },
  line_number: { type: Number, required: true },
  line_type: { type: String, enum: ['ayah', 'surah_name', 'basmallah'], required: true },
  is_centered: { type: Boolean, default: false },
  surah_number: { type: Number },
  first_word_id: { type: Number },
  last_word_id: { type: Number },
  mushaf_id: { type: Number, default: 1 }, // For future multi-mushaf support
}, { 
  timestamps: false,
  // Compound index for fast page lookups
  _id: false
});

// Create compound index for efficient queries
quranPageSchema.index({ page_number: 1, line_number: 1 });
quranPageSchema.index({ page_number: 1, surah_number: 1 });
quranPageSchema.index({ surah_number: 1 });

const QuranPage = mongoose.model('QuranPage', quranPageSchema);

// Quran Word Schema
const quranWordSchema = new mongoose.Schema({
  word_id: { type: Number, required: true, index: true }, // Unique word ID across all surahs
  surah: { type: Number, required: true, index: true },
  ayah: { type: Number, required: true, index: true },
  word: { type: Number }, // Word position within ayah
  text: { type: String, required: true },
  version: { type: String, enum: ['nastaleeq', 'v4'], required: true, index: true },
  page_number: { type: Number, index: true }, // Page where this word appears
}, {
  timestamps: false,
  // Compound indexes for efficient queries
  _id: false
});

// Create compound indexes
quranWordSchema.index({ surah: 1, ayah: 1, word: 1 });
quranWordSchema.index({ version: 1, surah: 1, ayah: 1 });
quranWordSchema.index({ version: 1, page_number: 1 });
quranWordSchema.index({ word_id: 1, version: 1 }, { unique: true });

const QuranWord = mongoose.model('QuranWord', quranWordSchema);

// Quran Chapter/Surah Metadata Schema
const quranChapterSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name_simple: { type: String, required: true },
  name_arabic: { type: String, required: true },
  name_complex: { type: String },
  translated_name: {
    name: String,
    language_name: String
  },
  pages: [Number], // Array of page numbers where this surah appears
  verses_count: { type: Number },
}, {
  timestamps: false
});

const QuranChapter = mongoose.model('QuranChapter', quranChapterSchema);

module.exports = {
  QuranPage,
  QuranWord,
  QuranChapter
};

