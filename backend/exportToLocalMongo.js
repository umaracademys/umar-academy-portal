/**
 * Export all data from remote MongoDB and import to local MongoDB
 * 
 * This script:
 * 1. Connects to remote MongoDB (from MONGODB_URI env var)
 * 2. Exports all collections to local MongoDB
 * 3. Makes data available in MongoDB Compass
 * 
 * Usage:
 *   MONGODB_URI="your-remote-connection-string" node backend/exportToLocalMongo.js
 * 
 * Or set MONGODB_URI in .env file
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Remote MongoDB connection (production)
const REMOTE_MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  process.env.REMOTE_MONGODB_URI;

// Local MongoDB connection (for MongoDB Compass)
const LOCAL_MONGODB_URI = process.env.LOCAL_MONGODB_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

if (!REMOTE_MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI or REMOTE_MONGODB_URI must be set');
  console.error('   Set it in .env file or as environment variable');
  console.error('   Example: MONGODB_URI="mongodb+srv://..." node backend/exportToLocalMongo.js');
  process.exit(1);
}

const connectionOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
};

async function exportToLocal() {
  let remoteConnection = null;
  let localConnection = null;

  try {
    console.log('📊 Starting MongoDB data export/import process...\n');
    console.log('🔗 Remote MongoDB:', REMOTE_MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.log('🏠 Local MongoDB:', LOCAL_MONGODB_URI);
    console.log('');

    // Step 1: Connect to remote MongoDB
    console.log('⏳ Step 1: Connecting to remote MongoDB...');
    remoteConnection = await mongoose.createConnection(REMOTE_MONGODB_URI, connectionOptions).asPromise();
    console.log('✅ Connected to remote MongoDB');
    console.log('   Database:', remoteConnection.db.databaseName);
    console.log('   Host:', remoteConnection.host);

    // Step 2: Get all collections from remote
    console.log('\n⏳ Step 2: Listing collections from remote...');
    const remoteDb = remoteConnection.db;
    const collections = await remoteDb.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections:`);
    collections.forEach(col => console.log(`   - ${col.name}`));

    // Step 3: Connect to local MongoDB
    console.log('\n⏳ Step 3: Connecting to local MongoDB...');
    localConnection = await mongoose.createConnection(LOCAL_MONGODB_URI, connectionOptions).asPromise();
    console.log('✅ Connected to local MongoDB');
    console.log('   Database:', localConnection.db.databaseName);
    console.log('   Host:', localConnection.host);

    // Step 4: Export and import each collection
    console.log('\n⏳ Step 4: Exporting and importing collections...');
    const localDb = localConnection.db;
    
    let totalDocuments = 0;
    const results = [];

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      try {
        console.log(`\n   Processing: ${collectionName}...`);
        
        // Get collection from remote
        const remoteCollection = remoteDb.collection(collectionName);
        const count = await remoteCollection.countDocuments();
        
        if (count === 0) {
          console.log(`   ⚠️  Collection ${collectionName} is empty, skipping...`);
          continue;
        }

        console.log(`   📥 Exporting ${count} documents from remote...`);
        
        // Fetch all documents
        const documents = await remoteCollection.find({}).toArray();
        
        // Get or create collection in local
        const localCollection = localDb.collection(collectionName);
        
        // Clear existing data (optional - comment out if you want to keep existing data)
        const existingCount = await localCollection.countDocuments();
        if (existingCount > 0) {
          console.log(`   🗑️  Clearing ${existingCount} existing documents from local...`);
          await localCollection.deleteMany({});
        }
        
        // Insert documents into local
        if (documents.length > 0) {
          console.log(`   📤 Importing ${documents.length} documents to local...`);
          await localCollection.insertMany(documents, { ordered: false });
          totalDocuments += documents.length;
          results.push({ collection: collectionName, count: documents.length, status: 'success' });
          console.log(`   ✅ ${collectionName}: ${documents.length} documents imported`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${collectionName}:`, error.message);
        results.push({ collection: collectionName, count: 0, status: 'error', error: error.message });
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXPORT/IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total collections processed: ${results.length}`);
    console.log(`✅ Total documents imported: ${totalDocuments}`);
    console.log('\n📋 Collection Details:');
    results.forEach(result => {
      if (result.status === 'success') {
        console.log(`   ✅ ${result.collection}: ${result.count} documents`);
      } else {
        console.log(`   ❌ ${result.collection}: Error - ${result.error}`);
      }
    });

    console.log('\n✅ Data export/import completed successfully!');
    console.log(`\n💡 You can now connect MongoDB Compass to:`);
    console.log(`   ${LOCAL_MONGODB_URI}`);
    console.log(`\n📝 Connection string for MongoDB Compass:`);
    console.log(`   mongodb://localhost:27017/umar-academy-portal`);

  } catch (error) {
    console.error('\n❌ Error during export/import:', error);
    console.error('   Message:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    // Close connections
    if (remoteConnection) {
      await remoteConnection.close();
      console.log('\n🔌 Disconnected from remote MongoDB');
    }
    if (localConnection) {
      await localConnection.close();
      console.log('🔌 Disconnected from local MongoDB');
    }
  }
}

// Run the export
exportToLocal()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
