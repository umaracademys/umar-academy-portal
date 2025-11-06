// Migration script to import Quran data from qul.tarteel.ai API to MongoDB
// This script can run on Render without requiring local SQLite files
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { QuranPage, QuranWord, QuranChapter } = require('./quranSchemas');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/umar-academy-portal';

// qul.tarteel.ai API credentials (optional - can be set via environment variables)
const QUL_TARTEEL_CLIENT_ID = process.env.QUL_TARTEEL_CLIENT_ID;
const QUL_TARTEEL_CLIENT_SECRET = process.env.QUL_TARTEEL_CLIENT_SECRET;
const QUL_TARTEEL_API_BASE = 'https://qul.tarteel.ai/api';

// Resource ID for QPC v4 layout (tajweed)
const RESOURCE_ID = 19;

/**
 * Get access token from qul.tarteel.ai
 */
async function getQulTarteelToken() {
  if (!QUL_TARTEEL_CLIENT_ID || !QUL_TARTEEL_CLIENT_SECRET) {
    console.warn('⚠️  QUL_TARTEEL_CLIENT_ID and QUL_TARTEEL_CLIENT_SECRET not set');
    return null;
  }

  try {
    const response = await axios.post(`${QUL_TARTEEL_API_BASE}/oauth/token`, {
      client_id: QUL_TARTEEL_CLIENT_ID,
      client_secret: QUL_TARTEEL_CLIENT_SECRET,
      grant_type: 'client_credentials'
    });

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Error getting qul.tarteel.ai token:', error.message);
    return null;
  }
}

/**
 * Download SQLite file from qul.tarteel.ai
 */
