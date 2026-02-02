// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


// Script to populate MongoDB from SQLite database in public/data/layouts/
const mongoose = require('mongoose');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { QuranPage, QuranWord } = require('../../quranSchemas');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// Path to SQLite database in public folder
const publicDbPath = path.join(__dirname, '..', '..', 'public', 'data', 'layouts', 'qpc-v1-15-lines.db');
const wordsDbPath = path.join(__dirname, '..', '..', 'public', 'data', 'glyphs', 'qpc-v1-glyph-codes-wbw.db');

async function migratePages() {
  console.log('📄 Migrating page layout data from public SQLite database...');
  
  if (!fs.existsSync(publicDbPath)) {
    console.error('❌ SQLite database not found:', publicDbPath);
    console.log('💡 Make sure the file exists at:', publicDbPath);
    return false;
  }

  console.log('✅ Found SQLite database at:', publicDbPath);
  const db = new Database(publicDbPath, { readonly: true });
  
  try {
    // Get all pages
    const pages = db.prepare('SELECT * FROM pages ORDER BY page_number, line_number').all();
    console.log(`   Found ${pages.length} page records`);
    
    if (pages.length === 0) {
      console.warn('⚠️  No pages found in database');
      return false;
    }
    
    // Clear existing data
    await QuranPage.deleteMany({});
    console.log('   Cleared existing page data in MongoDB');
    
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
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batchSize, pages.length)}/${pages.length} pages)`);
    }
    
    console.log('✅ Page layout migration complete');
    return true;
  } catch (error) {
    console.error('❌ Error migrating pages:', error);
    return false;
  } finally {
    db.close();
  }
}

async function migrateWords() {
  console.log('📝 Migrating word data from public SQLite database...');
  
  if (!fs.existsSync(wordsDbPath)) {
    console.warn('⚠️  Word database not found:', wordsDbPath);
    console.log('💡 Skipping word migration - words will load from JSON file');
    return false;
  }

  console.log('✅ Found word database at:', wordsDbPath);
  const db = new Database(wordsDbPath, { readonly: true });
  
  try {
    // Get all words
    const words = db.prepare('SELECT * FROM words ORDER BY id').all();
    console.log(`   Found ${words.length} word records`);
    
    if (words.length === 0) {
      console.warn('⚠️  No words found in database');
      return false;
    }
    
    // Clear existing v4 word data
    await QuranWord.deleteMany({ version: 'v4' });
    console.log('   Cleared existing word data for v4 in MongoDB');
    
    // Insert in batches
    const batchSize = 1000;
    
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize).map((word) => ({
        word_id: parseInt(word.id) || 0,
        surah: parseInt(word.surah) || 0,
        ayah: parseInt(word.ayah) || 0,
        word: parseInt(word.word) || 0,
        text: word.text || '',
        version: 'v4',
        page_number: null // Will be calculated from page layout if needed
      }));
      
      await QuranWord.insertMany(batch);
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batchSize, words.length)}/${words.length} words)`);
    }
    
    console.log('✅ Word data migration complete for v4');
    return true;
  } catch (error) {
    console.error('❌ Error migrating words:', error);
    return false;
  } finally {
    db.close();
  }
}

async function main() {
  try {
    console.log('🔄 Starting MongoDB population from public SQLite database...');
    console.log(`📊 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Migrate page layout data
    const pagesMigrated = await migratePages();
    
    // Migrate word data (optional - words can also load from JSON)
    const wordsMigrated = await migrateWords();
    
    console.log('\n✅ Migration complete!');
    console.log('📊 Summary:');
    const pageCount = await QuranPage.countDocuments();
    const wordCountV4 = await QuranWord.countDocuments({ version: 'v4' });
    console.log(`   - Pages: ${pageCount}`);
    console.log(`   - Words (v4): ${wordCountV4}`);
    
    if (pagesMigrated) {
      console.log('\n✅ MongoDB is now populated with page layout data!');
      console.log('💡 The mushaf will now load from MongoDB.');
    } else {
      console.log('\n⚠️  Page migration failed - check the errors above');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migratePages, migrateWords };

