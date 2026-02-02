// LEGACY: One-off admin/ops script. Not used in active app flows.
// Run manually only if needed. See docs/ or backend/scripts/README.md.


/**
 * Script to verify if data is being saved in MongoDB
 * 
 * Usage: node backend/checkDataSaved.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

async function checkDataSaved() {
  try {
    console.log('🔍 Checking if data is saved in MongoDB...');
    console.log(`📊 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
    
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    };

    // Attempt connection
    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ Successfully connected to MongoDB!\n');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('📁 COLLECTIONS IN DATABASE:');
    console.log('='.repeat(60));
    
    let totalDocuments = 0;
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();
      totalDocuments += count;
      
      if (count > 0) {
        console.log(`\n✅ ${collectionName}: ${count} document(s)`);
        
        // Show sample data for key collections
        if (['users', 'students', 'teachers', 'admins', 'assignments', 'tickets', 'recitationreviews'].includes(collectionName.toLowerCase())) {
          const sample = await db.collection(collectionName).findOne({});
          if (sample) {
            console.log(`   Sample document:`);
            if (sample.email) console.log(`     - Email: ${sample.email}`);
            if (sample.fullName || sample.name) console.log(`     - Name: ${sample.fullName || sample.name}`);
            if (sample.role) console.log(`     - Role: ${sample.role}`);
            if (sample.status) console.log(`     - Status: ${sample.status}`);
            if (sample.createdAt) console.log(`     - Created: ${new Date(sample.createdAt).toLocaleString()}`);
            if (sample.updatedAt) console.log(`     - Updated: ${new Date(sample.updatedAt).toLocaleString()}`);
          }
        }
      } else {
        console.log(`\n⚠️  ${collectionName}: 0 documents (empty)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 TOTAL DOCUMENTS: ${totalDocuments}`);
    
    // Check specific collections
    console.log('\n\n🔍 DETAILED CHECK:');
    console.log('='.repeat(60));
    
    const userCount = await db.collection('users').countDocuments();
    const studentCount = await db.collection('students').countDocuments();
    const teacherCount = await db.collection('teachers').countDocuments();
    const adminCount = await db.collection('admins').countDocuments();
    const assignmentCount = await db.collection('assignments').countDocuments();
    const ticketCount = await db.collection('tickets').countDocuments();
    
    console.log(`\n👤 Users: ${userCount}`);
    console.log(`🎓 Students: ${studentCount}`);
    console.log(`🧑‍🏫 Teachers: ${teacherCount}`);
    console.log(`👔 Admins: ${adminCount}`);
    console.log(`📝 Assignments: ${assignmentCount}`);
    console.log(`🎫 Tickets: ${ticketCount}`);
    
    // Check if there are recent documents (created in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUsers = await db.collection('users').countDocuments({ createdAt: { $gte: oneDayAgo } });
    const recentStudents = await db.collection('students').countDocuments({ createdAt: { $gte: oneDayAgo } });
    const recentTeachers = await db.collection('teachers').countDocuments({ createdAt: { $gte: oneDayAgo } });
    
    console.log('\n📅 RECENT ACTIVITY (Last 24 hours):');
    console.log(`   Users created: ${recentUsers}`);
    console.log(`   Students created: ${recentStudents}`);
    console.log(`   Teachers created: ${recentTeachers}`);
    
    // Check connection state
    console.log('\n🔗 Connection State:', mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected');
    
    if (totalDocuments === 0) {
      console.log('\n⚠️  WARNING: No documents found in database!');
      console.log('   This could mean:');
      console.log('   1. Data is not being saved');
      console.log('   2. Database is empty (new deployment)');
      console.log('   3. Connection is pointing to wrong database');
    } else {
      console.log('\n✅ SUCCESS: Data is being saved in MongoDB!');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n❌ Error checking database:');
    console.error('   Message:', error.message);
    if (error.message.includes('authentication failed')) {
      console.error('\n⚠️  Authentication failed - check your MongoDB credentials');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Connection refused - check if MongoDB is running and MONGODB_URI is correct');
    } else if (error.message.includes('timeout')) {
      console.error('\n⚠️  Connection timeout - check network connectivity and MongoDB URI');
    }
    process.exit(1);
  }
}

checkDataSaved();

