// Migration script to import SQLite Quran data to MongoDB
const mongoose = require('mongoose');
const Database = require('better-sqlite3');
const path = require('path');
const { QuranPage, QuranWord, QuranChapter } = require('./quranSchemas');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Paths to SQLite databases
const quranDbPath = path.join(__dirname, 'qpc-hafs-15-lines.db');
const nastaleeqDbPath = path.join(__dirname, 'qpc-nastaleeq.db');
const qpcV4DbPath = path.join(__dirname, 'qpc-v4.db');

async function migratePages() {
  console.log('📄 Migrating page layout data...');
  
  if (!require('fs').existsSync(quranDbPath)) {
    console.warn('⚠️  Page layout database not found:', quranDbPath);
    return;
  }

  const db = new Database(quranDbPath, { readonly: true });
  
  try {
    // Get all pages
    const pages = db.prepare('SELECT * FROM pages ORDER BY page_number, line_number').all();
    console.log(`   Found ${pages.length} page records`);
    
    // Clear existing data
    await QuranPage.deleteMany({});
    console.log('   Cleared existing page data');
    
    // Insert in batches
    const batchSize = 1000;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize).map(page => ({
        page_number: page.page_number,
        line_number: page.line_number,
        line_type: page.line_type || 'ayah',
        is_centered: page.is_centered === 1 || page.is_centered === true,
        surah_number: page.surah_number || null,
        first_word_id: page.first_word_id || null,
        last_word_id: page.last_word_id || null,
        mushaf_id: 1
      }));
      
      await QuranPage.insertMany(batch);
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batchSize, pages.length)}/${pages.length})`);
    }
    
    console.log('✅ Page layout migration complete');
  } catch (error) {
    console.error('❌ Error migrating pages:', error);
    throw error;
  } finally {
    db.close();
  }
}

async function migrateWords(dbPath, version) {
  console.log(`📝 Migrating word data (${version})...`);
  
  if (!require('fs').existsSync(dbPath)) {
    console.warn(`⚠️  Word database not found: ${dbPath}`);
    return;
  }

  const db = new Database(dbPath, { readonly: true });
  
  try {
    // Get all words
    const words = db.prepare('SELECT * FROM words ORDER BY CAST(surah AS INTEGER), CAST(ayah AS INTEGER), CAST(word AS INTEGER)').all();
    console.log(`   Found ${words.length} word records`);
    
    // Clear existing data for this version
    await QuranWord.deleteMany({ version });
    console.log(`   Cleared existing word data for ${version}`);
    
    // Get page numbers for words (we'll need to calculate or fetch from pages)
    // For now, we'll set page_number to null and update it later if needed
    
    // Insert in batches
    const batchSize = 1000;
    
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize).map((word) => ({
        word_id: parseInt(word.id) || parseInt(word.word_id) || 0, // Use id from SQLite as word_id
        surah: parseInt(word.surah) || parseInt(word.location?.split(':')[0]) || 0,
        ayah: parseInt(word.ayah) || parseInt(word.location?.split(':')[1]) || 0,
        word: parseInt(word.word) || 0,
        text: word.text || '',
        version: version,
        page_number: null // Will be calculated later if needed
      }));
      
      await QuranWord.insertMany(batch);
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batchSize, words.length)}/${words.length})`);
    }
    
    console.log(`✅ Word data migration complete for ${version}`);
  } catch (error) {
    console.error(`❌ Error migrating words (${version}):`, error);
    throw error;
  } finally {
    db.close();
  }
}

async function updatePageNumbers() {
  console.log('🔗 Updating page numbers for words...');
  
  try {
    // Get all pages with ayah lines
    const pages = await QuranPage.find({ 
      line_type: 'ayah',
      surah_number: { $ne: null },
      first_word_id: { $ne: null },
      last_word_id: { $ne: null }
    }).sort({ page_number: 1, line_number: 1 }).lean();
    
    console.log(`   Found ${pages.length} ayah lines with word IDs`);
    
    // Update words based on word_id ranges
    let updatedCount = 0;
    for (const page of pages) {
      const result = await QuranWord.updateMany(
        { 
          word_id: { $gte: page.first_word_id, $lte: page.last_word_id },
          page_number: null 
        },
        { $set: { page_number: page.page_number } }
      );
      updatedCount += result.modifiedCount;
    }
    
    console.log(`   Updated ${updatedCount} words with page numbers`);
    console.log('✅ Page numbers updated');
  } catch (error) {
    console.error('❌ Error updating page numbers:', error);
  }
}

async function main() {
  try {
    console.log('🔄 Starting SQLite to MongoDB migration...');
    console.log(`📊 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Migrate page layout data
    await migratePages();
    
    // Migrate word data for both versions
    await migrateWords(nastaleeqDbPath, 'nastaleeq');
    await migrateWords(qpcV4DbPath, 'v4');
    
    // Update page numbers for words
    await updatePageNumbers();
    
    console.log('\n✅ Migration complete!');
    console.log('📊 Summary:');
    const pageCount = await QuranPage.countDocuments();
    const wordCountNastaleeq = await QuranWord.countDocuments({ version: 'nastaleeq' });
    const wordCountV4 = await QuranWord.countDocuments({ version: 'v4' });
    console.log(`   - Pages: ${pageCount}`);
    console.log(`   - Words (nastaleeq): ${wordCountNastaleeq}`);
    console.log(`   - Words (v4): ${wordCountV4}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migratePages, migrateWords, updatePageNumbers };

