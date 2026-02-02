// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Export MongoDB data using mongodump/mongorestore (faster method)
 * 
 * This script uses mongodump to export from remote and mongorestore to import to local
 * 
 * Usage:
 *   MONGODB_URI="your-remote-connection-string" node backend/exportToLocalMongoWithDump.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Remote MongoDB connection (production)
const REMOTE_MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  process.env.REMOTE_MONGODB_URI;

// Local MongoDB connection (for MongoDB Compass)
const LOCAL_MONGODB_URI = process.env.LOCAL_MONGODB_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

if (!REMOTE_MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI or REMOTE_MONGODB_URI must be set');
  process.exit(1);
}

// Parse connection string to extract database name
function getDatabaseName(uri) {
  const match = uri.match(/\/([^?]+)/);
  return match ? match[1] : 'umar-academy-portal';
}

const remoteDbName = getDatabaseName(REMOTE_MONGODB_URI);
const localDbName = getDatabaseName(LOCAL_MONGODB_URI);

const dumpDir = path.join(__dirname, 'mongo-dump');

async function exportWithDump() {
  try {
    console.log('📊 Starting MongoDB data export using mongodump...\n');
    console.log('🔗 Remote MongoDB:', REMOTE_MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.log('🏠 Local MongoDB:', LOCAL_MONGODB_URI);
    console.log('');

    // Step 1: Create dump directory
    if (fs.existsSync(dumpDir)) {
      console.log('🗑️  Removing existing dump directory...');
      fs.rmSync(dumpDir, { recursive: true, force: true });
    }
    fs.mkdirSync(dumpDir, { recursive: true });
    console.log('✅ Created dump directory:', dumpDir);

    // Step 2: Run mongodump
    console.log('\n⏳ Step 1: Exporting from remote MongoDB (mongodump)...');
    console.log('   This may take a few minutes depending on data size...');
    
    try {
      execSync(`mongodump --uri="${REMOTE_MONGODB_URI}" --out="${dumpDir}"`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('✅ Export completed!');
    } catch (error) {
      console.error('❌ mongodump failed. Make sure mongodump is installed.');
      console.error('   Install: brew install mongodb/brew/mongodb-community-tools (macOS)');
      console.error('   Or use: node backend/exportToLocalMongo.js (Node.js method)');
      throw error;
    }

    // Step 3: Run mongorestore
    console.log('\n⏳ Step 2: Importing to local MongoDB (mongorestore)...');
    
    const dumpPath = path.join(dumpDir, remoteDbName);
    if (!fs.existsSync(dumpPath)) {
      throw new Error(`Dump directory not found: ${dumpPath}`);
    }

    try {
      execSync(`mongorestore --uri="${LOCAL_MONGODB_URI}" --drop "${dumpPath}"`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('✅ Import completed!');
    } catch (error) {
      console.error('❌ mongorestore failed. Make sure mongorestore is installed.');
      throw error;
    }

    // Step 4: Cleanup
    console.log('\n⏳ Step 3: Cleaning up dump files...');
    fs.rmSync(dumpDir, { recursive: true, force: true });
    console.log('✅ Cleanup completed!');

    console.log('\n✅ Data export/import completed successfully!');
    console.log(`\n💡 You can now connect MongoDB Compass to:`);
    console.log(`   ${LOCAL_MONGODB_URI}`);
    console.log(`\n📝 Connection string for MongoDB Compass:`);
    console.log(`   mongodb://localhost:27017/${localDbName}`);

  } catch (error) {
    console.error('\n❌ Error during export/import:', error.message);
    if (fs.existsSync(dumpDir)) {
      console.log('\n💡 Dump files are saved in:', dumpDir);
      console.log('   You can manually restore using:');
      console.log(`   mongorestore --uri="${LOCAL_MONGODB_URI}" "${dumpDir}/${remoteDbName}"`);
    }
    process.exit(1);
  }
}

exportWithDump()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
