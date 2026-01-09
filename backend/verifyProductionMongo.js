/**
 * Script to verify MongoDB connection in production
 * 
 * Usage: 
 *   MONGODB_URI=your-connection-string node backend/verifyProductionMongo.js
 *   Or set MONGODB_URI in environment and run: node backend/verifyProductionMongo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  'mongodb://localhost:27017/umar-academy-portal';

async function verifyProductionConnection() {
  try {
    console.log('🔍 Verifying MongoDB connection for production...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Connection URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);
    
    if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL: MONGODB_URI not set in production environment!');
      process.exit(1);
    }
    
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    };

    console.log('⏳ Attempting connection...');
    const startTime = Date.now();
    
    // Attempt connection
    await mongoose.connect(MONGODB_URI, options);
    const connectionTime = Date.now() - startTime;
    
    console.log(`✅ Successfully connected to MongoDB! (${connectionTime}ms)`);
    
    // Get connection info
    console.log('\n📊 Connection Information:');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port || 'N/A (Atlas)');
    console.log('   Database:', mongoose.connection.name);
    console.log('   Ready State:', mongoose.connection.readyState === 1 ? 'Connected (1)' : `Disconnected (${mongoose.connection.readyState})`);
    
    // Test ping
    try {
      const pingStart = Date.now();
      const pingResult = await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - pingStart;
      console.log(`   Ping Test: ✅ Success (${pingTime}ms)`, JSON.stringify(pingResult));
    } catch (pingError) {
      console.log('   Ping Test: ❌ Failed', pingError.message);
    }
    
    // Test a simple query
    const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));
    const assignmentCount = await Assignment.countDocuments();
    console.log(`\n📝 Assignments in database: ${assignmentCount}`);
    
    // Check students
    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
    const studentCount = await Student.countDocuments();
    console.log(`👥 Students in database: ${studentCount}`);
    
    // List collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections: ${collections.length}`);
    if (collections.length > 0) {
      const importantCollections = ['assignments', 'students', 'teachers', 'users', 'tickets'];
      importantCollections.forEach(colName => {
        const found = collections.find(c => c.name.toLowerCase() === colName.toLowerCase());
        if (found) {
          console.log(`   ✅ ${found.name}`);
        }
      });
    }
    
    // Test assignment query (like the API does)
    if (assignmentCount > 0) {
      const sampleAssignments = await Assignment.find({}).limit(3).lean();
      console.log(`\n📋 Sample assignments:`);
      sampleAssignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ID: ${assignment._id}, StudentID: ${assignment.studentId}, Status: ${assignment.status || 'N/A'}`);
      });
    }
    
    console.log('\n✅ MongoDB connection verification passed!');
    console.log('✅ Database is accessible and queries work correctly.');
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB connection verification failed!');
    console.error('\nError details:');
    console.error('   Message:', error.message);
    console.error('   Name:', error.name);
    console.error('   Code:', error.code);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Possible issues:');
      console.error('   1. MongoDB server is not running');
      console.error('   2. Connection string is incorrect');
      console.error('   3. Network/firewall blocking the connection');
      console.error('   4. MongoDB credentials are incorrect');
      console.error('   5. MongoDB Atlas IP whitelist may not include your IP');
      console.error('   6. MongoDB Atlas cluster may be paused');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('\n💡 Authentication failed:');
      console.error('   - Check your MongoDB username and password');
      console.error('   - Verify the database user has proper permissions');
    } else if (error.name === 'MongoNetworkError') {
      console.error('\n💡 Network error:');
      console.error('   - Check if MongoDB server is accessible');
      console.error('   - Verify the host and port are correct');
      console.error('   - Check firewall settings');
      console.error('   - For Atlas: Check Network Access settings');
    }
    
    console.error('\n📝 Current connection string (masked):');
    console.error(`   ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the verification
verifyProductionConnection();