async function downloadSqliteFile(token, outputPath) {
  if (!token) {
    console.warn('⚠️  No token available, cannot download SQLite file');
    return false;
  }

  try {
    console.log('📥 Downloading SQLite file from qul.tarteel.ai...');
    const response = await axios({
      method: 'get',
      url: `${QUL_TARTEEL_API_BASE}/resources/mushaf-layout/${RESOURCE_ID}/download?format=sqlite`,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ SQLite file downloaded to ${outputPath}`);
        resolve(true);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Error downloading SQLite file:', error.message);
    return false;
  }
}

/**
 * Fetch page layout data from qul.tarteel.ai API (page by page)
 * Note: This is a fallback method - the API may not support page-by-page fetching
 */
async function fetchPageLayoutFromApi(token, pageNumber) {
  if (!token) {
    return null;
  }

  try {
    // Try different possible endpoints
    const endpoints = [
      `${QUL_TARTEEL_API_BASE}/resources/mushaf-layout/${RESOURCE_ID}/pages/${pageNumber}`,
      `${QUL_TARTEEL_API_BASE}/resources/mushaf-layout/${RESOURCE_ID}?page=${pageNumber}`,
      `${QUL_TARTEEL_API_BASE}/mushaf-layout/${RESOURCE_ID}/pages/${pageNumber}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        });

        if (response.data) {
          return response.data;
        }
      } catch (e) {
        continue; // Try next endpoint
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching page ${pageNumber} from API:`, error.message);
    return null;
  }
}

/**
 * Migrate pages from SQLite file
 */
async function migratePagesFromSqlite(dbPath) {
  console.log('📄 Migrating page layout data from SQLite...');
  
  if (!fs.existsSync(dbPath)) {
    console.warn('⚠️  SQLite file not found:', dbPath);
    return false;
  }

  // Try to use better-sqlite3 if available
  let Database = null;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    console.error('❌ better-sqlite3 not available:', error.message);
    return false;
  }

  const db = new Database(dbPath, { readonly: true });
  
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
    return true;
  } catch (error) {
    console.error('❌ Error migrating pages:', error);
    return false;
  } finally {
    db.close();
  }
}

/**
 * Migrate pages from API (fallback if SQLite download fails)
 */
async function migratePagesFromApi(token) {
  console.log('📄 Migrating page layout data from API...');
  
  if (!token) {
    console.error('❌ No token available for API migration');
    return false;
  }

  try {
    // Clear existing data
    await QuranPage.deleteMany({});
    console.log('   Cleared existing page data');

    // Fetch all 604 pages
    const totalPages = 604;
    const batchSize = 50;
    let totalInserted = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum += batchSize) {
      const pages = [];
      
      // Fetch batch of pages
      for (let i = 0; i < batchSize && (pageNum + i) <= totalPages; i++) {
        const currentPage = pageNum + i;
        console.log(`   Fetching page ${currentPage}/${totalPages}...`);
        
        const pageData = await fetchPageLayoutFromApi(token, currentPage);
        if (pageData && pageData.lines) {
          // Transform API response to our schema
          pageData.lines.forEach(line => {
            pages.push({
              page_number: currentPage,
              line_number: line.line_number || line.lineNumber,
              line_type: line.line_type || line.lineType || 'ayah',
              is_centered: line.is_centered || line.isCentered || false,
              surah_number: line.surah_number || line.surahNumber || null,
              first_word_id: line.first_word_id || line.firstWordId || null,
              last_word_id: line.last_word_id || line.lastWordId || null,
              mushaf_id: 1
            });
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Insert batch
      if (pages.length > 0) {
        await QuranPage.insertMany(pages);
        totalInserted += pages.length;
        console.log(`   Inserted ${pages.length} lines (total: ${totalInserted})`);
      }
    }

    console.log('✅ Page layout migration complete');
    return true;
  } catch (error) {
    console.error('❌ Error migrating pages from API:', error);
    return false;
  }
}

/**
 * Main migration function
 */
async function main() {
  try {
    console.log('🔄 Starting Quran data migration from API...');
    console.log(`📊 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Try to get token
    const token = await getQulTarteelToken();
    
    // Strategy 1: Try to download SQLite file and migrate from it
    if (token) {
      const tempDbPath = path.join(__dirname, 'temp-qpc-v4-layout.db');
      const downloaded = await downloadSqliteFile(token, tempDbPath);
      
      if (downloaded) {
        const migrated = await migratePagesFromSqlite(tempDbPath);
        if (migrated) {
          // Clean up temp file
          try {
            fs.unlinkSync(tempDbPath);
            console.log('🧹 Cleaned up temporary SQLite file');
          } catch (e) {
            console.warn('⚠️  Could not delete temp file:', e.message);
          }
          
          // Migration complete
          await printSummary();
          process.exit(0);
        }
      }
      
      // Strategy 2: Fallback to API page-by-page migration
      console.log('📡 Falling back to API page-by-page migration...');
      const apiMigrated = await migratePagesFromApi(token);
      if (apiMigrated) {
        await printSummary();
        process.exit(0);
      }
    }
    
    // If both strategies failed, provide instructions
    console.error('\n❌ Migration failed:');
    console.error('   - Could not download SQLite file');
    console.error('   - Could not migrate from API');
    console.error('\n💡 Solutions:');
    console.error('   1. Set QUL_TARTEEL_CLIENT_ID and QUL_TARTEEL_CLIENT_SECRET environment variables');
    console.error('   2. Or manually download the SQLite file and place it in the backend directory');
    console.error('   3. Or use the local migration script (migrateSqliteToMongo.js) with local SQLite files');
    
    process.exit(1);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Print migration summary
 */
async function printSummary() {
  console.log('\n✅ Migration complete!');
  console.log('📊 Summary:');
  const pageCount = await QuranPage.countDocuments();
  console.log(`   - Pages: ${pageCount}`);
  
  // Note: Word data migration is not included in this script
  // Words should be migrated separately using the local SQLite files
  // or fetched from word_by_word.json
}

if (require.main === module) {
  main();
}

module.exports = { migratePagesFromSqlite, migratePagesFromApi };

