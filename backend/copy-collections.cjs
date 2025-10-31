const mongoose = require('mongoose');

// Source database (Atlas)
const sourceUri = 'mongodb+srv://umaracademys_db_user:GPaWHPbBwcC7K434@uaportal25.xuz62jo.mongodb.net/ua_portal';
// Target database (local)
const targetUri = 'mongodb://localhost:5175/umar-academy-portal';

const run = async () => {
  try {
    console.log('🔄 Copying additional collections from Atlas...');
    
    // Connect to source database (Atlas)
    await mongoose.connect(sourceUri);
    console.log('✅ Connected to source database (Atlas)');
    
    const sourceDb = mongoose.connection.db;
    
    // Collections to copy (excluding users which we already handled)
    const collectionsToCopy = [
      'students',
      'teachers', 
      'courses',
      'assignments',
      'payments',
      'attendances',
      'assessments'
    ];
    
    // Disconnect from source and connect to target
    await mongoose.disconnect();
    await mongoose.connect(targetUri);
    console.log('✅ Connected to target database (local)');
    
    const targetDb = mongoose.connection.db;
    
    let totalDocuments = 0;
    
    for (const collectionName of collectionsToCopy) {
      try {
        console.log(`\n📋 Processing collection: ${collectionName}`);
        
        // Connect back to source to get data
        await mongoose.disconnect();
        await mongoose.connect(sourceUri);
        const sourceDb = mongoose.connection.db;
        
        // Get documents from source collection
        const documents = await sourceDb.collection(collectionName).find({}).toArray();
        console.log(`  Found ${documents.length} documents in ${collectionName}`);
        
        if (documents.length === 0) {
          console.log(`  ⏭️  Skipping empty collection: ${collectionName}`);
          continue;
        }
        
        // Connect to target to insert data
        await mongoose.disconnect();
        await mongoose.connect(targetUri);
        const targetDb = mongoose.connection.db;
        
        // Clear existing data in target collection
        await targetDb.collection(collectionName).deleteMany({});
        console.log(`  🗑️  Cleared existing ${collectionName} data`);
        
        // Insert documents into target collection
        if (documents.length > 0) {
          await targetDb.collection(collectionName).insertMany(documents);
          console.log(`  ✅ Copied ${documents.length} documents to ${collectionName}`);
          totalDocuments += documents.length;
        }
        
        // Show sample document
        if (documents.length > 0) {
          console.log(`  📄 Sample document:`, JSON.stringify(documents[0], null, 2).substring(0, 200) + '...');
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ${collectionName}:`, error.message);
      }
    }
    
    console.log('\n📊 Collection Copy Summary:');
    console.log(`✅ Total documents copied: ${totalDocuments}`);
    
    // Show final collection counts
    console.log('\n📈 Final Collection Counts:');
    const collections = await targetDb.listCollections().toArray();
    for (const collection of collections) {
      const count = await targetDb.collection(collection.name).countDocuments();
      console.log(`${collection.name}: ${count} documents`);
    }
    
    await mongoose.disconnect();
    
    console.log('\n🎉 All collections copied successfully!');
    console.log('Your local database now has the complete Atlas dataset!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Copy failed:', error);
    process.exit(1);
  }
};

run();


